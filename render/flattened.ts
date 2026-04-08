import {
	AnalysisResult,
	CommonComponentDefinition,
	ExportRole,
	FlattenedVariant,
	NodeBounds,
	NormalizedNode
} from "../types";
import { escapeHtml, escapeTemplateString, formatHtml } from "../utils/string";
import { COMPONENT_BY_ID, COMPONENT_BY_ROLE } from "../constants";
import { cssDeclarations, pxToEm, scalePx, textTransformFromCase, toPercent } from "../utils/css";
import {
	collectText,
	findImageNodeId,
	findNodesByRole,
	findNormalizedNodeById,
	flattenTree,
	pickBestNode
} from "../analysis/index";

const PRODUCT_PLACEHOLDER_IMAGE = "https://placehold.co/600x400/EEE/31343C";

function hasInsertedComponent(root: NormalizedNode, componentId: string): boolean {
	return flattenTree(root).some(function (node) {
		return !node.ignored && node.componentOverride === componentId;
	});
}

function buildPriceRuntimeSetup(includeSummary: boolean): string {
	if (!includeSummary) return "";

	return `try {
	const subtotal_raw = usi_cookies.get("usi_subtotal");
	const subtotal_num = Number(subtotal_raw);
	const discount = (subtotal_num * 0.15).toFixed(2);
	const new_price = (subtotal_num - Number(discount)).toFixed(2);

	if (isNaN(subtotal_num) || isNaN(Number(discount)) || isNaN(Number(new_price))) {
		throw new Error("Invalid price values");
	}

	usi_js.product = { subtotal: subtotal_raw, discount: discount, new_price: new_price };
} catch (err) {
	usi_commons.report_error(err);
	usi_js.launch.enabled = false;
	usi_js.launch.suppress = true;
}

`;
}

function componentDefinitionForNode(node: NormalizedNode): CommonComponentDefinition | undefined {
	if (node.componentOverride && COMPONENT_BY_ID[node.componentOverride]) {
		return COMPONENT_BY_ID[node.componentOverride];
	}
	return COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || "other"];
}

function componentText(node: NormalizedNode, definition?: CommonComponentDefinition): string {
	const text = collectText(node) || node.text || node.name || "";
	if (text) return text;
	return definition && definition.render.fallbackText ? definition.render.fallbackText : "";
}

function renderExplicitComponentNode(node: NormalizedNode, hideVisibleText: boolean): string {
	const definition = componentDefinitionForNode(node);
	if (!definition) return "";

	const tag = definition.render.htmlTag;
	const className = definition.render.className;
	const text = componentText(node, definition);
	const kind = definition.render.kind;

	if (kind === "container") {
		return `<${tag} class="${className}"></${tag}>`;
	}

	if (kind === "input") {
		const placeholder = hideVisibleText ? "" : escapeHtml(text);

		return `
			<label class="${className}">
				<span class="usi_field_label usi_sr_only">${escapeHtml(node.name || definition.label)}</span>
				<input
					class="usi_field_input"
					type="${escapeHtml(definition.render.inputType || "text")}"
					placeholder="${placeholder}"
				/>
			</label>
		`.trim();
	}

	if (kind === "survey") {
		const children = node.children.filter(function (child) {
			return !child.ignored && child.visible;
		});
		const prompt = children[0] ? componentText(children[0]) : text;
		const options =
			(children.length > 1 ? children.slice(1) : [])
				.map(function (child) {
					return `
						<button class="usi_survey_option" type="button">
							${escapeHtml(componentText(child))}
						</button>
					`.trim();
				})
				.join("") ||
			`
				<button class="usi_survey_option" type="button">Option 1</button>
				<button class="usi_survey_option" type="button">Option 2</button>
			`
				.replace(/\s+/g, " ")
				.trim();

		return `
			<section class="${className}">
				<p class="usi_survey_prompt">${escapeHtml(prompt)}</p>
				<div class="usi_survey_options">${options}</div>
			</section>
		`.trim();
	}

	if (kind === "coupon") {
		const childrenText = node.children
			.map(function (child) {
				return componentText(child);
			})
			.filter(Boolean);

		const code = childrenText[0] || text || definition.render.fallbackText || "SAVE15";
		const label = childrenText[1] || definition.render.buttonText || "Copy Code";

		return `
			<section class="${className}">
				<div class="usi_coupon_code">${escapeHtml(code)}</div>
				<button class="usi_coupon_button" type="button">${escapeHtml(label)}</button>
			</section>
		`.trim();
	}

	if (kind === "optin") {
		return `
			<label class="${className}">
				<input class="usi_optin_input" type="checkbox" />
				<span class="usi_optin_label">${escapeHtml(text)}</span>
			</label>
		`.trim();
	}

	if (kind === "countdown") {
		return `<div class="${className}">${escapeHtml(text || "09:59")}</div>`;
	}

	if (kind === "progress") {
		return `
			<div class="${className}">
				<div class="usi_progress_fill"></div>
			</div>
		`.trim();
	}

	if (kind === "media") {
		if (tag === "hr") {
			return `<hr class="${className}" />`;
		}

		return `<div class="${className}" aria-hidden="true"></div>`;
	}

	if (kind === "button" || tag === "button") {
		return `
			<button class="${className}" type="button">
				${escapeHtml(text || definition.render.buttonText || definition.label)}
			</button>
		`.trim();
	}

	return `<${tag} class="${className}">${escapeHtml(text)}</${tag}>`;
}

