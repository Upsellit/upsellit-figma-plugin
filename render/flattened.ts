import {
	AnalysisResult,
	CommonComponentDefinition,
	ExportRole,
	FlattenedVariant,
	NodeBounds,
	NormalizedNode,
	ComponentRenderer
} from "../types";
import { escapeHtml, escapeTemplateString, formatHtml } from "../utils/string";
import { COMPONENT_BY_ID, COMPONENT_BY_ROLE } from "../constants";
import { cssDeclarations, pxToEm, scalePx, textTransformFromCase, toPercent } from "../utils/css";
import { GOOGLE_FONT_FAMILIES } from "./google-fonts-cache";
import {
	collectText,
	findImageNodeId,
	findNodesByRole,
	findNormalizedNodeById,
	flattenTree,
	pickBestNode
} from "../utils/tree";

const PRODUCT_PLACEHOLDER_IMAGE = "https://placehold.co/600x400/EEE/31343C";
const INCLUDE_DEBUG_NODE_CLASSES = false;
type RecursiveRenderContext = {
	root: NormalizedNode;
	frameScale: number;
	hideVisibleText: boolean;
	excludedIds: Set<string>;
	deliverablesPath?: string;
	productGridAnchorId?: string;
	summaryAnchorId?: string;
	productHtml?: string;
	summaryHtml?: string;
	explicitOverrideHtmlById?: Map<string, string>;
};

const COMPONENT_RENDERERS: Record<string, ComponentRenderer> = {
	container: {
		renderHtml: (_node, definition) => {
			if (!definition) return "";
			const tag = definition.render.htmlTag;
			const className = definition.render.className;
			return `<${tag} class="${className}"></${tag}>`;
		},
		renderCss: () => "",
		shouldRender: () => true
	},

	text: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			const tag = definition.render.htmlTag;
			const className = definition.render.className;
			return `<${tag} class="${className}">${escapeHtml(text)}</${tag}>`;
		},
		renderCss: () => "",
		shouldRender: () => true
	},

	button: {
		renderHtml: (node, definition) => {
			if (!definition) return "";
			const text = node ? componentText(node, definition) : "";
			const className = definition.render.className;
			return `<button class="${className}" type="button">${escapeHtml(text || definition.render.buttonText || definition.label)}</button>`;
		},
		renderCss: () => "",
		shouldRender: () => true
	},

	media: {
		renderHtml: (node, definition, hideVisibleText, context) => {
			if (!definition) return "";
			const tag = definition.render.htmlTag;
			const className = definition.render.className;

			if (tag === "hr") {
				return `<hr class="${className}" />`;
			}

			if (hideVisibleText) {
				return `<div class="${className}" aria-hidden="true"></div>`;
			}

			const altText = escapeHtml(
				(node && componentText(node, definition)) || (node && node.name) || definition.label || "Image"
			);
			const deliverablesPath =
				context && typeof context.deliverablesPath === "string" ? String(context.deliverablesPath) : "";
			const imageSrc =
				node && node.imageAsset && deliverablesPath
					? escapeHtml(deliverablesPath.replace(/\/$/, "") + "/" + node.imageAsset)
					: PRODUCT_PLACEHOLDER_IMAGE;

			return `
			<div class="${className}">
				<img src="${imageSrc}" alt="${altText}" />
			</div>
		`.trim();
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	height: ${toPercent(node.bounds.height, root.bounds.height)};
	margin: 0;
	display: block;
	overflow: hidden;
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale)}
}

.${definition.render.className} img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
}
`;
				})
				.join("");
		},
		shouldRender: () => true
	},

	input: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			const placeholder = escapeHtml(text);
			return `
			<label class="${definition.render.className}">
				<span class="usi_field_label usi_sr_only">${escapeHtml(node.name || definition.label)}</span>
				<input class="usi_field_input" type="${escapeHtml(definition.render.inputType || "text")}" placeholder="${placeholder}" />
			</label>
		`.trim();
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					const className = definition.render.className;

					return `
${htmlToCssClassName(className)} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	${flattenedAbsolutePositionDeclarations(node, root)}
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_field_input {
	width: 100%;
	padding: 0.875em 1em;
	${flattenedBoxDeclarations(node, frameScale, { width: "100%" })}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => hasInsertedComponent(root, "email_input") || hasInsertedComponent(root, "phone_input")
	},

	survey: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const children = node.children.filter(function (child) {
				return !child.ignored && child.visible;
			});
			const prompt = children[0] ? componentText(children[0]) : componentText(node, definition);
			const options =
				(children.length > 1 ? children.slice(1) : [])
					.map(function (child) {
						return `<button class="usi_survey_option" type="button">${escapeHtml(componentText(child))}</button>`;
					})
					.join("") ||
				`<button class="usi_survey_option" type="button">Option 1</button><button class="usi_survey_option" type="button">Option 2</button>`;
			return `
				<section class="${definition.render.className}">
					<p class="usi_survey_prompt">${escapeHtml(prompt)}</p>
					<div class="usi_survey_options">${options}</div>
				</section>
			`.trim();
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					const className = definition ? definition.render.className : "usi_survey";
					const promptNode = node.children[0];
					const firstOptionNode = node.children[1];
					const optionTextNode = firstTextDescendant(firstOptionNode) || firstOptionNode;
					return `
${htmlToCssClassName(className)} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-direction: column;
	gap: 0.75em;
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_survey_prompt {
	margin: 0;
	${flattenedTextDeclarations(promptNode || node, frameScale)}
}

${htmlToCssClassName(className)} .usi_survey_options {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	align-items: flex-start;
}

${htmlToCssClassName(className)} .usi_survey_option {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${flattenedBoxDeclarations(firstOptionNode || node, frameScale, {
		display: "inline-flex",
		"align-items": "center",
		"justify-content": "center",
		color: optionTextNode && optionTextNode.style.color ? optionTextNode.style.color : undefined
	})}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => hasInsertedComponent(root, "survey_block")
	},

	coupon: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const visibleChildren = node.children.filter(function (child) {
				return !child.ignored && child.visible;
			});
			const codeChild =
				visibleChildren.find(function (child) {
					return /save|coupon|code|offer/i.test(componentText(child));
				}) || visibleChildren[1] || visibleChildren[0];
			const buttonChild =
				visibleChildren.find(function (child) {
					return child !== codeChild;
				}) || visibleChildren[0];
			const code = codeChild ? componentText(codeChild) : componentText(node, definition) || definition.render.fallbackText || "SAVE15";
			const label = buttonChild ? componentText(buttonChild) : definition.render.buttonText || "Copy Code";
			const pieces = visibleChildren.length
				? visibleChildren.map(function (child) {
					if (child === codeChild) {
						return `<div class="usi_coupon_code">${escapeHtml(code)}</div>`;
					}
					return `<button class="usi_coupon_button" type="button">${escapeHtml(child === buttonChild ? label : componentText(child))}</button>`;
				}).join("")
				: `<div class="usi_coupon_code">${escapeHtml(code)}</div><button class="usi_coupon_button" type="button">${escapeHtml(label)}</button>`;
			return `
				<section class="${definition.render.className}">
					${pieces}
				</section>
			`.trim();
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					const className = definition ? definition.render.className : "usi_coupon";
					const codeNode =
						node.children.find(function (child) {
							return /save|coupon|code|offer/i.test(componentText(child));
						}) || node.children[0];
					const buttonNode =
						node.children.find(function (child) {
							return child !== codeNode;
						}) || node.children[1];
					const codeTextNode = firstTextDescendant(codeNode) || codeNode;
					return `
${htmlToCssClassName(className)} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-wrap: wrap;
	gap: 0.75em;
	align-items: center;
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_coupon_code {
	padding: 0.75em 1em;
	${flattenedBoxDeclarations(codeNode || node, frameScale, {
		"font-weight": 700,
		color: codeTextNode && codeTextNode.style.color ? codeTextNode.style.color : undefined,
		"text-shadow": codeTextNode && codeTextNode.style.boxShadow ? codeTextNode.style.boxShadow : undefined,
		"-webkit-text-stroke":
			codeTextNode && codeTextNode.style.borderColor
				? String(codeTextNode.style.borderWidth || 1) + "px " + codeTextNode.style.borderColor
				: undefined
	 })}
}

${htmlToCssClassName(className)} .usi_coupon_button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${buttonNode ? flattenedBoxDeclarations(buttonNode, frameScale, { display: "inline-flex", "align-items": "center", "justify-content": "center" }) : ""}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => hasInsertedComponent(root, "copy_coupon")
	},

	optin: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			return `
				<label class="${definition.render.className}">
					<input class="usi_optin_input" type="checkbox" />
					<span class="usi_optin_label">${escapeHtml(text)}</span>
				</label>
			`.trim();
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					const className = definition ? definition.render.className : "usi_optin";
					const checkboxNode = node.children[0];
					const labelNode = node.children[1];
					const labelTextNode = firstTextDescendant(labelNode) || labelNode;
					return `
${htmlToCssClassName(className)} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	gap: 0.625em;
	align-items: center;
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_optin_input {
	appearance: none;
	-webkit-appearance: none;
	width: 1.125em;
	height: 1.125em;
	${flattenedBoxDeclarations(checkboxNode || node, frameScale, {
		width: "1.125em",
		height: "1.125em",
		display: "inline-block",
		"border-color":
			checkboxNode && checkboxNode.style.borderColor
				? checkboxNode.style.borderColor
				: checkboxNode && checkboxNode.style.color
					? checkboxNode.style.color
					: undefined
	})}
	flex: 0 0 auto;
}

${htmlToCssClassName(className)} .usi_optin_label {
	display: inline-block;
	${flattenedTextDeclarations(labelTextNode || node, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => hasInsertedComponent(root, "optin_component")
	},

	countdown: {
		renderHtml: (_node, definition) => {
			if (!definition) return "";
			return `<div class="${definition.render.className}"><span id="usi_minutes">5</span>:<span id="usi_seconds">00</span></div>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					const className = definition ? definition.render.className : "usi_countdown";
					const digitsNode = firstTextDescendant(node) || node;
					return `
${htmlToCssClassName(className)} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	padding: 0.625em 0.875em;
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale)}
	font-weight: ${digitsNode && digitsNode.style.fontWeight ? digitsNode.style.fontWeight : 700};
	color: ${digitsNode && digitsNode.style.color ? digitsNode.style.color : "inherit"};
}

${htmlToCssClassName(className)} span {
	${flattenedTextDeclarations(digitsNode, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => hasInsertedComponent(root, "countdown_timer")
	},

	progress: {
		renderHtml: (_node, definition) => {
			if (!definition) return "";
			return `
				<div class="${definition.render.className}">
					<div class="usi_progress_fill"></div>
				</div>
			`.trim();
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					const className = definition ? definition.render.className : "usi_progress";
					const fillNode = node.children[0];
					return `
${htmlToCssClassName(className)} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	height: ${toPercent(node.bounds.height, root.bounds.height)};
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale)}
	overflow: hidden;
}

