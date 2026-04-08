import { ExportRole, NormalizedNode } from '../types';

export function flattenTree(root: NormalizedNode): NormalizedNode[] {
	const out: NormalizedNode[] = [];
	(function walk(node: NormalizedNode) {
		out.push(node);
		for (let index = 0; index < node.children.length; index += 1) {
			walk(node.children[index]);
		}
	})(root);
	return out;
}

export function collectText(node: NormalizedNode): string {
	const parts: string[] = [];
	if (node.text) parts.push(node.text);
	for (let index = 0; index < node.children.length; index += 1) {
		const childText = collectText(node.children[index]);
		if (childText) parts.push(childText);
	}
	return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function sortByPosition(nodes: NormalizedNode[]): NormalizedNode[] {
	return nodes.slice().sort(function (a, b) {
		if (Math.abs(a.bounds.y - b.bounds.y) > 2) return a.bounds.y - b.bounds.y;
		if (Math.abs(a.bounds.x - b.bounds.x) > 2) return a.bounds.x - b.bounds.x;
		return a.name.localeCompare(b.name);
	});
}

export function pickBestNode(nodes: NormalizedNode[]): NormalizedNode | undefined {
	return nodes[0];
}

export function findNodesByRole(root: NormalizedNode, role: ExportRole, minimumConfidence = 0): NormalizedNode[] {
	return sortByPosition(
		flattenTree(root).filter(function (node) {
			return !node.ignored && node.detectedRole === role && (node.roleConfidence || 0) >= minimumConfidence;
		})
	);
}

export function findNormalizedNodeById(root: NormalizedNode, id?: string): NormalizedNode | undefined {
	if (!id) return undefined;
	return flattenTree(root).find(function (node) {
		return node.id === id;
	});
}

export function findImageNodeId(card: NormalizedNode): string | undefined {
	const imageNode = flattenTree(card).find(function (node) {
		return node.detectedRole === 'product-image' || node.detectedRole === 'image';
	});
	return imageNode ? imageNode.id : undefined;
}

export function uniqueIds(ids: string[]): string[] {
	return Array.from(new Set(ids.filter(Boolean)));
}