function renderExtraRegionNodes(
	root: NormalizedNode,
	region: CommonComponentDefinition["render"]["region"],
	excludedIds: string[],
	hideVisibleText?: boolean
): string {
	const rendered: string[] = [];

	(function walk(node: NormalizedNode) {
		if (node.ignored || excludedIds.indexOf(node.id) !== -1) return;
		const definition = componentDefinitionForNode(node);
		if (definition && definition.id === "content_stack") return;
		const shouldRenderNode = !!definition && definition.render.region === region;

		if (shouldRenderNode) {
			rendered.push(renderExplicitComponentNode(node, hideVisibleText || false));
			return;
		}
		for (let index = 0; index < node.children.length; index += 1) {
			walk(node.children[index]);
		}
	})(root);

	return rendered.join("");
}

function combineBounds(nodes: Array<NormalizedNode | undefined>): NodeBounds | undefined {
	const filtered = nodes.filter(Boolean) as NormalizedNode[];
	if (!filtered.length) return undefined;
	let left = filtered[0].bounds.x;
	let top = filtered[0].bounds.y;
	let right = filtered[0].bounds.x + filtered[0].bounds.width;
	let bottom = filtered[0].bounds.y + filtered[0].bounds.height;
	for (let index = 1; index < filtered.length; index += 1) {
		left = Math.min(left, filtered[index].bounds.x);
		top = Math.min(top, filtered[index].bounds.y);
		right = Math.max(right, filtered[index].bounds.x + filtered[index].bounds.width);
		bottom = Math.max(bottom, filtered[index].bounds.y + filtered[index].bounds.height);
	}
	return { x: left, y: top, width: right - left, height: bottom - top };
}

function nodeContains(parent: NormalizedNode, child: NormalizedNode): boolean {
	for (let index = 0; index < parent.children.length; index += 1) {
		const current = parent.children[index];
		if (current === child) return true;
		if (nodeContains(current, child)) return true;
	}
	return false;
}

function topLevelNodes(nodes: NormalizedNode[], _root: NormalizedNode): NormalizedNode[] {
	return nodes.filter(function (node) {
		return !nodes.some(function (other) {
			return other !== node && nodeContains(other, node);
		});
	});
}

function flattenedTextDeclarations(
	node: NormalizedNode | undefined,
	frameScale: number,
	extra?: Record<string, string | number | undefined>
): string {
	if (!node) return "";
	return cssDeclarations(
		Object.assign(
			{
				color: node.style.color,
				opacity: node.style.opacity,
				"font-family": node.style.fontFamily
					? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif'
					: undefined,
				"font-style": node.style.fontStyle,
				"font-size": node.style.fontSize ? pxToEm(node.style.fontSize, 16, frameScale) : undefined,
				"font-weight": node.style.fontWeight,
				"line-height": node.style.lineHeight ? pxToEm(node.style.lineHeight, 16, frameScale) : undefined,
				"letter-spacing": node.style.letterSpacing
					? pxToEm(node.style.letterSpacing, 16, frameScale)
					: undefined,
				"text-align": node.style.textAlign,
				"text-transform": textTransformFromCase(node.style.textCase)
			},
			extra || {}
		)
	);
}

function flattenedBoxDeclarations(
	node: NormalizedNode | undefined,
	frameScale: number,
	extra?: Record<string, string | number | undefined>
): string {
	if (!node) return cssDeclarations(extra || {});
	return cssDeclarations(
		Object.assign(
			{
				"background-color": node.style.background,
				color: node.style.color,
				border: node.style.borderColor
					? String(node.style.borderWidth || 1) + "px solid " + node.style.borderColor
					: undefined,
				"border-radius": node.style.borderRadius != null ? String(node.style.borderRadius) + "px" : undefined,
				opacity: node.style.opacity,
				"font-family": node.style.fontFamily
					? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif'
					: undefined,
				"font-style": node.style.fontStyle,
				"font-size": node.style.fontSize ? pxToEm(node.style.fontSize, 16, frameScale) : undefined,
				"font-weight": node.style.fontWeight,
				"line-height": node.style.lineHeight ? pxToEm(node.style.lineHeight, 16, frameScale) : undefined,
				"letter-spacing": node.style.letterSpacing
					? pxToEm(node.style.letterSpacing, 16, frameScale)
					: undefined,
				"text-align": node.style.textAlign,
				"text-transform": textTransformFromCase(node.style.textCase)
			},
			extra || {}
		)
	);
}

function findDescendantRoleNode(root: NormalizedNode | undefined, role: ExportRole): NormalizedNode | undefined {
	if (!root) return undefined;
	return pickBestNode(findNodesByRole(root, role, 0.1));
}

function resolveSummaryTitle(summaryNode: NormalizedNode | undefined): string | undefined {
	if (!summaryNode) return undefined;
	for (let index = 0; index < summaryNode.children.length; index += 1) {
		const child = summaryNode.children[index];
		const text = String(child.text || collectText(child) || "").trim();
		if (!text) continue;
		if (!/(subtotal|discount|total|\$)/i.test(text)) return text;
	}
	const ownText = String(summaryNode.text || "").trim();
	if (ownText && !/(subtotal|discount|total|\$)/i.test(ownText)) return ownText;
	return undefined;
}

function buildSyntheticBounds(nodes: NormalizedNode[]): NodeBounds | undefined {
	if (!nodes.length) return undefined;
	const left = Math.min.apply(
		null,
		nodes.map(function (node) {
			return node.bounds.x;
		})
	);
	const top = Math.min.apply(
		null,
		nodes.map(function (node) {
			return node.bounds.y;
		})
	);
	const right = Math.max.apply(
		null,
		nodes.map(function (node) {
			return node.bounds.x + node.bounds.width;
		})
	);
	const bottom = Math.max.apply(
		null,
		nodes.map(function (node) {
			return node.bounds.y + node.bounds.height;
		})
	);
	return { x: left, y: top, width: right - left, height: bottom - top };
}

function formatFlattenedHtml(html: string): string {
	if (!html) return "";
	return formatHtml(html)
		.split("\n")
		.map(function (line) {
			return line ? "\t" + line : line;
		})
		.join("\n");
}

