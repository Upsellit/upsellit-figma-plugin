import { MOBILE_WIDTH_THRESHOLD } from '../constants';
import { COMPONENT_ROLE_MAP } from '../constants';
import {
	AnalysisResult,
	AnyNode,
	CTA,
	ComponentTemplateId,
	ExportRole,
	NormalizedNode,
	Product,
	PromoExport,
	Summary,
	SummaryRow,
} from '../types';
import {
	extractNodeStyle,
	extractNodeText,
	getBounds,
	getNodeChildren,
	getPaddingValue,
	getPluginMeta,
	getSizingMode,
} from './export';
import {
	collectText,
	findImageNodeId,
	findNodesByRole,
	flattenTree,
	sortByPosition,
	uniqueIds,
} from '../utils/tree';

export function normalizeRole(value?: string): ExportRole | undefined {
	const normalized = String(value || '').trim().toLowerCase();
	if (!normalized) return undefined;

	const roleMap: Record<string, ExportRole> = {
		'modal-root': 'modal-root',
		content: 'content',
		headline: 'headline',
		subtext: 'subtext',
		eyebrow: 'eyebrow',
		divider: 'divider',
		cta: 'cta',
		'secondary-cta': 'secondary-cta',
		'product-card': 'product-card',
		'product-list': 'product-list',
		'product-image': 'product-image',
		'product-title': 'product-title',
		'product-subtitle': 'product-subtitle',
		'product-price': 'product-price',
		'product-cta': 'product-cta',
		summary: 'summary',
		'summary-subtotal': 'summary-subtotal',
		'summary-discount': 'summary-discount',
		'summary-total': 'summary-total',
		'email-input': 'email-input',
		'phone-input': 'phone-input',
		survey: 'survey',
		'copy-coupon': 'copy-coupon',
		optin: 'optin',
		countdown: 'countdown',
		progress: 'progress',
		disclaimer: 'disclaimer',
		'close-button': 'close-button',
		image: 'image',
		background: 'background',
		ignore: 'ignore',
		other: 'other',
	};

	return roleMap[normalized];
}

export function normalizeComponent(value?: string): ComponentTemplateId | undefined {
	const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
	return normalized ? (normalized as ComponentTemplateId) : undefined;
}

export function normalizeNode(node: AnyNode): NormalizedNode {
	const meta = getPluginMeta(node);
	const ignored = /^(1|true|yes)$/i.test(meta.exportIgnore || '');
	const componentOverride = normalizeComponent(meta.exportComponent);
	const roleOverride =
		normalizeRole(meta.exportRole) || (componentOverride ? COMPONENT_ROLE_MAP[componentOverride] : undefined);
	const children = getNodeChildren(node)
		.filter(function (child: AnyNode) {
			return child && child.visible !== false;
		})
		.map(function (child: AnyNode) {
			return normalizeNode(child);
		});

	return {
		id: String(node.id),
		name: String(node.name || ''),
		type: String(node.type || 'UNKNOWN'),
		visible: node && node.visible !== false,
		ignored: ignored || roleOverride === 'ignore',
		roleOverride: roleOverride,
		componentOverride: componentOverride,
		collection: meta.exportCollection || undefined,
		text: extractNodeText(node),
		bounds: getBounds(node),
		layout: {
			mode: node.layoutMode || 'NONE',
			wrap: !!node.layoutWrap && node.layoutWrap !== 'NO_WRAP',
			positioning: node.layoutPositioning === 'ABSOLUTE' ? 'ABSOLUTE' : 'AUTO',
			gap: typeof node.itemSpacing === 'number' ? node.itemSpacing : 0,
			padding: {
				top: getPaddingValue(node, 'paddingTop'),
				right: getPaddingValue(node, 'paddingRight'),
				bottom: getPaddingValue(node, 'paddingBottom'),
				left: getPaddingValue(node, 'paddingLeft'),
			},
			primaryAlign: String(node.primaryAxisAlignItems || 'MIN'),
			counterAlign: String(node.counterAxisAlignItems || 'MIN'),
			widthMode: getSizingMode(node, 'horizontal'),
			heightMode: getSizingMode(node, 'vertical'),
		},
		style: extractNodeStyle(node),
		children: children,
		detectedRole: roleOverride || 'other',
		roleConfidence: roleOverride ? 1 : 0,
		metadata: meta,
	};
}

