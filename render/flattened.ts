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
import {
	collectText,
	findImageNodeId,
	findNodesByRole,
	findNormalizedNodeById,
	flattenTree,
	pickBestNode
} from "../utils/tree";

const PRODUCT_PLACEHOLDER_IMAGE = "https://placehold.co/600x400/EEE/31343C";

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
		renderHtml: (_node, definition) => {
			if (!definition) return "";
			const tag = definition.render.htmlTag;
			const className = definition.render.className;
			if (tag === "hr") {
				return `<hr class="${className}" />`;
			}
			return `<div class="${className}" aria-hidden="true"></div>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					if (!definition) return "";
					return `
.${definition.render.className} {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	margin: 0;
	${flattenedBoxDeclarations(node, frameScale)}
}
`;
				})
				.join("");
		},
		shouldRender: () => true
	},

	input: {
		renderHtml: (node, definition, hideVisibleText) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			const placeholder = hideVisibleText ? "" : escapeHtml(text);
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
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_field_input {
	width: 100%;
	padding: 0.875em 1em;
	border: 1px solid #d0d0d0;
	background: #fff;
	color: #111;
	${node.style.borderRadius != null ? "border-radius: " + String(node.style.borderRadius) + "px;" : ""}
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
					return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-direction: column;
	gap: 0.75em;
	${flattenedBoxDeclarations(node, frameScale)}
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
			const childrenText = node.children
				.map(function (child) {
					return componentText(child);
				})
				.filter(Boolean);
			const code =
				childrenText[0] || componentText(node, definition) || definition.render.fallbackText || "SAVE15";
			const label = childrenText[1] || definition.render.buttonText || "Copy Code";
			return `
				<section class="${definition.render.className}">
					<div class="usi_coupon_code">${escapeHtml(code)}</div>
					<button class="usi_coupon_button" type="button">${escapeHtml(label)}</button>
				</section>
			`.trim();
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			return nodes
				.map(function (node) {
					const definition = componentDefinitionForNode(node);
					const className = definition ? definition.render.className : "usi_coupon";
					const buttonNode = node.children[1];
					return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-wrap: wrap;
	gap: 0.75em;
	align-items: center;
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_coupon_code {
	padding: 0.75em 1em;
	border: 1px solid #222;
	background: #fff;
	font-weight: 700;
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
					return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: flex;
	gap: 0.625em;
	align-items: center;
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_optin_input {
	appearance: none;
	-webkit-appearance: none;
	width: 1.125em;
	height: 1.125em;
	border: 1px solid currentColor;
	background: #fff;
	flex: 0 0 auto;
}

${htmlToCssClassName(className)} .usi_optin_label {
	display: inline-block;
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
					return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	padding: 0.625em 0.875em;
	${flattenedBoxDeclarations(node, frameScale)}
	font-weight: 700;
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
					return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	height: 0.75em;
	${flattenedBoxDeclarations(node, frameScale)}
	border-radius: 999px;
	overflow: hidden;
}

${htmlToCssClassName(className)} .usi_progress_fill {
	width: 55%;
	height: 100%;
	background: #222;
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
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
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
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
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
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
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
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
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
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
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
			return `
.usi_products {
	position: absolute;
	left: ${productBounds ? toPercent(productBounds.x - root.bounds.x, root.bounds.width) : "12%"};
	top: ${productBounds ? toPercent(productBounds.y - root.bounds.y, root.bounds.height) : "59%"};
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
}

.usi_product {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 0.75em;
	padding: 0.9em;
	width: ${
		firstCardWidth && productBounds && gridColumns && gridColumns > 1
			? toPercent(firstCardWidth, productBounds.width)
			: "100%"
	};
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

.usi_product_image {
	position: relative;
	display: block;
	width: 100%;
	min-width: 0;
	overflow: hidden;
	${imageAspectRatio ? `aspect-ratio: ${imageAspectRatio};` : ""}
	${
		flattenedBoxDeclarations(productImageNode, frameScale, {
			width: "100%",
			position: "relative",
			left: undefined,
			top: undefined
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
	white-space: normal;
	word-break: break-word;
	${
		flattenedTextDeclarations(productTitleNode, frameScale, {
			"white-space": "normal",
			"background-color": "transparent",
			border: "none"
		}) || "font-weight: 700;"
	}
}

.usi_product_subtitle {
	margin: 0;
	word-break: break-word;
	${productSubtitleNodes && productSubtitleNodes[0] ? flattenedTextDeclarations(productSubtitleNodes[0], frameScale) : "color: #666;"}
}

.usi_product_price {
	margin: 0;
	word-break: break-word;
	${flattenedTextDeclarations(productPriceNode, frameScale) || ""}
}

.usi_product_cta {
	position: static;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	max-width: 100%;
	align-self: flex-start;
	width: auto;
	max-width: 100%;
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

			return `
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
			return `
.usi_secondary_cta {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${flattenedBoxDeclarations(node, frameScale)}
}
`;
		},
		shouldRender: (root) => findNodesByRole(root, "secondary-cta", 0.35).length > 0
	},

	disclaimer_text: {
		renderHtml: (node, definition) => {
			if (!node || !definition) return "";
			const text = componentText(node, definition);
			const className = definition.render.className;
			return `<p class="${className}">${escapeHtml(text)}</p>`;
		},
		renderCss: (nodes, root, frameScale) => {
			if (!nodes.length) return "";
			const node = nodes[0];
			return `
.usi_disclaimer {
	position: absolute;
	left: ${toPercent(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${toPercent(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${toPercent(node.bounds.width, root.bounds.width)};
	margin: 0;
	font-size: 0.875em;
	line-height: 1.4;
	${flattenedTextDeclarations(node, frameScale)}
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
			const mainBounds = context ? (context.mainBounds as NodeBounds | undefined) : undefined;
			const node = nodes[0];
			if (!mainBounds) return "";
			return `
.usi_headline {
	position: absolute;
	left: ${toPercent(node.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${toPercent(node.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${toPercent(node.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap" })}
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
			const mainBounds = context ? (context.mainBounds as NodeBounds | undefined) : undefined;
			const node = nodes[0];
			if (!mainBounds) return "";
			return `
.usi_eyebrow {
	position: absolute;
	left: ${toPercent(node.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${toPercent(node.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${toPercent(node.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap" })}
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
			const mainBounds = context ? (context.mainBounds as NodeBounds | undefined) : undefined;
			const node = nodes[0];
			if (!mainBounds) return "";
			return `
.usi_subtext {
	position: absolute;
	left: ${toPercent(node.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${toPercent(node.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${toPercent(node.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap" })}
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
	position: absolute;
	left: ${node ? toPercent(node.bounds.x - root.bounds.x, root.bounds.width) : "12%"};
	top: ${node ? toPercent(node.bounds.y - root.bounds.y, root.bounds.height) : "77%"};
	width: ${node ? toPercent(node.bounds.width, root.bounds.width) : "76%"};
	min-height: ${node ? toPercent(node.bounds.height, root.bounds.height) : "15.5%"};
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
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
	${flattenedBoxDeclarations(node, frameScale, { background: "none", border: "none" }) || "background:none;border:none;"}
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
`;
		},
		shouldRender: () => true
	},

	content_layout: {
		renderHtml: (_node, _definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const eyebrowHtml = String((context && context.eyebrowHtml) || "");
			const headlineHtml = String((context && context.headlineHtml) || "");
			const subtextHtml = String((context && context.subtextHtml) || "");
			const ctaHtml = String((context && context.ctaHtml) || "");
			const flattenedExtraMainHtml = String((context && context.flattenedExtraMainHtml) || "");
			const flattenedExtraUtilityHtml = String((context && context.flattenedExtraUtilityHtml) || "");
			const extraComponentsHtml = String((context && context.extraComponentsHtml) || "");
			return `
<section class="usi_main">
	${eyebrowHtml}
	${headlineHtml}
	${subtextHtml}
	${ctaHtml}
	${flattenedExtraMainHtml}
	${flattenedExtraUtilityHtml}
	${extraComponentsHtml}
</section>
			`.trim();
		},
		renderCss: (_nodes, root, _frameScale, context?: Record<string, unknown>) => {
			const hasProducts = !!(context && context.hasProducts);
			const hasSummary = !!(context && context.hasSummary);
			const mainBounds = context ? (context.mainBounds as NodeBounds | undefined) : undefined;

			const left =
				hasProducts || hasSummary
					? mainBounds
						? toPercent(mainBounds.x - root.bounds.x, root.bounds.width)
						: "0%"
					: "0%";
			const top =
				hasProducts || hasSummary
					? mainBounds
						? toPercent(mainBounds.y - root.bounds.y, root.bounds.height)
						: "0%"
					: "0%";
			const width =
				hasProducts || hasSummary
					? mainBounds
						? toPercent(mainBounds.width, root.bounds.width)
						: "100%"
					: "100%";
			const height =
				!hasProducts && !hasSummary
					? "100%"
					: mainBounds
						? toPercent(mainBounds.height, root.bounds.height)
						: "100%";
			return `
.usi_main {	
    position: relative;
    height: 100%;
	/*position: absolute;*/
	/*left: ${left};*/
	/*top: ${top};*/
	/*width: ${width};*/
	/*height: ${height};*/
	min-width: 0;
	box-sizing: border-box;
	display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}
`;
		},
		shouldRender: () => true
	},

	aside_layout: {
		renderHtml: (_node, _definition, _hideVisibleText, context?: Record<string, unknown>) => {
			const hasProducts = !!(context && context.hasProducts);
			const flattenedExtraAsideHtml = String((context && context.flattenedExtraAsideHtml) || "");
			const productHtml = String((context && context.productHtml) || "");
			if (!hasProducts && !flattenedExtraAsideHtml) return "";
			return `
	${hasProducts ? productHtml : ""}
	${flattenedExtraAsideHtml}
			`.trim();
		},
		renderCss: () => "",
		shouldRender: () => true
	}
};

function generateProductGridHtml(
	products: Array<{ title?: string; subtitle?: string; price?: string; cta?: string }>,
	hideVisibleText: boolean
): string {
	if (!products.length) return "";

	return products
		.map(function (product, index) {
			const fallbackTitle = escapeHtml(product.title || "");
			const fallbackSubtitle = escapeHtml(product.subtitle || "");
			const fallbackPrice = escapeHtml(product.price || "");
			const fallbackButton = escapeHtml(product.cta || "");

			const hasMeaningfulContent = !!fallbackSubtitle || !!fallbackPrice || !!fallbackButton;

			if (!hasMeaningfulContent) return "";

			return `
				<article class="usi_product_card usi_product usi_product${index + 1}">
					${
						!hideVisibleText
							? `<div class="usi_product_image">
								<img
									src="\${usi_cookies.get('usi_prod_image_${index + 1}') || '${PRODUCT_PLACEHOLDER_IMAGE}'}"
									alt="\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitle || "Product"}')}"
								/>
							</div>`
							: ""
					}
					<div class="usi_product_body">
						<h3 class="usi_product_title">\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitle}')}</h3>
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

function renderExplicitComponentNode(node: NormalizedNode, hideVisibleText: boolean): string {
	const definition = componentDefinitionForNode(node);
	if (!definition) return "";

	const idRenderer = COMPONENT_RENDERERS[definition.id];
	if (idRenderer) {
		return idRenderer.renderHtml(node, definition, hideVisibleText);
	}

	const kind = definition.render.kind;
	const renderer = COMPONENT_RENDERERS[kind];

	if (renderer) {
		return renderer.renderHtml(node, definition, hideVisibleText);
	}

	const tag = definition.render.htmlTag;
	const className = definition.render.className;
	const text = componentText(node, definition);
	return `<${tag} class="${className}">${escapeHtml(text)}</${tag}>`;
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
	return COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || "other"];
}

function componentText(node: NormalizedNode, definition?: CommonComponentDefinition): string {
	const text = collectText(node) || node.text || node.name || "";
	if (text) return text;
	return definition && definition.render.fallbackText ? definition.render.fallbackText : "";
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

// --- Standalone role detection helpers ---

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

	// Step 3: Detect standalone product nodes
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

	// Step 6: Relax hasProducts and hasSummary
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
	const hasProducts = (!!productCardNodes.length && !!productBounds) || (!!hasStandaloneProduct && !!productBounds);
	const hasSummary = !!effectiveSummaryNode && !!(summarySubtotalNode || summaryDiscountNode || summaryTotalNode);

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

	// Step 11: Extra headline nodes
	const extraHeadlineNodes = topLevelNodes(
		findNodesByRole(root, "headline", 0.35).filter(function (node) {
			return node.id !== analysis.headlineNodeId;
		}),
		root
	);

	// Step 4: Detect standalone subtitle nodes
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

	// Step 5: Detect standalone product images
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

	const summarySubtotalNodes = summaryNode ? findNodesByRole(summaryNode, "summary-subtotal", 0.35) : [];
	const summaryDiscountNodes = summaryNode ? findNodesByRole(summaryNode, "summary-discount", 0.35) : [];
	const summaryTotalNodes = summaryNode ? findNodesByRole(summaryNode, "summary-total", 0.35) : [];

	// Step 7: Generate product HTML for standalone product layouts
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
	const runtimeProductHtmlRaw = generateProductGridHtml(runtimeProducts, hideVisibleText);
	const runtimeSummaryHtml = generateSummaryHtml(hasSummary, summaryTitle, true);

	// Step 9: Keep standalone product nodes out of extra rendering duplication
	const extraComponentExcludedIds = [
		analysis.summaryNodeId,
		...analysis.productCardNodeIds,
		productImageNode ? productImageNode.id : "",
		productTitleNode ? productTitleNode.id : "",
		productPriceNode ? productPriceNode.id : "",
		productButtonNode ? productButtonNode.id : "",
		...productImageNodes.map(function (n) {
			return n.id;
		}),
		...productSubtitleNodes.map(function (n) {
			return n.id;
		}),
		summarySubtotalNode ? summarySubtotalNode.id : "",
		summaryDiscountNode ? summaryDiscountNode.id : "",
		summaryTotalNode ? summaryTotalNode.id : "",
		...summarySubtotalNodes.map(function (n) {
			return n.id;
		}),
		...summaryDiscountNodes.map(function (n) {
			return n.id;
		}),
		...summaryTotalNodes.map(function (n) {
			return n.id;
		})
	].filter(Boolean) as string[];

	const realMediaPanelNodes = mediaPanelNodes.filter(function (node) {
		return !productImageNodes.some(function (pImg) {
			return pImg.id === node.id;
		});
	});

	// Step 11: Include extra headline nodes in allExtraComponentNodes
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
	].filter(function (node) {
		return !extraComponentExcludedIds.includes(node.id);
	});

	const extraRenderableNodes = allExtraComponentNodes.filter(function (node) {
		const definition = componentDefinitionForNode(node);
		if (hideVisibleText && definition && definition.render && definition.render.kind === "media") {
			const tag = definition.render.htmlTag;
			if (tag !== "hr") return false;
		}
		return true;
	});

	const extraComponentsHtml = extraRenderableNodes
		.map(function (node) {
			return renderExplicitComponentNode(node, hideVisibleText);
		})
		.join("");

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

	const mainSectionHtml = renderComponentByKey("content_layout", undefined, undefined, hideVisibleText, {
		eyebrowHtml,
		headlineHtml,
		subtextHtml,
		ctaHtml,
		flattenedExtraMainHtml,
		flattenedExtraUtilityHtml,
		extraComponentsHtml
	});

	const runtimeProductsSectionHtml = hasProducts
		? renderComponentByKey(
				"product_grid",
				productContainerNode || firstProductCard,
				COMPONENT_BY_ID.product_grid,
				hideVisibleText,
				{ productHtml: runtimeProductHtmlRaw }
			)
		: "";

	const runtimeAsideHtml = renderComponentByKey("aside_layout", undefined, undefined, hideVisibleText, {
		hasProducts,
		flattenedExtraAsideHtml,
		productHtml: runtimeProductsSectionHtml
	});

	// Step 8: Use effectiveSummaryNode
	const runtimeSummarySectionHtml =
		hasSummary && effectiveSummaryNode
			? renderComponentByKey("price_table", effectiveSummaryNode, COMPONENT_BY_ID.price_table, hideVisibleText, {
					summaryHtml: runtimeSummaryHtml
				})
			: "";

	const contentHTML = `
		${closeNode ? renderComponentByKey("close_control", closeNode, COMPONENT_BY_ID.close_control, hideVisibleText) : ""}
		${mainSectionHtml}
		${runtimeAsideHtml.trim() ? runtimeAsideHtml : ""}
		${runtimeSummarySectionHtml}
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
			? COMPONENT_RENDERERS.headline.renderCss([headlineNode], root, frameScale, { mainBounds })
			: "",
		eyebrowText && eyebrowNode && mainBounds
			? COMPONENT_RENDERERS.eyebrow.renderCss([eyebrowNode], root, frameScale, { mainBounds })
			: "",
		subtextText && subtextNode && mainBounds
			? COMPONENT_RENDERERS.subtext.renderCss([subtextNode], root, frameScale, { mainBounds })
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

	// Step 8: Use effectiveSummaryNode
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

			// Step 8: Use effectiveSummaryNode in price_table CSS context
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

	const baseCss = [
		COMPONENT_RENDERERS.screen.renderCss([], root, frameScale, {
			scaledRootWidth,
			scaledRootHeight
		}),
		COMPONENT_RENDERERS.close_control.renderCss([], root, frameScale, {
			closeVisualNode,
			closeNode
		}),
		COMPONENT_RENDERERS.content_layout.renderCss([], root, frameScale, {
			hasProducts,
			hasSummary,
			mainBounds
		}),
		showCtaInVariant ? COMPONENT_RENDERERS.primary_button.renderCss(ctaNode ? [ctaNode] : [], root, frameScale) : ""
	].join("");

	const css = `
${baseCss}
${textRegionCss}
${componentCss}
`.trim();

	const js = `${buildPriceRuntimeSetup(hasSummary)}usi_js.click_cta = () => {
	try {
		usi_js.deep_link();
	} catch (err) {
		usi_commons.report_error(err);
	}
};

usi_js.display_vars.p1_html = \`
${escapeTemplateString(formatFlattenedHtml(contentHTML))}
\`;
`;

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
		contentHTML: contentHTML
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
${escapeTemplateString(formatFlattenedHtml(page.variant.contentHTML))}
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