export function renderFlattenedHtml(
	root: NormalizedNode,
	analysis: AnalysisResult,
	imageFileName: string,
	hideVisibleText: boolean
): FlattenedVariant {
	const frameScale = 1;
	const scaledRootWidth = scalePx(root.bounds.width, frameScale) || root.bounds.width;
	const scaledRootHeight = scalePx(root.bounds.height, frameScale) || root.bounds.height;
	const headlineNode = findNormalizedNodeById(root, analysis.headlineNodeId);
	const subtextNode = findNormalizedNodeById(root, analysis.subtextNodeId);
	const eyebrowNode = findNormalizedNodeById(root, analysis.eyebrowNodeId);
	const ctaNode = findNormalizedNodeById(root, analysis.primaryCtaNodeId);
	const productContainerNode = findNormalizedNodeById(root, analysis.productContainerNodeId);
	const productCardNodes = analysis.productCardNodeIds
		.map(function (id) {
			return findNormalizedNodeById(root, id);
		})
		.filter(Boolean) as NormalizedNode[];
	const summaryNode = findNormalizedNodeById(root, analysis.summaryNodeId);
	const closeCandidates = findNodesByRole(root, "close-button", 0.35);
	const closeNode = closeCandidates.slice().sort(function (a, b) {
		if (Math.abs(a.bounds.x - b.bounds.x) > 2) return b.bounds.x - a.bounds.x;
		if (Math.abs(a.bounds.y - b.bounds.y) > 2) return a.bounds.y - b.bounds.y;
		return a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height;
	})[0];
	const closeVisualNode = closeNode
		? flattenTree(closeNode)
				.filter(function (node) {
					return !!collectText(node).trim() || node.type === "VECTOR" || node.type === "ELLIPSE";
				})
				.sort(function (a, b) {
					if (Math.abs(a.bounds.x - b.bounds.x) > 2) return b.bounds.x - a.bounds.x;
					if (Math.abs(a.bounds.y - b.bounds.y) > 2) return a.bounds.y - b.bounds.y;
					return a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height;
				})[0] || closeNode
		: undefined;
	const firstProductCard = productCardNodes[0];
	const productImageNode =
		findDescendantRoleNode(firstProductCard, "image") || findDescendantRoleNode(firstProductCard, "product-image");
	const productTitleNode = findDescendantRoleNode(firstProductCard, "product-title");
	const productPriceNode = findDescendantRoleNode(firstProductCard, "product-price");
	const productButtonNode =
		findDescendantRoleNode(firstProductCard, "product-cta") || findDescendantRoleNode(firstProductCard, "cta");
	const summarySubtotalNode = findDescendantRoleNode(summaryNode, "summary-subtotal");
	const summaryDiscountNode = findDescendantRoleNode(summaryNode, "summary-discount");
	const summaryTotalNode = findDescendantRoleNode(summaryNode, "summary-total");
	const productBounds = productContainerNode ? productContainerNode.bounds : buildSyntheticBounds(productCardNodes);
	const mainBounds = combineBounds([eyebrowNode, headlineNode, subtextNode, ctaNode]);
	const headlineText = analysis.schema.headline || (headlineNode ? collectText(headlineNode) : "");
	const eyebrowText = (() => {
		const value = analysis.schema.eyebrow || (eyebrowNode ? collectText(eyebrowNode) : "");
		if (!value) return "";
		if (/\$|subtotal|discount|total/i.test(value)) return "";
		return value;
	})();
	const subtextText = analysis.schema.subtext || (subtextNode ? collectText(subtextNode) : "");
	const ctaLabel =
		analysis.schema.primaryCta && analysis.schema.primaryCta.label
			? analysis.schema.primaryCta.label
			: ctaNode
				? collectText(ctaNode)
				: "Redeem Now";
	const showEyebrowInVariant = hideVisibleText ? false : !!eyebrowText;
	const showHeadlineInVariant = hideVisibleText ? false : !!headlineText;
	const showSubtextInVariant = hideVisibleText ? false : !!subtextText;
	const eyebrowClass = showEyebrowInVariant ? "usi_eyebrow" : "usi_eyebrow usi_sr_only";
	const headlineClass = showHeadlineInVariant ? "usi_headline" : "usi_headline usi_sr_only";
	const subtextClass = showSubtextInVariant ? "usi_subtext" : "usi_subtext usi_sr_only";
	const showCtaInVariant = !!(ctaNode || analysis.schema.primaryCta);
	const ctaInnerHtml = showCtaInVariant ? escapeHtml(ctaLabel) : "";
	const summaryTitle = resolveSummaryTitle(summaryNode);
	const hasProducts = !!analysis.schema.products.length && !!productCardNodes.length && !!productBounds;
	const hasSummary = !!analysis.schema.summary && !!summaryNode;
	const hasEmailInput = hasInsertedComponent(root, "email_input");
	const hasPhoneInput = hasInsertedComponent(root, "phone_input");
	const hasSurvey = hasInsertedComponent(root, "survey_block");
	const hasCoupon = hasInsertedComponent(root, "copy_coupon");
	const hasOptin = hasInsertedComponent(root, "optin_component");
	const hasCountdown = hasInsertedComponent(root, "countdown_timer");
	const hasProgress = hasInsertedComponent(root, "progress_bar");
	const hasMediaPanel = hasInsertedComponent(root, "media_panel");
	const hasSecondaryCta = hasInsertedComponent(root, "no_thanks_button");
	const hasDisclaimer = hasInsertedComponent(root, "disclaimer_text");
	const productGap =
		productCardNodes.length > 1 && productBounds
			? productCardNodes.slice(1).reduce(function (sum, card, index) {
					const previous = productCardNodes[index];
					return sum + Math.max(0, card.bounds.x - (previous.bounds.x + previous.bounds.width));
				}, 0) /
				(productCardNodes.length - 1)
			: 0;
	const gridColumns = Math.max(1, Math.min(productCardNodes.length || analysis.schema.products.length || 1, 3));
	const previewProductHtml = analysis.schema.products.length
		? analysis.schema.products
				.map(function (product, index) {
					const fallbackTitle = escapeHtml(product.title || "Product Name");
					const fallbackSubtitle = escapeHtml(product.subtitle || "");
					const fallbackPrice = escapeHtml(product.price || "$XX.XX");
					const fallbackButton = escapeHtml(product.cta || "View item");

					return `
						<article class="usi_product_card usi_product usi_product${index + 1}">
							<div class="usi_product_image">
								<img src="${PRODUCT_PLACEHOLDER_IMAGE}" alt="${fallbackTitle}" />
							</div>
							<div class="usi_product_body">
								<h3 class="usi_product_title">${fallbackTitle}</h3>
								${fallbackSubtitle ? `<p class="usi_product_subtitle">${fallbackSubtitle}</p>` : ""}
								<p class="usi_product_price">${fallbackPrice}</p>
								<button class="usi_product_cta" type="button">${fallbackButton}</button>
							</div>
						</article>
					`.trim();
				})
				.join("")
		: "";

	const runtimeProductHtml = analysis.schema.products.length
		? analysis.schema.products
				.map(function (product, index) {
					const fallbackTitle = escapeHtml(product.title || "Product Name");
					const fallbackSubtitle = escapeHtml(product.subtitle || "");
					const fallbackPrice = escapeHtml(product.price || "$XX.XX");
					const fallbackButton = escapeHtml(product.cta || "View item");
					const fallbackTitleForRuntime = fallbackTitle.replace(/'/g, "&#39;");

					return `
						<article class="usi_product_card usi_product usi_product${index + 1}">
							<div class="usi_product_image">
								<img
									src="\${usi_cookies.get('usi_prod_image_${index + 1}') || '${PRODUCT_PLACEHOLDER_IMAGE}'}"
									alt="\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitleForRuntime}')}"
								/>
							</div>
							<div class="usi_product_body">
								<h3 class="usi_product_title">\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitleForRuntime}')}</h3>
								${fallbackSubtitle ? `<p class="usi_product_subtitle">${fallbackSubtitle}</p>` : ""}
								<p class="usi_product_price">${fallbackPrice}</p>
								<button class="usi_product_cta" type="button">${fallbackButton}</button>
							</div>
						</article>
					`.trim();
				})
				.join("")
		: "";

	const previewSummaryHtml = hasSummary
		? `
				<section class="usi_summary" aria-label="Cart summary">
					${summaryTitle ? `<h2 class="usi_summary_title">${escapeHtml(summaryTitle)}</h2>` : ""}
					<div class="usi_summary_row usi_price">
						<span class="usi_label">Subtotal:</span>
						<strong class="usi_value">$XX.XX</strong>
					</div>
					<div class="usi_summary_row usi_discount">
						<span class="usi_label">Discount:</span>
						<strong class="usi_value">- $XX.XX</strong>
					</div>
					<div class="usi_summary_row usi_new_price">
						<span class="usi_label">Total:</span>
						<strong class="usi_value">$XX.XX</strong>
					</div>
				</section>
			`.trim()
		: "";

	const runtimeSummaryHtml = hasSummary
		? `
				<section class="usi_summary" aria-label="Cart summary">
					${summaryTitle ? `<h2 class="usi_summary_title">${escapeHtml(summaryTitle)}</h2>` : ""}
					<div class="usi_summary_row usi_price">
						<span class="usi_label">Subtotal:</span>
						<strong class="usi_value">$\${usi_js.product.subtotal}</strong>
					</div>
					<div class="usi_summary_row usi_discount">
						<span class="usi_label">Discount:</span>
						<strong class="usi_value">- $\${usi_js.product.discount}</strong>
					</div>
					<div class="usi_summary_row usi_new_price">
						<span class="usi_label">Total:</span>
						<strong class="usi_value">$\${usi_js.product.new_price}</strong>
					</div>
				</section>
			`.trim()
		: "";

	const flattenedExcludedIds = [
		analysis.eyebrowNodeId,
		analysis.headlineNodeId,
		analysis.subtextNodeId,
		analysis.primaryCtaNodeId,
		analysis.summaryNodeId
	]
		.concat(analysis.productCardNodeIds)
		.filter(Boolean) as string[];

	const flattenedExtraMainHtml = renderExtraRegionNodes(root, "main", flattenedExcludedIds, hideVisibleText);
	const flattenedExtraAsideHtml = renderExtraRegionNodes(root, "aside", flattenedExcludedIds, hideVisibleText);
	const flattenedExtraUtilityHtml = renderExtraRegionNodes(root, "utility", flattenedExcludedIds, hideVisibleText);

	// Explicitly render missing components to ensure they appear in flattened HTML
	const progressBarNodes = findNodesByRole(root, "progress", 0.35);
	const countdownNodes = findNodesByRole(root, "countdown", 0.35);
	const surveyNodes = topLevelNodes(findNodesByRole(root, "survey", 0.35), root);
	const emailInputNodes = findNodesByRole(root, "email-input", 0.35);
	const phoneInputNodes = findNodesByRole(root, "phone-input", 0.35);
	const copyCouponNodes = topLevelNodes(findNodesByRole(root, "copy-coupon", 0.35), root);
	const noThanksNodes = findNodesByRole(root, "secondary-cta", 0.35);
	const optinNodes = topLevelNodes(findNodesByRole(root, "optin", 0.35), root);
	const mediaPanelNodes = findNodesByRole(root, "image", 0.35);
	const disclaimerNodes = findNodesByRole(root, "disclaimer", 0.35);
	const dividerNodes = findNodesByRole(root, "divider", 0.35);
	const productSubtitleNodes = (function () {
		const subtitles: NormalizedNode[] = [];
		productCardNodes.forEach(function (card) {
			const subtitle = findDescendantRoleNode(card, "product-subtitle");
			if (subtitle) subtitles.push(subtitle);
		});
		return subtitles;
	})();

	const allExtraComponentNodes = [
		...progressBarNodes,
		...countdownNodes,
		...surveyNodes,
		...emailInputNodes,
		...phoneInputNodes,
		...copyCouponNodes,
		...optinNodes,
		...noThanksNodes,
		...mediaPanelNodes,
		...disclaimerNodes,
		...dividerNodes,
		...productSubtitleNodes
	];

	const extraComponentsHtml = allExtraComponentNodes
		.map((node) => renderExplicitComponentNode(node, hideVisibleText))
		.join("");

	// Generate positioning CSS for extra components
	const extraComponentsCss = allExtraComponentNodes
		.map(function (node) {
			const definition = componentDefinitionForNode(node);
			if (!definition) return "";

			const className = definition.render.className;

			return `
.${className} {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	${flattenedBoxDeclarations(node, frameScale)}
}
`;
		})
		.join("");

	const previewContentHtml = `
		${closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : ""}
		<section class="usi_main">
			${eyebrowText ? `<p class="${eyebrowClass}">${escapeHtml(eyebrowText)}</p>` : ""}
			${headlineText ? `<h1 class="${headlineClass}">${escapeHtml(headlineText)}</h1>` : ""}
			${subtextText ? `<p class="${subtextClass}">${escapeHtml(subtextText)}</p>` : ""}
			${
			showCtaInVariant
				? `<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="${escapeHtml(ctaLabel)}">${ctaInnerHtml}</button>`
				: ""
		}
			${flattenedExtraMainHtml}
			${flattenedExtraUtilityHtml}
			${extraComponentsHtml}
		</section>
		${
		hasProducts || flattenedExtraAsideHtml
			? `
						<section class="usi_aside">
							${hasProducts ? `<section class="usi_products usi_products_grid">${previewProductHtml}</section>` : ""}
							${flattenedExtraAsideHtml}
						</section>
					`.trim()
			: ""
	}
		${previewSummaryHtml}
	`.trim();

	const runtimeContentHtml = `
		${closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : ""}
		<section class="usi_main">
			${eyebrowText ? `<p class="${eyebrowClass}">${escapeHtml(eyebrowText)}</p>` : ""}
			${headlineText ? `<h1 class="${headlineClass}">${escapeHtml(headlineText)}</h1>` : ""}
			${subtextText ? `<p class="${subtextClass}">${escapeHtml(subtextText)}</p>` : ""}
			${
			showCtaInVariant
				? `<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="${escapeHtml(ctaLabel)}">${ctaInnerHtml}</button>`
				: ""
		}
			${flattenedExtraMainHtml}
			${flattenedExtraUtilityHtml}
			${extraComponentsHtml}
		</section>
		${
		hasProducts || flattenedExtraAsideHtml
			? `
						<section class="usi_aside">
							${hasProducts ? `<section class="usi_products usi_products_grid">${runtimeProductHtml}</section>` : ""}
							${flattenedExtraAsideHtml}
						</section>
					`.trim()
			: ""
	}
		${runtimeSummaryHtml}
	`.trim();

	//const formattedPreviewContentHtml = previewContentHtml;
	const formattedRuntimeContentHtml = runtimeContentHtml;
	const html = `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Preview</title>
		<style>
		.usi_display {left:50%;margin-left:-320px;top:0px;width:640px;height:636px;}.usi_display * {padding:0 0 0 0;margin:0 0 0 0;color:#000000;font-weight:normal;font-size:12pt;text-decoration:none;line-height:12pt;box-shadow: none;border: none; outline: none;text-align: left;font-family: Helvetica, Arial, sans-serif;float:none;} .usi_quickide_css {display:none;visibility:hidden;}#usi_close { position:absolute;left:85%;top:0px;width:15%;height:15%;z-index:2000000300;cursor:pointer;border:none;background:none;margin:0;padding:0; } 
button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus { background:none;border:none;cursor:pointer; } #usi_content { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000200; } #usi_background { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000100; } #usi_page { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000150; } .usi_sr_only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
		</style>
		<link
			rel="stylesheet"
			href="css/${hideVisibleText ? "flattened_text_baked.css" : "flattened_live_text.css"}"
		/>
	</head>
	<body>
		<div id="usi_container">
			<div
				id="usi_display"
				role="alertdialog"
				aria-label="${escapeHtml(headlineText || "Preview")}"
				aria-modal="true"
				class="usi_display usi_show_css usi_shadow"
				style="width:${scaledRootWidth}px;height:${scaledRootHeight}px;"
			>
				<div id="usi_content">${previewContentHtml}</div>
				<div id="usi_background">
					<img
						src="${escapeHtml(imageFileName)}"
						aria-hidden="true"
						alt="${escapeHtml(headlineText || "Preview")}"
						id="usi_background_img"
						style="width:100%;height:100%;"
					/>
				</div>
			</div>
		</div>
	</body>
</html>
`.trim();

	const productCardCss = productCardNodes
		.map(function (card, index) {
			const imageNode = findNormalizedNodeById(card, findImageNodeId(card));
			const imageRule = imageNode
				? `
.usi_product${index + 1} .usi_product_image {
	width: 100%;
	height: ${toPercent(imageNode.bounds.height, card.bounds.height)};
	margin-left: 0;
	margin-top: ${toPercent(imageNode.bounds.y - card.bounds.y, card.bounds.height)};
}
`
				: "";

			return `
.usi_product${index + 1} {
	width: 100%;
	max-width: 100%;
	min-width: 0;
}
${imageRule}
`;
		})
		.join("");

	const componentCss = [
		hasEmailInput || hasPhoneInput
			? `
.usi_field {
	position: absolute;
	left: ${emailInputNodes[0] || phoneInputNodes[0] ? toPercent((emailInputNodes[0] || phoneInputNodes[0]).bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${emailInputNodes[0] || phoneInputNodes[0] ? toPercent((emailInputNodes[0] || phoneInputNodes[0]).bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${emailInputNodes[0] || phoneInputNodes[0] ? toPercent((emailInputNodes[0] || phoneInputNodes[0]).bounds.width, root.bounds.width) : "100%"};
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	${emailInputNodes[0] || phoneInputNodes[0] ? flattenedBoxDeclarations(emailInputNodes[0] || phoneInputNodes[0], frameScale) : ""}
}

.usi_field_input {
	width: 100%;
	padding: 0.875em 1em;
	border: 1px solid #d0d0d0;
	background: #fff;
	color: #111;
	${emailInputNodes[0] || phoneInputNodes[0] ? (function() {
		const inputNode = emailInputNodes[0] || phoneInputNodes[0];
		return inputNode.style.borderRadius != null ? "border-radius: " + String(inputNode.style.borderRadius) + "px;" : "";
	})() : ""}
}
`
			: "",
		hasSurvey
			? `
.usi_survey {
	position: absolute;
	left: ${surveyNodes[0] ? toPercent(surveyNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${surveyNodes[0] ? toPercent(surveyNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${surveyNodes[0] ? toPercent(surveyNodes[0].bounds.width, root.bounds.width) : "100%"};
	display: flex;
	flex-direction: column;
	gap: 0.75em;
	${surveyNodes[0] ? flattenedBoxDeclarations(surveyNodes[0], frameScale) : ""}
}

.usi_survey_options {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
}

.usi_survey_option {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
}
`
			: "",
		hasCoupon
			? `
.usi_coupon {
	position: absolute;
	left: ${copyCouponNodes[0] ? toPercent(copyCouponNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${copyCouponNodes[0] ? toPercent(copyCouponNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${copyCouponNodes[0] ? toPercent(copyCouponNodes[0].bounds.width, root.bounds.width) : "100%"};
	display: flex;
	flex-wrap: wrap;
	gap: 0.75em;
	align-items: center;
	${copyCouponNodes[0] ? flattenedBoxDeclarations(copyCouponNodes[0], frameScale) : ""}
}

.usi_coupon_code {
	padding: 0.75em 1em;
	border: 1px solid #222;
	background: #fff;
	font-weight: 700;
}

.usi_coupon_button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${
		copyCouponNodes[0] && copyCouponNodes[0].children[1]
			? flattenedBoxDeclarations(copyCouponNodes[0].children[1], frameScale, {
					display: "inline-flex",
					"align-items": "center",
					"justify-content": "center"
				})
			: ""
	}
}
`
			: "",
		hasOptin
			? `
.usi_optin {
	position: absolute;
	left: ${optinNodes[0] ? toPercent(optinNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${optinNodes[0] ? toPercent(optinNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${optinNodes[0] ? toPercent(optinNodes[0].bounds.width, root.bounds.width) : "100%"};
	display: flex;
	gap: 0.625em;
	align-items: center;
	${optinNodes[0] ? flattenedBoxDeclarations(optinNodes[0], frameScale) : ""}
}

.usi_optin_input {
	appearance: none;
	-webkit-appearance: none;
	width: 1.125em;
	height: 1.125em;
	border: 1px solid currentColor;
	background: #fff;
	flex: 0 0 auto;
}

.usi_optin_label {
	display: inline-block;
}
`
			: "",
		hasCountdown
			? `
.usi_countdown {
	position: absolute;
	left: ${countdownNodes[0] ? toPercent(countdownNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${countdownNodes[0] ? toPercent(countdownNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${countdownNodes[0] ? toPercent(countdownNodes[0].bounds.width, root.bounds.width) : "auto"};
	display: inline-flex;
	padding: 0.625em 0.875em;
	${countdownNodes[0] ? flattenedBoxDeclarations(countdownNodes[0], frameScale) : "background: #1f1f1f; color: #fff;"}
	font-weight: 700;
}
`
			: "",
		hasProgress
			? `
.usi_progress {
	position: absolute;
	left: ${progressBarNodes[0] ? toPercent(progressBarNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${progressBarNodes[0] ? toPercent(progressBarNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${progressBarNodes[0] ? toPercent(progressBarNodes[0].bounds.width, root.bounds.width) : "100%"};
	height: 0.75em;
	${progressBarNodes[0] ? flattenedBoxDeclarations(progressBarNodes[0], frameScale) : "background: #ddd;"}
	border-radius: 999px;
	overflow: hidden;
}

.usi_progress_fill {
	width: 55%;
	height: 100%;
	background: #222;
}
`
			: "",
		hasMediaPanel
			? `
.usi_media_panel {
	position: absolute;
	left: ${mediaPanelNodes[0] ? toPercent(mediaPanelNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${mediaPanelNodes[0] ? toPercent(mediaPanelNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${mediaPanelNodes[0] ? toPercent(mediaPanelNodes[0].bounds.width, root.bounds.width) : "100%"};
	height: ${mediaPanelNodes[0] ? toPercent(mediaPanelNodes[0].bounds.height, root.bounds.height) : "8em"};
	${mediaPanelNodes[0] ? flattenedBoxDeclarations(mediaPanelNodes[0], frameScale) : "background: #d9d9d9;"}
}
`
			: "",
		hasSecondaryCta
			? `
.usi_secondary_cta {
	position: absolute;
	left: ${noThanksNodes[0] ? toPercent(noThanksNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${noThanksNodes[0] ? toPercent(noThanksNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${noThanksNodes[0] ? toPercent(noThanksNodes[0].bounds.width, root.bounds.width) : "auto"};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${noThanksNodes[0] ? flattenedBoxDeclarations(noThanksNodes[0], frameScale) : ""}
}
`
			: "",
		hasDisclaimer
			? `
.usi_disclaimer {
	position: absolute;
	left: ${disclaimerNodes[0] ? toPercent(disclaimerNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${disclaimerNodes[0] ? toPercent(disclaimerNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${disclaimerNodes[0] ? toPercent(disclaimerNodes[0].bounds.width, root.bounds.width) : "auto"};
	margin: 0;
	font-size: 0.875em;
	line-height: 1.4;
	${disclaimerNodes[0] ? flattenedTextDeclarations(disclaimerNodes[0], frameScale) : "color: #666;"}
}
`
			: "",
		dividerNodes.length > 0
			? `
.usi_divider {
	position: absolute;
	left: ${dividerNodes[0] ? toPercent(dividerNodes[0].bounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${dividerNodes[0] ? toPercent(dividerNodes[0].bounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${dividerNodes[0] ? toPercent(dividerNodes[0].bounds.width, root.bounds.width) : "100%"};
	margin: 0;
	${dividerNodes[0] ? flattenedBoxDeclarations(dividerNodes[0], frameScale) : "border: 1px solid #ddd;"}
}
`
			: ""
	].join("");

	const textRegionCss = [
		headlineText && headlineNode && mainBounds
			? `
.usi_headline {
	position: absolute;
	left: ${toPercent(headlineNode.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${toPercent(headlineNode.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${toPercent(headlineNode.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(headlineNode, frameScale, { "white-space": "pre-wrap" })}
}
`
			: "",
		eyebrowText && eyebrowNode && mainBounds
			? `
.usi_eyebrow {
	position: absolute;
	left: ${toPercent(eyebrowNode.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${toPercent(eyebrowNode.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${toPercent(eyebrowNode.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(eyebrowNode, frameScale, { "white-space": "pre-wrap" })}
}
`
			: "",
		subtextText && subtextNode && mainBounds
			? `
.usi_subtext {
	position: absolute;
	left: ${toPercent(subtextNode.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${toPercent(subtextNode.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${toPercent(subtextNode.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(subtextNode, frameScale, { "white-space": "pre-wrap" })}
}
`
			: ""
	].join("");

	const css = `
.usi_display * {
	font-size: 1em;
	line-height: 1.2;
	box-sizing: border-box;
	color: inherit;
	font-family: inherit;
}

#usi_display {
	position: relative;
	display: block;
	left: 50%;
	margin-left: -${String(scaledRootWidth / 2)}px;
	top: 0px;
	width: ${scaledRootWidth}px;
	height: ${scaledRootHeight}px;
	font-size: 16px;
	color: #000;
	font-family: inherit;
	${root.layout && root.layout.padding ? "padding: " + root.layout.padding.top + "px " + root.layout.padding.right + "px " + root.layout.padding.bottom + "px " + root.layout.padding.left + "px;" : ""}
	${root.style.borderRadius != null ? "border-radius: " + String(root.style.borderRadius) + "px;" : ""}
}

#usi_close {
	position: absolute;
	left: ${closeVisualNode ? toPercent(closeVisualNode.bounds.x - root.bounds.x, root.bounds.width) : "95%"};
	top: ${closeVisualNode ? toPercent(closeVisualNode.bounds.y - root.bounds.y, root.bounds.height) : "2%"};
	width: ${closeVisualNode ? toPercent(closeVisualNode.bounds.width, root.bounds.width) : "3%"};
	height: ${closeVisualNode ? toPercent(closeVisualNode.bounds.height, root.bounds.height) : "3%"};
	z-index: 2000000300;
	cursor: pointer;
	padding: 0;
	margin: 0;
	display: block;
	overflow: hidden;
	text-indent: -9999px;
	${flattenedBoxDeclarations(closeVisualNode || closeNode, frameScale, { background: "none", border: "none" }) || "background:none;border:none;"}
}

#usi_close::before {
	content: "×";
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	text-indent: 0;
	${
		flattenedTextDeclarations(closeVisualNode || closeNode, frameScale, {
			background: "transparent",
			border: "none",
			"text-align": "center",
			"line-height": "1"
		}) || "background:transparent;border:none;text-align:center;line-height:1;"
	}
}

button#usi_close,
button#usi_close:hover,
button#usi_close:active,
button#usi_close:focus {
	cursor: pointer;
}

.usi_main {
	position: absolute;
	left: ${hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.x - root.bounds.x, root.bounds.width) : "0%") : "0%"};
	top: ${hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.y - root.bounds.y, root.bounds.height) : "0%") : "0%"};
	width: ${hasProducts || hasSummary ? (mainBounds ? toPercent(mainBounds.width, root.bounds.width) : "100%") : "100%"};
	height: ${!hasProducts && !hasSummary ? "100%" : mainBounds ? toPercent(mainBounds.height, root.bounds.height) : "100%"};
}

${textRegionCss}
${
	hasProducts
		? `
.usi_products {
	position: absolute;
	left: ${productBounds ? toPercent(productBounds.x - root.bounds.x, root.bounds.width) : "0%"};
	top: ${productBounds ? toPercent(productBounds.y - root.bounds.y, root.bounds.height) : "0%"};
	width: ${productBounds ? toPercent(productBounds.width, root.bounds.width) : "100%"};
	min-height: ${productBounds ? toPercent(productBounds.height, root.bounds.height) : "0%"};
	display: grid;
	grid-template-columns: repeat(${productBounds && productBounds.width < productBounds.height * 0.9 ? 1 : gridColumns}, minmax(0, 1fr));
	gap: ${productBounds && productGap ? toPercent(productGap, productBounds.width) : "2%"};
	align-items: start;
}

.usi_product {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 0.75em;
	padding: 0.9em;
	min-width: 0;
	${
		flattenedBoxDeclarations(firstProductCard, frameScale, {
			width: "100%",
			"max-width": "100%",
			"min-width": "0"
		}) || "width: 100%; max-width: 100%;"
	}
}

.usi_product_image {
	position: relative;
	display: block;
	width: 100%;
	overflow: hidden;
	${flattenedBoxDeclarations(productImageNode, frameScale, { width: "100%" }) || "width: 100%;"}
}

.usi_product_image img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.usi_product_body {
	display: flex;
	flex-direction: column;
	gap: 0.35em;
	min-width: 0;
}

.usi_product_subtitle {
	margin: 0;
	font-size: 0.9em;
	${productSubtitleNodes[0] ? flattenedTextDeclarations(productSubtitleNodes[0], frameScale) : "color: #666;"}
}

.usi_product_title {
	margin: 0;
	white-space: pre-wrap;
	${
		flattenedTextDeclarations(productTitleNode, frameScale, {
			"white-space": "pre-wrap",
			"background-color": "transparent",
			border: "none"
		}) || "font-weight: 700;"
	}
}

.usi_product_price {
	margin: 0;
	${flattenedTextDeclarations(productPriceNode, frameScale) || ""}
}

.usi_product_cta {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	${
		flattenedBoxDeclarations(productButtonNode, frameScale, {
			display: "inline-flex",
			"align-items": "center",
			"justify-content": "center",
			color: "#ffffff"
		}) || "border: 1px solid currentColor; background: transparent; color:#ffffff;"
	}
}

${productCardCss}
`
		: ""
}
${
	hasSummary
		? `
.usi_summary {
	position: absolute;
	left: ${summaryNode ? toPercent(summaryNode.bounds.x - root.bounds.x, root.bounds.width) : "12%"};
	top: ${summaryNode ? toPercent(summaryNode.bounds.y - root.bounds.y, root.bounds.height) : "59%"};
	width: ${summaryNode ? toPercent(summaryNode.bounds.width, root.bounds.width) : "76%"};
	padding: 1em;
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	${flattenedBoxDeclarations(summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_summary_title {
	margin: 0 0 0.5em;
	white-space: pre-wrap;
	${
		flattenedTextDeclarations(summaryNode, frameScale, {
			"font-size": "1em",
			"font-weight": 700,
			"white-space": "pre-wrap"
		}) || "font-weight: 700; font-size: 1em;"
	}
}

.usi_summary_row {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 1em;
	align-items: start;
	font-size: 1em;
}

.usi_price {
	${flattenedTextDeclarations(summarySubtotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_discount {
	${flattenedTextDeclarations(summaryDiscountNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_new_price {
	${flattenedTextDeclarations(summaryTotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_label,
.usi_value {
	font-size: 1em;
}

.usi_new_price .usi_value,
.usi_discount .usi_value,
.usi_new_price strong,
.usi_discount strong {
	font-weight: 700;
}
`
		: ""
}
${componentCss}
${extraComponentsCss}
.usi_submitbutton {
	position: absolute;
	left: ${ctaNode ? toPercent(ctaNode.bounds.x - root.bounds.x, root.bounds.width) : "12%"};
	top: ${ctaNode ? toPercent(ctaNode.bounds.y - root.bounds.y, root.bounds.height) : "77%"};
	width: ${ctaNode ? toPercent(ctaNode.bounds.width, root.bounds.width) : "76%"};
	min-height: ${ctaNode ? toPercent(ctaNode.bounds.height, root.bounds.height) : "15.5%"};
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	${flattenedBoxDeclarations(ctaNode, frameScale, {
		display: "flex",
		"align-items": "center",
		"justify-content": "center",
		"background-color": ctaNode && ctaNode.style.background ? ctaNode.style.background : "#1f1f1f",
		color: ctaNode && ctaNode.style.color ? ctaNode.style.color : "#ffffff",
		"text-align": ctaNode && ctaNode.style.textAlign ? ctaNode.style.textAlign : "center"
	})}
}
`.trim();

	const js = `${buildPriceRuntimeSetup(hasSummary)}usi_js.click_cta = () => {
	try {
		usi_js.deep_link();
	} catch (err) {
		usi_commons.report_error(err);
	}
};

usi_js.display_vars.p1_html = \`
${escapeTemplateString(formatFlattenedHtml(formattedRuntimeContentHtml))}
\`;
`;
	return {
		html: html,
		css: css,
		imageFileName: imageFileName,
		js: js,
		contentHtml: previewContentHtml,
		runtimeContentHtml: runtimeContentHtml
	};
}

export function buildUsiJsFile(
	pages: Array<{ key: string; variant: FlattenedVariant; analysis: AnalysisResult }>
): string {
	const needsPriceRuntime = pages.some(function (page) {
		return !!page.analysis.schema.summary;
	});

	const assignments = pages
		.map(function (page) {
			return `usi_js.display_vars.${page.key}_html = \`
${escapeTemplateString(formatFlattenedHtml(page.variant.runtimeContentHtml || page.variant.contentHtml))}
\`;
`;
		})
		.join("\n");

	return `${buildPriceRuntimeSetup(needsPriceRuntime)}usi_js.click_cta = () => {
	try {
		usi_js.deep_link();
	} catch (err) {
		usi_commons.report_error(err);
	}
};

${assignments}`;
}