${htmlToCssClassName(className)} .usi_progress_fill {
	width: 55%;
	height: 100%;
	${flattenedBoxDeclarations(fillNode || node, frameScale, { height: "100%" })}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => hasInsertedComponent(root, "progress_bar")
	},

	product_title: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			const tag = definition.render.htmlTag || "h3";
			const className = definition.render.className;
			return `<${tag} class="${className}">${escapeHtml(text)}</${tag}>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	margin: 0;
	white-space: pre-wrap;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => findNodesByRole(root, "product-title", 0.35).length > 0
	},

	product_subtitle: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			const tag = definition.render.htmlTag || "p";
			const className = definition.render.className;
			return `<${tag} class="${className}">${escapeHtml(text)}</${tag}>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	margin: 0;
	font-size: 0.9em;
	${flattenedTextDeclarations(node, frameScale, { color: "#666" })}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => findNodesByRole(root, "product-subtitle", 0.35).length > 0
	},

	product_price: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			const tag = definition.render.htmlTag || "p";
			const className = definition.render.className;
			return `<${tag} class="${className}">${escapeHtml(text)}</${tag}>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	margin: 0;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => findNodesByRole(root, "product-price", 0.35).length > 0
	},

	product_button: {
		renderHtml: (node, definition) => {
			if (!definition) return "";
			const text = node ? componentText(node, definition) : "";
			const className = definition.render.className;
			return `<button class="${className}" type="button">${escapeHtml(text || definition.render.buttonText || "View item")}</button>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	${flattenedBoxDeclarations(node, frameScale, {
		display: "inline-flex",
		"align-items": "center",
		"justify-content": "center",
		color: "#ffffff"
	})}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => findNodesByRole(root, "product-cta", 0.35).length > 0
	},

	product_image: {
		renderHtml: (_node, definition, hideVisibleText) => {
			if (!definition || hideVisibleText) return "";
			const className = definition.render.className;
			return `<div class="${className}"><img src="${PRODUCT_PLACEHOLDER_IMAGE}" alt="Product" /></div>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	height: ${toPercent(node.bounds.height, root.bounds.height)};
	display: block;
	overflow: hidden;
	${flattenedBoxDeclarations(node, frameScale)}
}
.${definition.render.className} img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
}
`;
				})
				.join("");
		},
		shouldRender: () => false
	},

	price_subtotal: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			return `<div class="${definition.render.className}">${escapeHtml(text)}</div>`;
		},
		renderCss: (nodes, _root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	${flattenedTextDeclarations(node, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => findNodesByRole(root, "summary-subtotal", 0.35).length > 0
	},

	price_discount: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			return `<div class="${definition.render.className}">${escapeHtml(text)}</div>`;
		},
		renderCss: (nodes, _root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	font-weight: 700;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => findNodesByRole(root, "summary-discount", 0.35).length > 0
	},

	price_total: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			return `<div class="${definition.render.className}">${escapeHtml(text)}</div>`;
		},
		renderCss: (nodes, _root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	font-weight: 700;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: (root) => findNodesByRole(root, "summary-total", 0.35).length > 0
	},

	product_grid: {
		renderHtml: (_node, _definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const productHtml = String((context && context.productHtml) || "");
			if (!productHtml) return "";
			return `<section class="usi_products usi_products_grid">${productHtml}</section>`;
		},
		renderCss: (nodes, root, frameScale, context?: Record<string, unknown>) => {
			if (!nodes.length) return "";
			const firstProductCard = context ? (context.firstProductCard as NormalizedNode | undefined) : undefined;
			const productImageNode = context ? (context.productImageNode as NormalizedNode | undefined) : undefined;
			const productTitleNode = context ? (context.productTitleNode as NormalizedNode | undefined) : undefined;
			const productPriceNode = context ? (context.productPriceNode as NormalizedNode | undefined) : undefined;
			const productButtonNode = context ? (context.productButtonNode as NormalizedNode | undefined) : undefined;
			const productSubtitleNodes = context
				? (context.productSubtitleNodes as NormalizedNode[] | undefined)
				: undefined;
			const productGap = context ? (context.productGap as number | undefined) : undefined;
			const gridColumns = context ? (context.gridColumns as number | undefined) : undefined;
			const productBounds = context ? (context.productBounds as NodeBounds | undefined) : undefined;
			const firstCardWidth = firstProductCard && productBounds ? firstProductCard.bounds.width : undefined;
			const imageAspectRatio = productImageNode
				? `${productImageNode.bounds.width} / ${productImageNode.bounds.height}`
				: undefined;

			const productCardCss = nodes
				.filter(function (card) {
					return card.children && card.children.length > 0;
				})
				.map(function (card, index) {
					const imageNode = findNormalizedNodeById(card, findImageNodeId(card));
					const imageRule = imageNode
						? `
.usi_product${index + 1} .usi_product_image {
	width: ${toPercent(imageNode.bounds.width, card.bounds.width)};
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
			return `
.usi_products {
	width: ${productBounds ? toPercent(productBounds.width, root.bounds.width) : "76%"};
	min-height: ${productBounds ? toPercent(productBounds.height, root.bounds.height) : "0%"};
	display: grid;
	grid-template-columns: repeat(${productBounds && productBounds.width < productBounds.height * 0.9 ? 1 : gridColumns || 1}, minmax(0, 1fr));
	gap: ${productBounds && productGap != null ? toPercent(productGap, productBounds.width) : "2%"};
	justify-items: center;
	justify-content: center;
	align-content: start;
	align-items: start;
	box-sizing: border-box;
	/*flattenedAbsolutePositionDeclarations(nodes[0], root, { force: true, includeWidth: true, includeHeight: true })*/
	${flattenedBoxDeclarations(nodes[0], frameScale)}
}

.usi_product {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 0.75em;
	padding: 0.9em;
	width: 100%;
	max-width: 100%;
	min-width: 0;
	min-height: 0;
	margin: 0 auto;
	box-sizing: border-box;
	${
		flattenedBoxDeclarations(firstProductCard, frameScale, {
			width:
				firstCardWidth && productBounds && gridColumns && gridColumns > 1
					? toPercent(firstCardWidth, productBounds.width)
					: "100%",
			"max-width": "100%",
			"min-width": "0"
		}) || "width: 100%; max-width: 100%; min-width: 0;"
	}
}

.usi_product_image {
	position: relative;
	display: block;
	width: ${
		productImageNode && firstProductCard
			? toPercent(productImageNode.bounds.width, firstProductCard.bounds.width)
			: "100%"
	};
	height: ${
		productImageNode && firstProductCard
			? toPercent(productImageNode.bounds.height, firstProductCard.bounds.height)
			: "auto"
	};
	min-width: 0;
	overflow: hidden;
	margin: 0;
	align-self: flex-start;
	${imageAspectRatio ? `aspect-ratio: ${imageAspectRatio};` : ""}
	${
		flattenedBoxDeclarations(productImageNode, frameScale, {
			position: "relative",
			left: undefined,
			top: undefined,
			height:
				productImageNode && firstProductCard
					? toPercent(productImageNode.bounds.height, firstProductCard.bounds.height)
					: undefined
		}) || "width: 100%; position: relative;"
	}
}

.usi_product_image img {
	display: block;
	width: 100%;
	height: 100%;
	max-width: 100%;
	object-fit: contain;
}

.usi_product_body {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 0.35em;
	min-width: 0;
	width: 100%;
	box-sizing: border-box;
}

.usi_product_title,
.usi_product_subtitle,
.usi_product_price {
	position: static;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.usi_product_title {
	margin: 0;
	white-space: pre-wrap;
	word-break: normal;
	${
		flattenedTextDeclarations(productTitleNode, frameScale, {
			"white-space": "pre-wrap",
			"background-color": "transparent",
			border: "none"
		}) || "font-weight: 700;"
	}
}

.usi_product_subtitle {
	margin: 0;
	word-break: normal;
	${productSubtitleNodes && productSubtitleNodes[0] ? flattenedTextDeclarations(productSubtitleNodes[0], frameScale) : "color: #666;"}
}

.usi_product_price {
	margin: 0;
	word-break: normal;
	${flattenedTextDeclarations(productPriceNode, frameScale) || ""}
}

.usi_product_cta {
	position: static;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	align-self: flex-start;
	width: ${
		productButtonNode && firstProductCard
			? toPercent(productButtonNode.bounds.width, firstProductCard.bounds.width)
			: "auto"
	};
	max-width: 100%;
	padding: 0.75em 1em;
	margin: 0;
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
`;
		},
		shouldRender: () => false
	},

	price_table: {
		renderHtml: (_node, _definition, _hideVisibleText, context?: Record<string, unknown>) => {
			return String((context && context.summaryHtml) || "");
		},
		renderCss: (nodes, root, frameScale, context?: Record<string, unknown>) => {
			if (!nodes.length) return "";
			const summaryNode = context ? (context.summaryNode as NormalizedNode | undefined) : undefined;
			const summarySubtotalNode = context
				? (context.summarySubtotalNode as NormalizedNode | undefined)
				: undefined;
			const summaryDiscountNode = context
				? (context.summaryDiscountNode as NormalizedNode | undefined)
				: undefined;
			const summaryTotalNode = context ? (context.summaryTotalNode as NormalizedNode | undefined) : undefined;
			const subtotalLabelNode = firstTextDescendant(summarySubtotalNode);
			const subtotalValueNode = lastTextDescendant(summarySubtotalNode);
			const discountLabelNode = firstTextDescendant(summaryDiscountNode);
			const discountValueNode = lastTextDescendant(summaryDiscountNode);
			const totalLabelNode = firstTextDescendant(summaryTotalNode);
			const totalValueNode = lastTextDescendant(summaryTotalNode);
			const summaryTitleNode = firstTextDescendant(summaryNode) || summaryNode;

			return `
.usi_summary {
	width: ${summaryNode ? toPercent(summaryNode.bounds.width, root.bounds.width) : "76%"};
	padding: 1em;
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	${flattenedAbsolutePositionDeclarations(summaryNode, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_summary_title {
	margin: 0 0 0.5em;
	white-space: pre-wrap;
	${
		flattenedTextDeclarations(summaryTitleNode, frameScale, {
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

.usi_price .usi_label,
.usi_price .usi_value,
.usi_discount .usi_label,
.usi_discount .usi_value,
.usi_new_price .usi_label,
.usi_new_price .usi_value {
	font-size: 1em;
}

.usi_price .usi_label {
	${flattenedTextDeclarations(subtotalLabelNode || summarySubtotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_price .usi_value {
	${flattenedTextDeclarations(subtotalValueNode || summarySubtotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_discount {
	${flattenedTextDeclarations(summaryDiscountNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_discount .usi_label {
	${flattenedTextDeclarations(discountLabelNode || summaryDiscountNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_discount .usi_value {
	${flattenedTextDeclarations(discountValueNode || summaryDiscountNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_new_price {
	${flattenedTextDeclarations(summaryTotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_new_price .usi_label {
	${flattenedTextDeclarations(totalLabelNode || summaryTotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_new_price .usi_value {
	${flattenedTextDeclarations(totalValueNode || summaryTotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
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
`;
		},
		shouldRender: () => false
	},

	no_thanks_button: {
		renderHtml: (node, definition) => {
			if (!definition) return "";
			const text = node ? componentText(node, definition) : "";
			const className = definition.render.className;
			return `<button class="${className}" type="button">${escapeHtml(text || "No Thanks")}</button>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			const node = nodes[0];
			const textNode = firstTextDescendant(node) || node;
			return `
.usi_secondary_cta {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale, { color: textNode && textNode.style.color ? textNode.style.color : undefined })}
}
`;
		},
		shouldRender: (root) => findNodesByRole(root, "secondary-cta", 0.35).length > 0
	},

	disclaimer_text: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const className = definition.render.className;
			return `<p class="${className}">We use your information in accordance with our <a href="https://labs.upsellit.com/privacy-policy" target="_blank">privacy policy</a>.</p>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			const node = nodes[0];
			const allTextNodes = textDescendants(node);
			const baseTextNode = allTextNodes[0] || node;
			const linkNode =
				allTextNodes.find(function (child) {
					return /privacy|policy/i.test(componentText(child));
				}) || allTextNodes[allTextNodes.length - 1] || node;
			return `
.usi_disclaimer {
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	margin: 0;
	font-size: 0.875em;
	line-height: 1.4;
	text-align: center;
	${flattenedAbsolutePositionDeclarations(node, root, {
		force: true,
		includeWidth: true,
		pinBottom: node.bounds.y > root.bounds.height * 0.55
	})}
	${flattenedTextDeclarations(baseTextNode || node, frameScale)}
}
.usi_disclaimer a {
	${flattenedTextDeclarations(linkNode || node, frameScale, {
		color: linkNode && linkNode.style.color ? linkNode.style.color : undefined,
		"font-size": linkNode && linkNode.style.fontSize ? pxToEm(linkNode.style.fontSize, 16, frameScale) : undefined,
		"font-weight": linkNode && linkNode.style.fontWeight ? linkNode.style.fontWeight : 700,
		"text-decoration": "underline"
	})}
}
`;
		},
		shouldRender: (root) => findNodesByRole(root, "disclaimer", 0.35).length > 0
	},

	headline: {
		renderHtml: (node, definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const text = String(
				(context && context.text) || (node && definition ? componentText(node, definition) : "")
			);
			const className = String((context && context.className) || "usi_headline");
			return text ? `<h1 class="${className}">${escapeHtml(text)}</h1>` : "";
		},
		renderCss: (nodes, _root, frameScale, context?: Record<string, unknown>) => {
			if (!nodes.length) return "";
			const node = nodes[0];
			return `
.usi_headline {
	${flattenedAbsolutePositionDeclarations(node, context ? (context.rootBounds as NodeBounds | undefined) : undefined, {
		force: true,
		includeWidth: true
	})}
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap", "max-width": "none" })}
}
`;
		},
		shouldRender: () => false
	},

	eyebrow: {
		renderHtml: (node, definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const text = String(
				(context && context.text) || (node && definition ? componentText(node, definition) : "")
			);
			const className = String((context && context.className) || "usi_eyebrow");
			return text ? `<p class="${className}">${escapeHtml(text)}</p>` : "";
		},
		renderCss: (nodes, _root, frameScale, context?: Record<string, unknown>) => {
			if (!nodes.length) return "";
			const node = nodes[0];
			return `
.usi_eyebrow {
	${flattenedAbsolutePositionDeclarations(node, context ? (context.rootBounds as NodeBounds | undefined) : undefined, {
		force: true,
		includeWidth: true
	})}
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap", "max-width": "none" })}
}
`;
		},
		shouldRender: () => false
	},

	subtext: {
		renderHtml: (node, definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const text = String(
				(context && context.text) || (node && definition ? componentText(node, definition) : "")
			);
			const className = String((context && context.className) || "usi_subtext");
			return text ? `<p class="${className}">${escapeHtml(text)}</p>` : "";
		},
		renderCss: (nodes, _root, frameScale, context?: Record<string, unknown>) => {
			if (!nodes.length) return "";
			const node = nodes[0];
			return `
.usi_subtext {
	${flattenedAbsolutePositionDeclarations(node, context ? (context.rootBounds as NodeBounds | undefined) : undefined, {
		force: true,
		includeWidth: true
	})}
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap", "max-width": "none" })}
}
`;
		},
		shouldRender: () => false
	},

	primary_button: {
		renderHtml: (node, definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const ctaLabel = String(
				(context && context.ctaLabel) ||
					(definition ? definition.render.buttonText || definition.label : "Redeem Now")
			);
			const ctaInnerHtml = String((context && context.ctaInnerHtml) || escapeHtml(ctaLabel));
			const showCtaInVariant = !!(context && context.showCtaInVariant);
			if (!showCtaInVariant) return "";
			const className = definition ? definition.render.className : "usi_primary_cta";
			const ariaLabel = escapeHtml(ctaLabel);
			return `<button class="${className} usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="${ariaLabel}">${ctaInnerHtml}</button>`;
		},
		renderCss: (nodes, root, frameScale) => {
			const node = nodes[0];
			return `
.usi_submitbutton {
	width: ${node ? toPercent(node.bounds.width, root.bounds.width) : "76%"};
	min-height: ${node ? toPercent(node.bounds.height, root.bounds.height) : "15.5%"};
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	${flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true, includeHeight: true })}
	${flattenedBoxDeclarations(node, frameScale, {
		display: "flex",
		"align-items": "center",
		"justify-content": "center",
		"background-color": node && node.style.background ? node.style.background : "#1f1f1f",
		color: node && node.style.color ? node.style.color : "#ffffff",
		"text-align": node && node.style.textAlign ? node.style.textAlign : "center"
	})}
}
`;
		},
		shouldRender: () => true
	},

	close_control: {
		renderHtml: () => `<button type="button" id="usi_close" aria-label="Close">×</button>`,
		renderCss: (_nodes, root, frameScale, context?: Record<string, unknown>) => {
			const closeVisualNode = context ? (context.closeVisualNode as NormalizedNode | undefined) : undefined;
			const closeNode = context ? (context.closeNode as NormalizedNode | undefined) : undefined;
			const node = closeVisualNode || closeNode;
			return `
#usi_close {
	position: absolute;
	left: ${node ? toPercent(node.bounds.x - root.bounds.x, root.bounds.width) : "95%"};
	top: ${node ? toPercent(node.bounds.y - root.bounds.y, root.bounds.height) : "2%"};
	width: ${node ? toPercent(node.bounds.width, root.bounds.width) : "3%"};
	height: ${node ? toPercent(node.bounds.height, root.bounds.height) : "3%"};
	z-index: 2000000300;
	cursor: pointer;
	padding: 0;
	margin: 0;
	display: block;
	overflow: hidden;
	text-indent: -9999px;
	${flattenedBoxDeclarations(closeNode, frameScale, { background: closeNode && closeNode.style.background ? closeNode.style.background : "none" }) || "background:none;"}
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
		flattenedTextDeclarations(node, frameScale, {
			background: "transparent",
			border: "none",
			color: node && (node.style.color || node.style.borderColor) ? node.style.color || node.style.borderColor : undefined,
			"text-align": "center",
			"line-height": "1"
		}) || "background:transparent;border:none;text-align:center;line-height:1;"
	}
	${
		node && node.style.borderColor
			? `-webkit-text-stroke:${String(node.style.borderWidth || 1)}px ${node.style.borderColor}; text-shadow:-1px 0 ${node.style.borderColor}, 0 1px ${node.style.borderColor}, 1px 0 ${node.style.borderColor}, 0 -1px ${node.style.borderColor};`
			: ""
	}
}

button#usi_close,
button#usi_close:hover,
button#usi_close:active,
button#usi_close:focus {
	cursor: pointer;
}
`;
		},
		shouldRender: () => true
	},

	screen: {
		renderHtml: (_node, _definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const contentHtml = String((context && context.contentHtml) || "");
			const imageFileName = String((context && context.imageFileName) || "");
			const headlineText = String((context && context.headlineText) || "Preview");
			const scaledRootWidth = context ? (context.scaledRootWidth as number | undefined) : undefined;
			const scaledRootHeight = context ? (context.scaledRootHeight as number | undefined) : undefined;

			return `
		<div id="usi_container">
			<div
				id="usi_display"
				role="alertdialog"
				aria-label="${escapeHtml(headlineText || "Preview")}"
				aria-modal="true"
				class="usi_display usi_show_css usi_shadow"
				style="width:${scaledRootWidth}px;height:${scaledRootHeight}px;"
			>
				<div id="usi_content">${contentHtml}</div>
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
			`.trim();
		},
		renderCss: (_nodes, root, _frameScale, context?: Record<string, unknown>) => {
			const scaledRootWidth = context ? (context.scaledRootWidth as number | undefined) : undefined;
			const scaledRootHeight = context ? (context.scaledRootHeight as number | undefined) : undefined;

			return `
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
	margin-left: -${String((scaledRootWidth || 0) / 2)}px;
	top: 0px;
	width: ${scaledRootWidth}px;
	height: ${scaledRootHeight}px;
	font-size: 16px;
	color: #000;
	font-family: inherit;
	${root.layout && root.layout.padding ? "padding: " + root.layout.padding.top + "px " + root.layout.padding.right + "px " + root.layout.padding.bottom + "px " + root.layout.padding.left + "px;" : ""}
	${root.style.borderRadius != null ? "border-radius: " + String(root.style.borderRadius) + "px;" : ""}
}
.usi_display img:after {
	content: "Image Not Available";
	display: flex;
	text-align: center;
	align-items: center;
	justify-content: center;
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: #f0f0f0;
	border: 1px solid #ccc;
	color: #666;
}
.usi_modal_inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	height: 100%;
	flex: auto;
}
	
`;
		},
		shouldRender: () => true
	}
};

function generateProductGridHtml(
	products: Array<{ title?: string; subtitle?: string; price?: string; cta?: string; imageAsset?: string }>,
	isRuntime: boolean,
	deliverablesPath?: string
): string {
	if (!products.length) return "";

	return products
		.map(function (product, index) {
			const fallbackTitle = escapeHtml(product.title || "");
			const fallbackSubtitle = escapeHtml(product.subtitle || "");
			const fallbackPrice = escapeHtml(product.price || "");
			const fallbackButton = escapeHtml(product.cta || "");
			const fallbackImageSrc = product.imageAsset && deliverablesPath
				? escapeHtml(deliverablesPath.replace(/\/$/, "") + "/" + product.imageAsset)
				: PRODUCT_PLACEHOLDER_IMAGE;

			const hasMeaningfulContent = !!fallbackSubtitle || !!fallbackPrice || !!fallbackButton;
			if (!hasMeaningfulContent) return "";

			return `
				<article class="usi_product_card usi_product usi_product${index + 1}">
					<div class="usi_product_image">
						<img
							src="${
								isRuntime
									? `\${usi_cookies.get('usi_prod_image_${index + 1}') || '${fallbackImageSrc}'}`
									: fallbackImageSrc
							}"
							alt="${
								isRuntime
									? `\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitle || "Product"}')}`
									: fallbackTitle || "Product"
							}"
						/>
					</div>
					<div class="usi_product_body">
						<h3 class="usi_product_title">${
							isRuntime
								? `\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitle}')}`
								: fallbackTitle
						}</h3>
						${fallbackSubtitle ? `<p class="usi_product_subtitle">${fallbackSubtitle}</p>` : ""}
						${fallbackPrice ? `<p class="usi_product_price">${fallbackPrice}</p>` : ""}
						${fallbackButton ? `<button class="usi_product_cta" type="button">${fallbackButton}</button>` : ""}
					</div>
				</article>
			`.trim();
		})
		.filter(Boolean)
		.join("");
}

function generateSummaryHtml(hasSummary: boolean, summaryTitle: string | undefined, isRuntime: boolean): string {
	if (!hasSummary) return "";
	if (isRuntime) {
		return `
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
		`.trim();
	}
	return `
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
	`.trim();
}

function groupNodesByRenderer(nodes: NormalizedNode[]): Record<string, NormalizedNode[]> {
	return nodes.reduce(
		function (acc, node) {
			const definition = componentDefinitionForNode(node);
			if (!definition) return acc;
			const rendererKey = COMPONENT_RENDERERS[definition.id] ? definition.id : definition.render.kind;
			if (!acc[rendererKey]) acc[rendererKey] = [];
			acc[rendererKey].push(node);
			return acc;
		},
		{} as Record<string, NormalizedNode[]>
	);
}

function renderComponentByKey(
	rendererKey: string,
	node: NormalizedNode | undefined,
	definition: CommonComponentDefinition | undefined,
	hideVisibleText: boolean,
	context?: Record<string, unknown>
): string {
	const renderer = COMPONENT_RENDERERS[rendererKey];
	if (!renderer) return "";
	return renderer.renderHtml(node, definition, hideVisibleText, context);
}

function renderExplicitComponentNode(
	node: NormalizedNode,
	hideVisibleText: boolean,
	root?: NormalizedNode,
	frameScale = 1,
	deliverablesPath = ""
): string {
	const definition = componentDefinitionForNode(node);
	if (!definition) return "";

	const idRenderer = COMPONENT_RENDERERS[definition.id];
	if (idRenderer) {
		return idRenderer.renderHtml(node, definition, hideVisibleText, { deliverablesPath });
	}

	const kind = definition.render.kind;
	const renderer = COMPONENT_RENDERERS[kind];

	if (renderer) {
		return renderer.renderHtml(node, definition, hideVisibleText, { deliverablesPath });
	}

	const tag = definition.render.htmlTag;
	const className =
		hideVisibleText && definition.render.kind === "text"
			? definition.render.className + " usi_sr_only"
			: definition.render.className;
	const text = componentText(node, definition);
	const inlineStyle =
		definition.render.kind === "text" && root
			? [
					flattenedAbsolutePositionDeclarations(node, root, { force: true, includeWidth: true }),
					flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap" })
				]
					.filter(Boolean)
					.join("")
			: "";
	return `<${tag} class="${className}"${inlineStyle ? ` style="${inlineStyle}"` : ""}>${escapeHtml(text)}</${tag}>`;
}

function hasInsertedComponent(root: NormalizedNode, componentId: string): boolean {
	return flattenTree(root).some(function (node) {
		return !node.ignored && node.componentOverride === componentId;
	});
}

function htmlToCssClassName(cn: string): string {
	return cn
		.split(" ")
		.map((s) => "." + s)
		.join("");
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

	const role = node.detectedRole || node.roleOverride;
	if (!role || role === "other") return undefined;

	return COMPONENT_BY_ROLE[role];
}

function componentText(node: NormalizedNode, definition?: CommonComponentDefinition): string {
	const text = collectText(node) || node.text || node.name || "";
	if (text) return text;
	return definition && definition.render.fallbackText ? definition.render.fallbackText : "";
}

function textDescendants(node: NormalizedNode | undefined): NormalizedNode[] {
	if (!node) return [];
	return flattenTree(node).filter(function (child) {
		const text = String(child.text || "").trim();
		return !!text && (child.type === "TEXT" || child.children.length === 0);
	});
}

function firstTextDescendant(node: NormalizedNode | undefined): NormalizedNode | undefined {
	return textDescendants(node)[0];
}

function lastTextDescendant(node: NormalizedNode | undefined): NormalizedNode | undefined {
	const descendants = textDescendants(node);
	return descendants.length ? descendants[descendants.length - 1] : undefined;
}

function firstChildWithBackground(node: NormalizedNode | undefined): NormalizedNode | undefined {
	if (!node) return undefined;
	return flattenTree(node).find(function (child) {
		return !!child.style.background || !!child.style.borderColor || !!child.style.borderRadius;
	});
}

function googleFontHeadTags(fontFamilies: string[]): string {
	const googleFontSet = new Set(
		GOOGLE_FONT_FAMILIES.map(function (font: string) {
			return font.toLowerCase();
		})
	);
	const families = Array.from(
		new Set(
			fontFamilies.filter(function (font) {
				return googleFontSet.has(font.toLowerCase());
			})
		)
	);
	if (!families.length) return "";
	const href =
		"https://fonts.googleapis.com/css2?" +
		families
			.map(function (font) {
				return "family=" + encodeURIComponent(font).replace(/%20/g, "+");
			})
			.join("&") +
		"&display=swap";
	return [
		'<link rel="preconnect" href="https://fonts.googleapis.com">',
		'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
		`<link href="${href}" rel="stylesheet">`
	].join("\n\t\t");
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
				"-webkit-text-stroke": node.style.borderColor
					? String(node.style.borderWidth || 1) + "px " + node.style.borderColor
					: undefined,
				"text-shadow": node.style.boxShadow,
				opacity: node.style.opacity !== 1 ? node.style.opacity : "",
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
				"border-radius": node.style.borderRadius ? String(node.style.borderRadius) + "px" : undefined,
				"overflow-x": node.style.overflowX,
				"overflow-y": node.style.overflowY,
				"box-shadow": node.style.boxShadow,
				opacity: node.style.opacity !== 1 ? node.style.opacity : "",
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

function flattenedAbsolutePositionDeclarations(
	node: NormalizedNode | undefined,
	root: NormalizedNode | NodeBounds | undefined,
	options?: { includeWidth?: boolean; includeHeight?: boolean; force?: boolean; pinBottom?: boolean }
): string {
	if (!node || !root) return "";
	const rootBounds = "bounds" in root ? root.bounds : root;
	if (!rootBounds || !rootBounds.width || !rootBounds.height) return "";

	const isAbsolute = options && options.force ? true : node.layout.positioning === "ABSOLUTE";
	if (!isAbsolute) return "";

	const bottom = rootBounds.y + rootBounds.height - (node.bounds.y + node.bounds.height);

	return cssDeclarations({
		position: "absolute",
		left: toPercent(node.bounds.x - rootBounds.x, rootBounds.width),
		top: options && options.pinBottom ? undefined : toPercent(node.bounds.y - rootBounds.y, rootBounds.height),
		bottom:
			options && options.pinBottom ? toPercent(bottom, rootBounds.height) : undefined,
		width: options && options.includeWidth ? toPercent(node.bounds.width, rootBounds.width) : undefined,
		height: options && options.includeHeight ? toPercent(node.bounds.height, rootBounds.height) : undefined
	});
}

function findDescendantRoleNode(root: NormalizedNode | undefined, role: ExportRole): NormalizedNode | undefined {
	if (!root) return undefined;
	return pickBestNode(findNodesByRole(root, role, 0.1));
}

function findStandaloneRoleNode(
	root: NormalizedNode,
	role: ExportRole,
	excludedAncestorIds: string[] = []
): NormalizedNode | undefined {
	return pickBestNode(
		findNodesByRole(root, role, 0.35).filter(function (node) {
			return !excludedAncestorIds.some(function (ancestorId) {
				const ancestor = findNormalizedNodeById(root, ancestorId);
				return ancestor ? nodeContains(ancestor, node) : false;
			});
		})
	);
}

function syntheticNodeFromBounds(id: string, bounds: NodeBounds | undefined): NormalizedNode | undefined {
	if (!bounds) return undefined;
	return {
		id: id,
		name: id,
		type: "FRAME",
		text: "",
		visible: true,
		ignored: false,
		children: [],
		bounds: bounds,
		style: {},
		layout: {},
		metadata: {}
	} as unknown as NormalizedNode;
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

function byVisualOrder(a: NormalizedNode, b: NormalizedNode): number {
	if (Math.abs(a.bounds.y - b.bounds.y) > 2) return a.bounds.y - b.bounds.y;
	if (Math.abs(a.bounds.x - b.bounds.x) > 2) return a.bounds.x - b.bounds.x;
	return a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height;
}

function isRenderableNode(node: NormalizedNode | undefined): boolean {
	return !!node && !node.ignored && node.visible;
}

function shouldSkipRecursiveNode(node: NormalizedNode, excludedIds: Set<string>): boolean {
	return !isRenderableNode(node) || excludedIds.has(node.id);
}

function isContainerLikeNode(node: NormalizedNode): boolean {
	if (node.children.length > 0) return true;
	if (node.type === "FRAME" || node.type === "GROUP" || node.type === "INSTANCE" || node.type === "COMPONENT") {
		return true;
	}
	return false;
}

function hasAutoLayout(node: NormalizedNode): boolean {
	return !!(
		node.layout &&
		(node.layout.mode === "HORIZONTAL" ||
			node.layout.mode === "VERTICAL" ||
			node.layout.primaryAxisAlignItems ||
			node.layout.counterAxisAlignItems)
	);
}

function containerTagForNode(_node: NormalizedNode): string {
	return "div";
}

function layoutDirection(node: NormalizedNode): "row" | "column" {
	return node.layout && node.layout.mode === "HORIZONTAL" ? "row" : "column";
}

function autoLayoutDeclarations(node: NormalizedNode, frameScale: number): string {
	if (!hasAutoLayout(node)) return "";

	const gap =
		node.layout && node.layout.itemSpacing != null ? pxToEm(node.layout.itemSpacing, 16, frameScale) : undefined;

	const padding =
		node.layout && node.layout.padding
			? `${pxToEm(node.layout.padding.top || 0, 16, frameScale)} ${pxToEm(
					node.layout.padding.right || 0,
					16,
					frameScale
				)} ${pxToEm(node.layout.padding.bottom || 0, 16, frameScale)} ${pxToEm(
					node.layout.padding.left || 0,
					16,
					frameScale
				)}`
			: undefined;

	const alignItems =
		node.layout && node.layout.counterAxisAlignItems === "CENTER"
			? "center"
			: node.layout && node.layout.counterAxisAlignItems === "MAX"
				? "flex-end"
				: node.layout && node.layout.counterAxisAlignItems === "MIN"
					? "flex-start"
					: undefined;

	const justifyContent =
		node.layout && node.layout.primaryAxisAlignItems === "CENTER"
			? "center"
			: node.layout && node.layout.primaryAxisAlignItems === "MAX"
				? "flex-end"
				: node.layout && node.layout.primaryAxisAlignItems === "SPACE_BETWEEN"
					? "space-between"
					: node.layout && node.layout.primaryAxisAlignItems === "MIN"
						? "flex-start"
						: undefined;

	return cssDeclarations({
		display: "flex",
		"flex-direction": layoutDirection(node),
		gap,
		padding,
		"align-items": alignItems,
		"justify-content": justifyContent
	});
}
function joinClassNames(...values: Array<string | undefined>): string {
	return values.filter(Boolean).join(" ");
}
function recursiveClassName(node: NormalizedNode): string {
	if (!INCLUDE_DEBUG_NODE_CLASSES) return "";
	return `usi_node usi_node_${node.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function renderGenericLeafNode(node: NormalizedNode): string {
	const className = joinClassNames(recursiveClassName(node));
	const text = collectText(node).trim();

	if (text) {
		return escapeHtml(text);
		//return className ? `<div class="${className}">${escapeHtml(text)}</div>` : `<div>${escapeHtml(text)}</div>`;
	}

	if (node.type === "LINE") {
		return className ? `<hr class="${className}" />` : `<hr />`;
	}

	return className ? `<div class="${className}" aria-hidden="true"></div>` : `<div aria-hidden="true"></div>`;
}
function inlineLayoutStyles(node: NormalizedNode, frameScale: number): string {
	if (!hasAutoLayout(node)) return "";

	const styles: Record<string, string | number | undefined> = {
		display: "flex",
		"flex-direction": layoutDirection(node),
		gap:
			node.layout && node.layout.itemSpacing != null
				? pxToEm(node.layout.itemSpacing, 16, frameScale)
				: undefined,
		padding:
			node.layout && node.layout.padding
				? `${pxToEm(node.layout.padding.top || 0, 16, frameScale)} ${pxToEm(
						node.layout.padding.right || 0,
						16,
						frameScale
					)} ${pxToEm(node.layout.padding.bottom || 0, 16, frameScale)} ${pxToEm(
						node.layout.padding.left || 0,
						16,
						frameScale
					)}`
				: undefined,
		"align-items":
			node.layout && node.layout.counterAxisAlignItems === "CENTER"
				? "center"
				: node.layout && node.layout.counterAxisAlignItems === "MAX"
					? "flex-end"
					: node.layout && node.layout.counterAxisAlignItems === "MIN"
						? "flex-start"
						: undefined,
		"justify-content":
			node.layout && node.layout.primaryAxisAlignItems === "CENTER"
				? "center"
				: node.layout && node.layout.primaryAxisAlignItems === "MAX"
					? "flex-end"
					: node.layout && node.layout.primaryAxisAlignItems === "SPACE_BETWEEN"
						? "space-between"
						: node.layout && node.layout.primaryAxisAlignItems === "MIN"
							? "flex-start"
							: undefined
	};

	return cssDeclarations(styles);
}

function inlinePositionStyles(
	node: NormalizedNode,
	root: NormalizedNode,
	forceAbsolute: boolean
): string {
	if (!forceAbsolute && node.layout.positioning !== "ABSOLUTE") return "";

	return cssDeclarations({
		position: "absolute",
		left: toPercent(node.bounds.x - root.bounds.x, root.bounds.width),
		top: toPercent(node.bounds.y - root.bounds.y, root.bounds.height),
		width: toPercent(node.bounds.width, root.bounds.width),
		height: toPercent(node.bounds.height, root.bounds.height)
	});
}

function collectRecursiveCss(
	node: NormalizedNode,
	root: NormalizedNode,
	frameScale: number,
	excludedIds: Set<string>
): string {
	if (shouldSkipRecursiveNode(node, excludedIds)) return "";

	const definition = componentDefinitionForNode(node);
	if (definition) {
		return "";
	}

	const className = recursiveClassName(node);
	if (!className) {
		return node.children
			.map(function (child) {
				return collectRecursiveCss(child, root, frameScale, excludedIds);
			})
			.join("");
	}
	const safeSelector = "." + className.split(" ").join(".");
	const hasText = !!collectText(node).trim();
	const isLeaf = !node.children.length;

	const nodeCss = `
${safeSelector} {
	position: relative;
	box-sizing: border-box;
	min-width: 0;
	${hasAutoLayout(node) ? autoLayoutDeclarations(node, frameScale) : ""}
	${flattenedBoxDeclarations(node, frameScale)}
	${hasText ? flattenedTextDeclarations(node, frameScale) : ""}
	${!isLeaf ? "" : ""}
}
`;

	const childrenCss = node.children
		.map(function (child) {
			return collectRecursiveCss(child, root, frameScale, excludedIds);
		})
		.join("");

	return nodeCss + childrenCss;
}

function renderRecursiveNode(node: NormalizedNode, context: RecursiveRenderContext): string {
	if (shouldSkipRecursiveNode(node, context.excludedIds)) return "";

	const overrideHtml = context.explicitOverrideHtmlById ? context.explicitOverrideHtmlById.get(node.id) : undefined;
	if (overrideHtml != null) {
		return overrideHtml;
	}

	if (context.productGridAnchorId && node.id === context.productGridAnchorId) {
		return renderComponentByKey("product_grid", node, COMPONENT_BY_ID.product_grid, context.hideVisibleText, {
			productHtml: context.productHtml || ""
		});
	}

	if (context.summaryAnchorId && node.id === context.summaryAnchorId) {
		return renderComponentByKey("price_table", node, COMPONENT_BY_ID.price_table, context.hideVisibleText, {
			summaryHtml: context.summaryHtml || ""
		});
	}

	const definition = componentDefinitionForNode(node);

	const childrenHtml = node.children
		.map(function (child) {
			return renderRecursiveNode(child, context);
		})
		.filter(Boolean)
		.join("");

	if (definition) {
		const isContainerDefinition =
			definition.render.kind === "container" ||
			definition.id === "content_stack" ||
			definition.role === "content";

		if (isContainerDefinition) {
			const tag = definition.render.htmlTag || "div";
			const className = definition.render.className;

			const inlineStyle = [
				inlinePositionStyles(node, context.root, context.hideVisibleText),
				inlineLayoutStyles(node, context.frameScale),
				flattenedBoxDeclarations(node, context.frameScale)
			]
				.filter(Boolean)
				.join("");

			return `<${tag} class="${className}"${inlineStyle ? ` style="${inlineStyle}"` : ""}>${childrenHtml}</${tag}>`;
		}

		return renderExplicitComponentNode(
			node,
			context.hideVisibleText,
			context.root,
			context.frameScale,
			context.deliverablesPath || ""
		);
	}

	if (isContainerLikeNode(node)) {
		const tag = containerTagForNode(node);
		const className = recursiveClassName(node);

		const inlineStyle = [
			inlinePositionStyles(node, context.root, context.hideVisibleText),
			inlineLayoutStyles(node, context.frameScale),
			flattenedBoxDeclarations(node, context.frameScale)
		]
			.filter(Boolean)
			.join("");

		return `<${tag} class="${className}"${inlineStyle ? ` style="${inlineStyle}"` : ""}>${childrenHtml}</${tag}>`;
	}

	return renderGenericLeafNode(node);
}

type EnabledFeatures = {
	hasSummary: boolean;
	hasProducts: boolean;
	hasSingleProduct: boolean;
	hasMultiProduct: boolean;
	hasRecommendations: boolean;
	hasEmailInput: boolean;
	hasPhoneInput: boolean;
	hasSurvey: boolean;
	hasCountdown: boolean;
	hasProgress: boolean;
	hasCoupon: boolean;
	hasOptin: boolean;
};

// function detectEnabledFeatures(args: {
// 	hasSummary: boolean;
// 	hasProducts: boolean;
// 	productCardNodes: NormalizedNode[];
// 	runtimeProducts: Array<{ title?: string; subtitle?: string; price?: string; cta?: string }>;
// 	emailInputNodes: NormalizedNode[];
// 	phoneInputNodes: NormalizedNode[];
// 	surveyNodes: NormalizedNode[];
// 	countdownNodes: NormalizedNode[];
// 	progressBarNodes: NormalizedNode[];
// 	copyCouponNodes: NormalizedNode[];
// 	optinNodes: NormalizedNode[];
// }): EnabledFeatures {
// 	const productCount = Math.max(args.productCardNodes.length, args.runtimeProducts.length);

// 	return {
// 		hasSummary: args.hasSummary,
// 		hasProducts: args.hasProducts,
// 		hasSingleProduct: args.hasProducts && productCount === 1,
// 		hasMultiProduct: args.hasProducts && productCount > 1,
// 		hasRecommendations: args.hasProducts && productCount >= 3 && !args.hasSummary,
// 		hasEmailInput: args.emailInputNodes.length > 0,
// 		hasPhoneInput: args.phoneInputNodes.length > 0,
// 		hasSurvey: args.surveyNodes.length > 0,
// 		hasCountdown: args.countdownNodes.length > 0,
// 		hasProgress: args.progressBarNodes.length > 0,
// 		hasCoupon: args.copyCouponNodes.length > 0,
// 		hasOptin: args.optinNodes.length > 0
// 	};
// }
function buildDefaultClickCtaJs(): string {
	return `usi_js.click_cta = function(){
	try {
		usi_js.deep_link();
	} catch(err) {
		usi_commons.report_error(err);
	}
};`;
}
function buildSingleProductJs(): string {
	return `try {
	usi_js.product = {};
	usi_js.product.image = usi_cookies.get("usi_prod_image_1");
	usi_js.product.name = usi_cookies.get("usi_prod_name_1");
	usi_js.product.price = usi_cookies.get("usi_prod_price_1");
	usi_js.product.discount = (Number(usi_js.product.price) * 0.10).toFixed(2);
	usi_js.product.new_price = (Number(usi_js.product.price) - Number(usi_js.product.discount)).toFixed(2);

	if (isNaN(Number(usi_js.product.discount))) throw new Error("discount is NaN");
	if (isNaN(Number(usi_js.product.new_price))) throw new Error("new_price is NaN");
} catch (err) {
	usi_commons.report_error(err);
	usi_js.launch.enabled = false;
	usi_js.launch.suppress = true;
}`;
}
function buildMultiProductSummaryJs(): string {
	return `try {
	usi_js.product = {};
	usi_js.product.subtotal = usi_cookies.get("usi_subtotal");
	usi_js.product.discount = (Number(usi_js.product.subtotal) * 0.15).toFixed(2);
	usi_js.product.new_price = (Number(usi_js.product.subtotal) - Number(usi_js.product.discount)).toFixed(2);

	if (isNaN(Number(usi_js.product.subtotal))) throw new Error("subtotal is NaN");
	if (isNaN(Number(usi_js.product.discount))) throw new Error("discount is NaN");
	if (isNaN(Number(usi_js.product.new_price))) throw new Error("new_price is NaN");
} catch (err) {
	usi_commons.report_error(err);
	usi_js.launch.enabled = false;
	usi_js.launch.suppress = true;
}`;
}
function buildEmailCaptureJs(): string {
	return `usi_js.click_cta = function(){
	try {
		if (usi_js.post_close == usi_js.click_cta) {
			usi_js.post_close = function() {};
		}
		usi_js.deep_link();
	} catch(err) {
		usi_commons.report_error(err);
	}
};

usi_js.submit_success = function() {
	usi_js.post_close = usi_js.click_cta;
};`;
}
function buildPhoneCaptureJs(): string {
	return `usi_js.click_cta = function(){
	try {
		if (usi_js.post_close == usi_js.click_cta) {
			usi_js.post_close = function() {};
		}
		usi_js.deep_link();
	} catch(err) {
		usi_commons.report_error(err);
	}
};

usi_js.submit_success = function() {
	usi_js.phone.send_data();
	usi_js.post_close = usi_js.click_cta;
};

usi_js.post_display = function(){
	if (!usi_js.timers.verify_phone_loop_id) {
		usi_js.timers.verify_phone_loop_id = setTimeout(usi_js.phone.verify_phone_loop, 1000);
	}
};

usi_js.phone = {
	send_data: function(){
		try {
			var chars = "abcdefghjkmnpqrstuvwxyz23456789";
			var string_length = 7;
			var randomstring = '';
			for (var i=0; i<string_length; i++) {
				var rnum = Math.floor(Math.random() * chars.length);
				randomstring += chars.substring(rnum,rnum+1);
			}
			usi_js.send_data("usi_short_code", randomstring);
			usi_js.send_data("usi_phone", document.getElementById("usi_phone").value);
		} catch(err) {
			usi_commons.report_error(err);
		}
	},
	submit: function() {
		try {
			var num = document.getElementById("usi_phone").value.replace(/\\D/g,'');
			if (num.length === 10) {
				usi_js.submit();
			} else {
				alert("Please enter a valid phone number");
			}
		} catch(err) {
			usi_commons.report_error(err);
		}
	},
	format: function(usi_phone){
		try {
			var input = usi_phone.value;
			input = input.replace(/\\D/g,'');
			input = input.substring(0,10);
			var size = input.length;
			if (size == 0){
				input = input;
			} else if (size < 4) {
				input = '('+input;
			} else if (size < 7) {
				input = '('+input.substring(0,3)+') '+input.substring(3,6);
			} else {
				input = '('+input.substring(0,3)+') '+input.substring(3,6)+' - '+input.substring(6,10);
			}
			usi_phone.value = input;
		} catch(err) {
			usi_commons.report_error(err);
		}
	},
	verify_phone_loop: function() {
		try {
			if (document.getElementById("usi_phone") != null) {
				var phoneInput = document.getElementById("usi_phone");
				var phone = phoneInput.value;
				if (usi_js.page_status.phone_last != phone && phone != phoneInput.title) {
					usi_js.page_status.phone_last = phone;
					usi_js.phone.verify_loop_result(usi_js.phone.validate(phone.trim()));
				}
				return;
			}
			setTimeout(usi_js.phone.verify_phone_loop, 1000);
		} catch(err) {
			usi_commons.report_error(err);
		}
	},
	verify_loop_result: function(isokay) {
		try {
			var phoneCheck = document.getElementById("usi_phone_good");
			if (phoneCheck != null) {
				if (!isokay) {
					phoneCheck.src = usi_js.campaign.images + usi_js.display_vars.emailerror;
				} else {
					phoneCheck.src = usi_js.campaign.images + usi_js.display_vars.emailsuccess;
				}
			}
		} catch(err) {
			usi_commons.report_error(err);
		}
	},
	validate: function() {
		return document.getElementById("usi_phone").value.length == 16;
	}
};`;
}
function buildSurveyJs(): string {
	return `usi_js.click_cta = function(){
	try {
		if (usi_js.post_close == usi_js.click_cta) {
			usi_js.post_close = function() {};
		}
		usi_js.deep_link();
	} catch(err) {
		usi_commons.report_error(err);
	}
};

usi_js.submit_success = function() {
	usi_js.post_close = usi_js.click_cta;
};

usi_js.survey_post = function(data) {
	var qs = "?chatID=" + usi_js.campaign.id + "&questionID=" + data.questionID + "&freetype=" + data.freetype;
	qs += "&siteID=" + usi_js.campaign.site_id + "&configurationID=" + usi_js.campaign.config_id;
	qs += "&question=" + encodeURIComponent(encodeURIComponent(data.question));
	qs += "&answer=" + encodeURIComponent(encodeURIComponent(JSON.stringify(data.answer)));
	usi_js.load_js("active/survey_post.jsp" + qs);
};

usi_js.survey_submit = function() {
	try {
		var required_fields_not_answered = document.querySelectorAll('input[name="question1"]:checked').length === 0;
		if (required_fields_not_answered) {
			alert("Please select an answer.");
			return;
		}
		usi_js.survey_post({
			questionID: "1",
			question: "QUESTION_GOES_HERE",
			answer: document.querySelector('input[name="question1"]:checked').value,
			freetype: "0"
		});
		usi_js.load_page(2);
	} catch(err) {
		usi_commons.report_error(err);
	}
};`;
}
function buildCouponJs(): string {
	return `usi_js.promo_callback = function(usi_promo){
	usi_js.trace('promo_callback(' + usi_promo + ')');
	usi_cookies.set("usi_coupon", usi_promo, usi_cookies.expire_time.day, true);
	if (typeof usi_app.cms_client.autoApply != "undefined") {
		usi_app.cms_client.autoApply(usi_js.campaign.coupon, "Auto applied");
	}
	usi_js.link();
};

usi_js.click_cta = function(){
	try {
		if (typeof usi_app.cms_client.autoApply != "undefined") {
			usi_app.cms_client.autoApply(usi_js.campaign.coupon, "Auto applied");
		}
		usi_js.set_coupon();
		usi_js.deep_link();
	} catch(err) {
		usi_commons.report_error(err);
	}
};`;
}
function buildProgressOptinJs(): string {
	return `try {
	usi_js.product = {};
	usi_js.product.total = usi_cookies.get("usi_subtotal");
} catch (err) {
	usi_commons.report_error(err);
	usi_js.launch.enabled = false;
	usi_js.launch.suppress = true;
}

usi_js.threshold = 50;

usi_js.pre_display = function(){
	try {
		var usi_progress_made = document.getElementById("usi_progress_made");
		var usi_togo = document.getElementById("usi_togo");
		var total = String(usi_js.product.total || "").replace("$", "");
		var perc = (total / usi_js.threshold) * 100;
		var togo = Math.max(Math.ceil(usi_js.threshold - total), 0);

		if (usi_progress_made) {
			usi_progress_made.style.width = Math.min(perc, 100) + "%";
			if (togo == 0) {
				usi_progress_made.textContent = "YOU QUALIFY!";
				return true;
			}
		}
		if (usi_togo) usi_togo.textContent = Math.max(Math.ceil(usi_js.threshold - total), 0);
		return true;
	} catch(err) {
		usi_commons.report_error(err);
	}
};

usi_js.click_cta = function(){
	try {
		usi_js.deep_link();
	} catch(err) {
		usi_commons.report_error(err);
	}
};`;
}
// function buildRecommendationJs(): string {
// 	return `usi_js.click_cta = function(product){
// 	try {
// 		usi_js.deep_link_new_window(product.url);
// 	} catch(err) {
// 		usi_commons.report_error(err);
// 	}
// };
// usi_js.display_vars.product_html = \`<div class="usi_products">\`;
// for (var i = 0; i < 3; i++) {
// 	var item = usi_app.product_rec.data[i];
// 	if (item == undefined) {
// 		break;
// 	}
// 	usi_js.display_vars.product_html += \`
// 		<div class="usi_product usi_product\${i}">
// 			<button type="button" onclick="usi_js.click_cta(usi_app.product_rec.data[\${i}]);" class="usi_prod_image_link">
// 				<img src="\${item.image}" border="0" alt="\${usi_js.escape_quotes(item.name)}" class="usi_prod_image" />
// 			</button>
// 			<div class="usi_product_info">
// 				<div class="usi_name">\${item.name}</div>
// 				<div class="usi_price">$\${item.price}</div>
// 				<button type="button" onclick="usi_js.click_cta(usi_app.product_rec.data[\${i}]);" class="usi_link">VIEW ITEM</button>
// 			</div>
// 		</div>
// 	\`;
// }
// usi_js.display_vars.product_html += \`</div>\`;

// usi_js.display_vars.p1_html = \`
// 	<div class="usi_head usi_sr_only">HEADLINE</div>
// 	\${usi_js.display_vars.product_html}
// \`;`;
// }
// function buildAvailabilitySummary(){
// 	return `try {
// 	usi_js.product = {};
	
// 	usi_js.product = usi_app.product;
// 	usi_js.product.usi_pid_required = usi_app.product.pid + "_" + usi_js.campaign.company_id;
// } catch (err) {
// 	usi_commons.report_error(err);
// 	usi_js.launch.enabled = false;
// 	usi_js.launch.suppress = true;
// }`;
// }
// function buildMobilePhone(){
// 	return `usi_js.click_cta = function(){
// 	try {
// 		setTimeout(function(){
// 			usi_js.send_data("usi_short_code", usi_js.short_code);
// 			usi_js.deep_link();
// 		}, 1000);
// 	} catch(err) {
// 		usi_commons.report_error(err);
// 	}
// };
// usi_js.get_random_string = function(){
// 	var chars = "abcdefghjkmnpqrstuvwxyz23456789";
// 	var string_length = 7;
// 	var randomstring = '';
// 	for (var i=0; i<string_length; i++) {
// 		var rnum = Math.floor(Math.random() * chars.length);
// 		randomstring += chars.substring(rnum,rnum+1);
// 	}
// 	return randomstring;
// };
// usi_js.short_code = usi_js.get_random_string();
// usi_js.display_vars.p1_html = \`
// 	<div class="usi_head usi_sr_only">HEADLINE</div>
// 	<a class="usi_submitbutton" onclick="usi_js.click_cta();" href="sms://+18448979384;?&body=encodeURIComponent("Send this text to get your 10% off coupon code and subscribe to other messages from COMPANY_NAME! (ref: "+usi_js.short_code+")"),"alt="Click Here"></a>
// \`;`;
// }
// function buildOther(){
// 	return `usi_js.translations = {
// 	email_alert: "Please enter a valid email address",
// 	email_good: "Valid Email",
// 	email_bad: "Invalid Email",
// 	close_modal: "Close"
// };
// usi_js.products_seen = [];
// usi_js.click_cta = function(){
// 	try {
// 		// load affiliate link from app file on next page load
// 		usi_cookies.set("usi_needs_link", 1);
// 		usi_js.save_link();
// 		usi_app.link_injection(usi_js.campaign.link, function() {
// 			usi_js.link_clicked();
// 		});
// 		if (typeof(usi_app.clicked) !== "undefined") {
// 			usi_app.clicked({
// 				id: usi_js.campaign.id, 
// 				site_id: usi_js.campaign.site_id, 
// 				config_id: usi_js.campaign.config_id, 
// 				clicked_product: product || {}, 
// 				target_product: usi_app.product_rec.pids[0], 
// 				callback: function(){
// 				}
// 			});
// 		}
// 	} catch(err) {
// 		usi_commons.report_error(err);
// 	}
// };
// usi_js.save_link = function () {
// 	try {
// 		usi_cookies.set('usi_delay_click_id', usi_js.campaign.id, usi_js.campaign.sale_window , true);
// 		if (usi_js.campaign.click_cookie != 0) {
// 			usi_cookies.set('usi_launched' + usi_js.campaign.cookie_append, usi_js.campaign.id, usi_js.campaign.click_cookie, true);
// 		}
// 		usi_cookies.set("usi_tracking_link", usi_js.get_deep_link());
// 	} catch(err) {
// 		if (typeof usi_commons !== "undefined") usi_commons.report_error(err);
// 	}
// };
// usi_js.post_display = function(){
// 	if (typeof(usi_app.seen) !== "undefined") {
// 		usi_app.seen({
// 			id: usi_js.campaign.id,
// 			site_id: usi_js.campaign.site_id,
// 			config_id: usi_js.campaign.config_id,
// 			seen_products: usi_js.products_seen || [],
// 			target_product: usi_app.product_rec.pids[0]
// 		});
// 	}
// };
// usi_js.display_vars.p1_html = \`
// 	<div class="usi_head usi_sr_only">HEADLINE</div>
// 	<button class="usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="Redeem Now"></button>
// \`;`;
// }

function buildFeatureJs(features: EnabledFeatures): string {
	const parts: string[] = [];

	if (features.hasSingleProduct && !features.hasSummary) {
		parts.push(buildSingleProductJs());
	}

	if (features.hasMultiProduct && features.hasSummary) {
		parts.push(buildMultiProductSummaryJs());
	}

	if (features.hasCoupon) {
		parts.push(buildCouponJs());
	} else if (features.hasSurvey) {
		parts.push(buildSurveyJs());
	} else if (features.hasPhoneInput) {
		parts.push(buildPhoneCaptureJs());
	} else if (features.hasEmailInput) {
		parts.push(buildEmailCaptureJs());
	} else if (features.hasProgress || features.hasCountdown || features.hasOptin) {
		parts.push(buildProgressOptinJs());
	} else {
		parts.push(buildDefaultClickCtaJs());
	}

	return parts.join("\n\n");
}

export function renderFlattenedHtml(
	root: NormalizedNode,
	analysis: AnalysisResult,
	imageFileName: string,
	hideVisibleText: boolean,
	deliverablesPath = ""
): FlattenedVariant {
	const frameScale = 1;
	const scaledRootWidth = scalePx(root.bounds.width, frameScale) || root.bounds.width;
	const scaledRootHeight = scalePx(root.bounds.height, frameScale) || root.bounds.height;
	const fontFamilies = Array.from(
		new Set(
			flattenTree(root)
				.map(function (node) {
					return String(node.style.fontFamily || "").trim();
				})
				.filter(Boolean)
		)
	);
	const externalFontTags = googleFontHeadTags(fontFamilies);

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
	const cardProductImageNode =
		findDescendantRoleNode(firstProductCard, "image") || findDescendantRoleNode(firstProductCard, "product-image");
	const cardProductTitleNode = findDescendantRoleNode(firstProductCard, "product-title");
	const cardProductPriceNode = findDescendantRoleNode(firstProductCard, "product-price");
	const cardProductButtonNode = findDescendantRoleNode(firstProductCard, "product-cta");

	const standaloneProductImageNode =
		findStandaloneRoleNode(root, "product-image", analysis.productCardNodeIds) ||
		findStandaloneRoleNode(root, "image", analysis.productCardNodeIds);
	const standaloneProductTitleNode = findStandaloneRoleNode(root, "product-title", analysis.productCardNodeIds);
	const standaloneProductSubtitleNode = findStandaloneRoleNode(root, "product-subtitle", analysis.productCardNodeIds);
	const standaloneProductPriceNode = findStandaloneRoleNode(root, "product-price", analysis.productCardNodeIds);
	const standaloneProductButtonNode = findStandaloneRoleNode(root, "product-cta", analysis.productCardNodeIds);

	const productImageNode = cardProductImageNode || standaloneProductImageNode;
	const productTitleNode = cardProductTitleNode || standaloneProductTitleNode;
	const productPriceNode = cardProductPriceNode || standaloneProductPriceNode;
	const productButtonNode = cardProductButtonNode || standaloneProductButtonNode;

	const summarySubtotalNode =
		findDescendantRoleNode(summaryNode, "summary-subtotal") ||
		findStandaloneRoleNode(root, "summary-subtotal", analysis.summaryNodeId ? [analysis.summaryNodeId] : []);
	const summaryDiscountNode =
		findDescendantRoleNode(summaryNode, "summary-discount") ||
		findStandaloneRoleNode(root, "summary-discount", analysis.summaryNodeId ? [analysis.summaryNodeId] : []);
	const summaryTotalNode =
		findDescendantRoleNode(summaryNode, "summary-total") ||
		findStandaloneRoleNode(root, "summary-total", analysis.summaryNodeId ? [analysis.summaryNodeId] : []);

	const standaloneProductBounds = combineBounds([
		standaloneProductImageNode,
		standaloneProductTitleNode,
		standaloneProductSubtitleNode,
		standaloneProductPriceNode,
		standaloneProductButtonNode
	]);
	const productBounds =
		(productContainerNode && productContainerNode.bounds) ||
		buildSyntheticBounds(productCardNodes) ||
		standaloneProductBounds;

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

	const syntheticSummaryBounds = combineBounds([summarySubtotalNode, summaryDiscountNode, summaryTotalNode]);
	const effectiveSummaryNode = summaryNode || syntheticNodeFromBounds("synthetic-summary", syntheticSummaryBounds);
	const summaryTitle = resolveSummaryTitle(summaryNode);

	const hasStandaloneProduct = !!(
		standaloneProductImageNode ||
		standaloneProductTitleNode ||
		standaloneProductSubtitleNode ||
		standaloneProductPriceNode ||
		standaloneProductButtonNode
	);

	const hasProductGrid =
		!!productContainerNode ||
		productCardNodes.length > 1 ||
		(productCardNodes.length === 1 && productCardNodes[0].children.length > 1);
	const hasProducts = hasProductGrid;
	const hasSummary = !!effectiveSummaryNode && !!(summarySubtotalNode || summaryDiscountNode || summaryTotalNode);

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

	const extraHeadlineNodes = topLevelNodes(
		findNodesByRole(root, "headline", 0.35).filter(function (node) {
			return node.id !== analysis.headlineNodeId;
		}),
		root
	);

	const productSubtitleNodes = (function () {
		const subtitles: NormalizedNode[] = [];
		productCardNodes.forEach(function (card) {
			const subtitle = findDescendantRoleNode(card, "product-subtitle");
			if (subtitle) subtitles.push(subtitle);
		});
		if (!subtitles.length && standaloneProductSubtitleNode) {
			subtitles.push(standaloneProductSubtitleNode);
		}
		return subtitles;
	})();

	const productImageNodes =
		productCardNodes.length > 0
			? (productCardNodes
					.map(function (card) {
						return findDescendantRoleNode(card, "product-image") || findDescendantRoleNode(card, "image");
					})
					.filter(Boolean) as NormalizedNode[])
			: standaloneProductImageNode
				? [standaloneProductImageNode]
				: [];

	const standaloneProductData = hasStandaloneProduct
		? [
				{
					title: productTitleNode ? componentText(productTitleNode) : "",
					subtitle: productSubtitleNodes[0] ? componentText(productSubtitleNodes[0]) : "",
					price: productPriceNode ? componentText(productPriceNode) : "",
					cta: productButtonNode ? componentText(productButtonNode) : ""
				}
			]
		: [];
	const runtimeProducts = analysis.schema.products.length > 0 ? analysis.schema.products : standaloneProductData;
	const productGap =
		productCardNodes.length > 1 && productBounds
			? productCardNodes.slice(1).reduce(function (sum, card, index) {
					const previous = productCardNodes[index];
					return sum + Math.max(0, card.bounds.x - (previous.bounds.x + previous.bounds.width));
				}, 0) /
				(productCardNodes.length - 1)
			: 0;
	const gridColumns = Math.max(1, Math.min(productCardNodes.length || runtimeProducts.length || 1, 3));
	const previewProductHtml = generateProductGridHtml(runtimeProducts, false, deliverablesPath);
	const runtimeProductHtmlRaw = generateProductGridHtml(runtimeProducts, true, deliverablesPath);
	const previewSummaryHtml = generateSummaryHtml(hasSummary, summaryTitle, false);
	const runtimeSummaryHtml = generateSummaryHtml(hasSummary, summaryTitle, true);

	const realMediaPanelNodes = mediaPanelNodes.filter(function (node) {
		return !productImageNodes.some(function (pImg) {
			return pImg.id === node.id;
		});
	});

	const allExtraComponentNodes = [
		...extraHeadlineNodes,
		...progressBarNodes,
		...countdownNodes,
		...surveyNodes,
		...emailInputNodes,
		...phoneInputNodes,
		...copyCouponNodes,
		...optinNodes,
		...noThanksNodes,
		...realMediaPanelNodes,
		...disclaimerNodes,
		...dividerNodes
	];

	const extraRenderableNodes = allExtraComponentNodes;

	function isDefined<T>(value: T | null | undefined): value is T {
		return value != null;
	}
	const summaryStandaloneNodes = [summarySubtotalNode, summaryDiscountNode, summaryTotalNode]
		.filter(isDefined)
		.sort(byVisualOrder);

	const productAnchorNode = productContainerNode || firstProductCard;

	const summaryAnchorNode = summaryNode || summaryStandaloneNodes[0];

	const recursiveExcludedIds = new Set<string>(
		[
			closeNode ? closeNode.id : "",
			...(productCardNodes.length > 1
				? productCardNodes.slice(productContainerNode ? 0 : 1).map(function (n) {
						return n.id;
					})
				: []),
			...(summaryNode
				? []
				: summaryStandaloneNodes.slice(summaryAnchorNode ? 1 : 0).map(function (n) {
						return n.id;
					}))
		].filter(Boolean)
	);

	const eyebrowHtml = eyebrowText
		? renderComponentByKey("eyebrow", eyebrowNode, COMPONENT_BY_ID.eyebrow_block, hideVisibleText, {
				text: eyebrowText,
				className: eyebrowClass
			})
		: "";

	const headlineHtml = headlineText
		? renderComponentByKey("headline", headlineNode, COMPONENT_BY_ID.headline_block, hideVisibleText, {
				text: headlineText,
				className: headlineClass
			})
		: "";

	const subtextHtml = subtextText
		? renderComponentByKey("subtext", subtextNode, COMPONENT_BY_ID.subtext_block, hideVisibleText, {
				text: subtextText,
				className: subtextClass
			})
		: "";

	const ctaHtml = renderComponentByKey("primary_button", ctaNode, COMPONENT_BY_ID.primary_button, hideVisibleText, {
		showCtaInVariant,
		ctaLabel,
		ctaInnerHtml
	});

	const explicitOverrideHtmlById = new Map<string, string>();
	if (eyebrowNode && eyebrowHtml) explicitOverrideHtmlById.set(eyebrowNode.id, eyebrowHtml);
	if (headlineNode && headlineHtml) explicitOverrideHtmlById.set(headlineNode.id, headlineHtml);
	if (subtextNode && subtextHtml) explicitOverrideHtmlById.set(subtextNode.id, subtextHtml);
	if (ctaNode && ctaHtml) explicitOverrideHtmlById.set(ctaNode.id, ctaHtml);

	const recursiveContentHtml = root.children
		.map(function (child) {
			return renderRecursiveNode(child, {
				root,
				frameScale,
				hideVisibleText,
				excludedIds: recursiveExcludedIds,
				deliverablesPath,
				productGridAnchorId: hasProducts && productAnchorNode ? productAnchorNode.id : undefined,
				summaryAnchorId: hasSummary && summaryAnchorNode ? summaryAnchorNode.id : undefined,
				productHtml: previewProductHtml,
				summaryHtml: previewSummaryHtml,
				explicitOverrideHtmlById
			});
		})
		.filter(Boolean)
		.join("");

	const contentHTML = `
		${closeNode ? renderComponentByKey("close_control", closeNode, COMPONENT_BY_ID.close_control, hideVisibleText) : ""}
		${recursiveContentHtml}
		${hasProducts && !productAnchorNode ? renderComponentByKey("product_grid", undefined, COMPONENT_BY_ID.product_grid, hideVisibleText, { productHtml: previewProductHtml }) : ""}
		${hasSummary && !summaryAnchorNode ? renderComponentByKey("price_table", undefined, COMPONENT_BY_ID.price_table, hideVisibleText, { summaryHtml: previewSummaryHtml }) : ""}
	`.trim();

	const runtimeContentHTML = `
		${closeNode ? renderComponentByKey("close_control", closeNode, COMPONENT_BY_ID.close_control, hideVisibleText) : ""}
		${root.children
			.map(function (child) {
				return renderRecursiveNode(child, {
					root,
					frameScale,
					hideVisibleText,
					excludedIds: recursiveExcludedIds,
					deliverablesPath,
					productGridAnchorId: hasProducts && productAnchorNode ? productAnchorNode.id : undefined,
					summaryAnchorId: hasSummary && summaryAnchorNode ? summaryAnchorNode.id : undefined,
					productHtml: runtimeProductHtmlRaw,
					summaryHtml: runtimeSummaryHtml,
					explicitOverrideHtmlById
				});
			})
			.filter(Boolean)
			.join("")}
		${hasProducts && !productAnchorNode ? renderComponentByKey("product_grid", undefined, COMPONENT_BY_ID.product_grid, hideVisibleText, { productHtml: runtimeProductHtmlRaw }) : ""}
		${hasSummary && !summaryAnchorNode ? renderComponentByKey("price_table", undefined, COMPONENT_BY_ID.price_table, hideVisibleText, { summaryHtml: runtimeSummaryHtml }) : ""}
	`.trim();

	const htmlDocumentBody = renderComponentByKey("screen", root, undefined, hideVisibleText, {
		contentHtml: contentHTML,
		imageFileName,
		headlineText,
		scaledRootWidth,
		scaledRootHeight
	});

	const textRegionCss = [
		headlineText && headlineNode && mainBounds
			? COMPONENT_RENDERERS.headline.renderCss([headlineNode], root, frameScale, { mainBounds, rootBounds: root.bounds })
			: "",
		eyebrowText && eyebrowNode && mainBounds
			? COMPONENT_RENDERERS.eyebrow.renderCss([eyebrowNode], root, frameScale, { mainBounds, rootBounds: root.bounds })
			: "",
		subtextText && subtextNode && mainBounds
			? COMPONENT_RENDERERS.subtext.renderCss([subtextNode], root, frameScale, { mainBounds, rootBounds: root.bounds })
			: ""
	].join("");

	const rendererNodeMap: Record<string, NormalizedNode[]> = {
		input: [...emailInputNodes, ...phoneInputNodes],
		survey: surveyNodes,
		coupon: copyCouponNodes,
		optin: optinNodes,
		countdown: countdownNodes,
		progress: progressBarNodes,
		media: [...dividerNodes, ...realMediaPanelNodes],
		product_title: hasProducts ? [] : productTitleNode ? [productTitleNode] : [],
		product_subtitle: hasProducts ? [] : productSubtitleNodes,
		product_price: hasProducts ? [] : productPriceNode ? [productPriceNode] : [],
		product_button: hasProducts ? [] : productButtonNode ? [productButtonNode] : [],
		product_image: hasProducts ? [] : productImageNode ? [productImageNode] : [],
		price_subtotal: summarySubtotalNode ? [summarySubtotalNode] : [],
		price_discount: summaryDiscountNode ? [summaryDiscountNode] : [],
		price_total: summaryTotalNode ? [summaryTotalNode] : [],
		disclaimer_text: disclaimerNodes,
		no_thanks_button: noThanksNodes
	};

	if (hasProducts) {
		const syntheticProductGridNode =
			productCardNodes.length === 0 && productBounds
				? syntheticNodeFromBounds("synthetic-product-grid", productBounds)
				: undefined;

		rendererNodeMap.product_grid = productCardNodes.length
			? productCardNodes
			: syntheticProductGridNode
				? [syntheticProductGridNode]
				: [];
	}

	if (hasSummary && effectiveSummaryNode) {
		rendererNodeMap.price_table = [effectiveSummaryNode];
	}

	const groupedExtraComponentNodes = groupNodesByRenderer(extraRenderableNodes);

	Object.keys(groupedExtraComponentNodes).forEach(function (key) {
		if (!rendererNodeMap[key]) rendererNodeMap[key] = [];
		const seen = new Set(
			rendererNodeMap[key].map(function (node) {
				return node.id;
			})
		);
		groupedExtraComponentNodes[key].forEach(function (node) {
			if (!seen.has(node.id)) {
				rendererNodeMap[key].push(node);
			}
		});
	});

	const componentCss = Object.keys(rendererNodeMap)
		.map(function (key) {
			const renderer = COMPONENT_RENDERERS[key];
			const nodes = rendererNodeMap[key];
			if (!renderer || !nodes.length) return "";

			if (key === "product_grid") {
				return renderer.renderCss(nodes, root, frameScale, {
					firstProductCard,
					productImageNode,
					productTitleNode,
					productPriceNode,
					productButtonNode,
					productSubtitleNodes,
					productGap,
					gridColumns,
					productBounds
				});
			}

			if (key === "price_table") {
				return renderer.renderCss(nodes, root, frameScale, {
					summaryNode: effectiveSummaryNode,
					summarySubtotalNode,
					summaryDiscountNode,
					summaryTotalNode
				});
			}

			return renderer.renderCss(nodes, root, frameScale);
		})
		.join("");

	const recursiveCss = root.children
		.map(function (child) {
			return collectRecursiveCss(child, root, frameScale, recursiveExcludedIds);
		})
		.join("");

	const baseCss = [
		COMPONENT_RENDERERS.screen.renderCss([], root, frameScale, {
			scaledRootWidth,
			scaledRootHeight
		}),
		COMPONENT_RENDERERS.close_control.renderCss([], root, frameScale, {
			closeVisualNode,
			closeNode
		}),
		showCtaInVariant ? COMPONENT_RENDERERS.primary_button.renderCss(ctaNode ? [ctaNode] : [], root, frameScale) : ""
	].join("");

	const css = `
${baseCss}
${textRegionCss}
${componentCss}
${recursiveCss}
`.trim();

	const runtimeJs = buildRuntimeJsForAnalysis(analysis);

	const js = `${runtimeJs}

usi_js.display_vars.p1_html = \`
${escapeTemplateString(formatFlattenedHtml(runtimeContentHTML))}
\`;
`;

	const html = `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		${externalFontTags}
		<title>Preview</title>
		<style>
		.usi_display {left:50%;margin-left:-320px;top:0px;width:640px;height:636px;}
		.usi_display * {padding:0 0 0 0;margin:0 0 0 0;color:#000000;font-weight:normal;font-size:12pt;text-decoration:none;line-height:12pt;box-shadow:none;border:none;outline:none;text-align:left;font-family:Helvetica, Arial, sans-serif;float:none;}
		.usi_quickide_css {display:none;visibility:hidden;}
		#usi_close { position:absolute;left:85%;top:0px;width:15%;height:15%;z-index:2000000300;cursor:pointer;border:none;background:none;margin:0;padding:0; }
		button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus { background:none;border:none;cursor:pointer; }
		#usi_content { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000200; }
		#usi_background { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000100; }
		#usi_page { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000150; }
		.usi_sr_only { position:absolute !important; width:1px !important; height:1px !important; padding:0 !important; margin:-1px !important; overflow:hidden !important; clip:rect(0, 0, 0, 0) !important; white-space:nowrap !important; border:0 !important; }
		${css}
		</style>
	</head>
	<body>
		${htmlDocumentBody}
	</body>
</html>
`.trim();

	return {
		html: html,
		css: css,
		imageFileName: imageFileName,
		js: js,
		contentHTML: contentHTML,
		runtimeContentHTML: runtimeContentHTML
	};
}

function detectEnabledFeaturesFromAnalysis(analysis: AnalysisResult): EnabledFeatures {
	const root = analysis.ast;

	const emailInputNodes = findNodesByRole(root, "email-input", 0.35);
	const phoneInputNodes = findNodesByRole(root, "phone-input", 0.35);
	const surveyNodes = findNodesByRole(root, "survey", 0.35);
	const countdownNodes = findNodesByRole(root, "countdown", 0.35);
	const progressBarNodes = findNodesByRole(root, "progress", 0.35);
	const copyCouponNodes = findNodesByRole(root, "copy-coupon", 0.35);
	const optinNodes = findNodesByRole(root, "optin", 0.35);

	const productCount = Math.max(analysis.productCardNodeIds.length, analysis.schema.products.length);

	const hasSummary = !!analysis.schema.summary;
	const hasProducts = !!analysis.productContainerNodeId || analysis.productCardNodeIds.length > 0 || productCount > 0;

	return {
		hasSummary,
		hasProducts,
		hasSingleProduct: hasProducts && productCount === 1,
		hasMultiProduct: hasProducts && productCount > 1,
		hasRecommendations: hasProducts && productCount >= 3 && !hasSummary,
		hasEmailInput: emailInputNodes.length > 0,
		hasPhoneInput: phoneInputNodes.length > 0,
		hasSurvey: surveyNodes.length > 0,
		hasCountdown: countdownNodes.length > 0,
		hasProgress: progressBarNodes.length > 0,
		hasCoupon: copyCouponNodes.length > 0,
		hasOptin: optinNodes.length > 0
	};
}
function buildRuntimeJsForAnalysis(analysis: AnalysisResult): string {
	const features = detectEnabledFeaturesFromAnalysis(analysis);
	const needsPriceRuntime = !!analysis.schema.summary;

	return `${buildPriceRuntimeSetup(needsPriceRuntime)}
${buildFeatureJs(features)}`.trim();
}
export function buildUsiJsFile(
	pages: Array<{ key: string; variant: FlattenedVariant; analysis: AnalysisResult }>
): string {
	const runtimeBlocks = pages
		.map(function (page) {
			return `
${buildRuntimeJsForAnalysis(page.analysis)}
`;
		})
		.join("\n");
/*usi_js.display_vars.${page.key}_css = \` ${escapeTemplateString(page.variant.css)} \`;*/
	const assignments = pages
		.map(function (page) {
			return `usi_js.display_vars.${page.key}_html = \`
${escapeTemplateString(formatFlattenedHtml(page.variant.runtimeContentHTML))}
\`;
`;
		})
		.join("\n");

	return `${runtimeBlocks}

${assignments}
`;
}