function firstNodeText(root: NormalizedNode, role: ExportRole): string | undefined {
	const node = findNodesByRole(root, role, 0)[0];
	return node ? collectText(node) || node.text : undefined;
}

function findProductListContainer(root: NormalizedNode): NormalizedNode | undefined {
	const explicitCollection = flattenTree(root).find(function (node) {
		return !node.ignored && String(node.collection || '').toLowerCase() === 'products';
	});
	if (explicitCollection) return explicitCollection;
	return findNodesByRole(root, 'product-list', 0)[0];
}

function findProductCards(root: NormalizedNode, container?: NormalizedNode): NormalizedNode[] {
	if (container) {
		return sortByPosition(
			flattenTree(container).filter(function (node) {
				return !node.ignored && node.detectedRole === 'product-card';
			})
		);
	}
	return findNodesByRole(root, 'product-card', 0);
}

function collectDynamicNodeIds(root: NormalizedNode): string[] {
	return uniqueIds(
		flattenTree(root)
			.filter(function (node) {
				return [
					'product-card',
					'product-list',
					'product-image',
					'product-title',
					'product-subtitle',
					'product-price',
					'product-cta',
					'summary',
					'summary-subtotal',
					'summary-discount',
					'summary-total',
					'email-input',
					'phone-input',
					'copy-coupon',
					'countdown',
					'progress',
				].includes(node.detectedRole || 'other');
			})
			.map(function (node) {
				return node.id;
			})
	);
}

function parseSummaryText(node: NormalizedNode): Summary | undefined {
	const rows: SummaryRow[] = [];
	const rowNodes = sortByPosition(
		flattenTree(node).filter(function (child) {
			return (
				child.detectedRole === 'summary-subtotal' ||
				child.detectedRole === 'summary-discount' ||
				child.detectedRole === 'summary-total'
			);
		})
	);

	for (let index = 0; index < rowNodes.length; index += 1) {
		const rowNode = rowNodes[index];
		const role = rowNode.detectedRole;
		const text = collectText(rowNode);
		const valueMatch = text.match(/-?\$[\d,.Xx]+/);
		if (role === 'summary-subtotal') rows.push({ label: 'subtotal', value: valueMatch ? valueMatch[0] : text });
		if (role === 'summary-discount') rows.push({ label: 'discount', value: valueMatch ? valueMatch[0] : text });
		if (role === 'summary-total') rows.push({ label: 'total', value: valueMatch ? valueMatch[0] : text });
	}

	if (!rows.length) {
		const text = collectText(node);
		if (/subtotal/i.test(text))
			rows.push({ label: 'subtotal', value: (text.match(/subtotal[^$-]*(-?\$[\d,.Xx]+)/i) || [])[1] });
		if (/discount/i.test(text))
			rows.push({ label: 'discount', value: (text.match(/discount[^$-]*(-?\$[\d,.Xx]+)/i) || [])[1] });
		if (/total/i.test(text))
			rows.push({ label: 'total', value: (text.match(/total[^$-]*(-?\$[\d,.Xx]+)/i) || [])[1] });
	}

	if (!rows.length) return undefined;

	const summary: Summary = { rows: rows };
	for (let index = 0; index < rows.length; index += 1) {
		if (rows[index].label === 'subtotal') summary.subtotal = rows[index].value;
		if (rows[index].label === 'discount') summary.discount = rows[index].value;
		if (rows[index].label === 'total') summary.total = rows[index].value;
	}
	return summary;
}

function findSummaryNode(root: NormalizedNode): NormalizedNode | undefined {
	return findNodesByRole(root, 'summary', 0)[0];
}

function buildSummary(root: NormalizedNode): Summary | undefined {
	const summaryNode = findSummaryNode(root);
	return summaryNode ? parseSummaryText(summaryNode) : undefined;
}

function findPrimaryCtaNode(root: NormalizedNode, productContainer?: NormalizedNode): NormalizedNode | undefined {
	return findNodesByRole(root, 'cta', 0).find(function (node) {
		if (!productContainer) return true;
		return !flattenTree(productContainer).some(function (child) {
			return child.id === node.id;
		});
	});
}

function buildPrimaryCta(root: NormalizedNode, productContainer?: NormalizedNode): CTA | undefined {
	const node = findPrimaryCtaNode(root, productContainer);
	if (!node) return undefined;
	return {
		label: collectText(node) || node.text || 'Continue',
	};
}

function findDisclaimerText(root: NormalizedNode): string | undefined {
	return firstNodeText(root, 'disclaimer');
}

function findDisclaimerNode(root: NormalizedNode): NormalizedNode | undefined {
	return findNodesByRole(root, 'disclaimer', 0)[0];
}

function resolvePattern(root: NormalizedNode, productCount: number, hasSummary: boolean): PromoExport['pattern'] {
	const hasWideProducts = !!findNodesByRole(root, 'product-list', 0)[0];
	if (hasSummary && productCount > 0) return 'cart_recovery_split';
	if (productCount > 1 && hasWideProducts) return 'grid';
	return productCount > 1 ? 'carousel' : 'single';
}

function collectWarnings(): string[] {
	const warnings: string[] = [];
	return warnings;
}

function buildProduct(card: NormalizedNode): Product {
	const descendants = flattenTree(card);
	const titleNode = descendants.find(function (node) {
		return node.detectedRole === 'product-title';
	});
	const subtitleNode = descendants.find(function (node) {
		return node.detectedRole === 'product-subtitle';
	});
	const priceNode = descendants.find(function (node) {
		return node.detectedRole === 'product-price';
	});
	const ctaNode = descendants.find(function (node) {
		return node.detectedRole === 'product-cta';
	});

	return {
		title: titleNode ? collectText(titleNode) : undefined,
		subtitle: subtitleNode ? collectText(subtitleNode) : undefined,
		price: priceNode ? collectText(priceNode) : undefined,
		cta: ctaNode ? collectText(ctaNode) : undefined,
		imageAlt: titleNode ? collectText(titleNode) : 'Product image',
		_imageNodeId: findImageNodeId(card),
	};
}

export function analyzeSelection(rootNode: AnyNode): AnalysisResult {
	const ast = normalizeNode(rootNode);
	const roleMap: Record<string, { role: ExportRole; confidence: number }> = {};
	const nodes = flattenTree(ast);

	for (let index = 0; index < nodes.length; index += 1) {
		const node = nodes[index];
		roleMap[node.id] = {
			role: node.detectedRole || 'other',
			confidence: node.detectedRole && node.detectedRole !== 'other' ? 1 : 0,
		};
	}

	const productContainer = findProductListContainer(ast);
	const productCards = findProductCards(ast, productContainer);
	const summaryNode = findSummaryNode(ast);
	const primaryCtaNode = findPrimaryCtaNode(ast, productContainer);
	const disclaimerNode = findDisclaimerNode(ast);
	const headlineNode = findNodesByRole(ast, 'headline', 0)[0];
	const subtextNode = findNodesByRole(ast, 'subtext', 0)[0];
	const eyebrowNode = findNodesByRole(ast, 'eyebrow', 0)[0];

	const products = productCards.map(buildProduct);
	const summary = buildSummary(ast);

	const schema: PromoExport = {
		pattern: resolvePattern(ast, products.length, !!summary),
		layout: ast.bounds.width < MOBILE_WIDTH_THRESHOLD ? 'mobile' : 'desktop',
		headline: headlineNode ? collectText(headlineNode) : undefined,
		subtext: subtextNode ? collectText(subtextNode) : undefined,
		eyebrow: eyebrowNode ? collectText(eyebrowNode) : undefined,
		closeButton: !!findNodesByRole(ast, 'close-button', 0)[0],
		products: products,
		summary: summary,
		primaryCta: buildPrimaryCta(ast, productContainer),
		disclaimer: findDisclaimerText(ast),
	};

	return {
		ast: ast,
		schema: schema,
		report: {
			pattern: schema.pattern,
			warnings: collectWarnings(),
		},
		roleMap: roleMap,
		dynamicNodeIds: collectDynamicNodeIds(ast),
		headlineNodeId: headlineNode ? headlineNode.id : undefined,
		subtextNodeId: subtextNode ? subtextNode.id : undefined,
		eyebrowNodeId: eyebrowNode ? eyebrowNode.id : undefined,
		summaryNodeId: summaryNode ? summaryNode.id : undefined,
		productContainerNodeId: productContainer ? productContainer.id : undefined,
		productCardNodeIds: productCards.map(function (card) {
			return card.id;
		}),
		primaryCtaNodeId: primaryCtaNode ? primaryCtaNode.id : undefined,
		disclaimerNodeId: disclaimerNode ? disclaimerNode.id : undefined,
	};
}
