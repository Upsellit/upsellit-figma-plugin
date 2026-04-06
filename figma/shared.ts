import { COMPONENT_ROLE_MAP } from '../constants';
import { AnyNode, ComponentTemplateId, NormalizedNode } from '../types';

export function makeSolidFill(hex: string): SolidPaint {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map(function (part) { return part + part; }).join('')
    : normalized;
  return {
    type: 'SOLID',
    color: {
      r: parseInt(expanded.slice(0, 2), 16) / 255,
      g: parseInt(expanded.slice(2, 4), 16) / 255,
      b: parseInt(expanded.slice(4, 6), 16) / 255,
    },
  };
}

export async function loadTextNodeFont(textNode: TextNode): Promise<void> {
  const fontName = textNode.fontName;
  if (fontName && fontName !== figma.mixed && typeof fontName === 'object') {
    await figma.loadFontAsync(fontName as FontName);
  }
}

export function centerInViewport(node: SceneNode): void {
  const viewport = figma.viewport.center;
  node.x = viewport.x - node.width / 2;
  node.y = viewport.y - node.height / 2;
}

export function supportsChildren(node: BaseNode | null | undefined): node is (BaseNode & ChildrenMixin) {
  return !!node && 'appendChild' in node && typeof (node as ChildrenMixin).appendChild === 'function';
}

export function positionNearReference(node: SceneNode, reference: SceneNode): void {
  node.x = reference.x;
  node.y = reference.y + reference.height + 24;
}

export function isPageNode(node: BaseNode | null | undefined): node is PageNode {
  return !!node && node.type === 'PAGE';
}

export function getNodeChildren(node: AnyNode): AnyNode[] {
  if (!node || !('children' in node) || !Array.isArray(node.children)) return [];
  return node.children as AnyNode[];
}

export function getPluginMeta(node: AnyNode): NormalizedNode['metadata'] {
  const getData =
    node && typeof node.getPluginData === 'function'
      ? (key: string) => String(node.getPluginData(key) || '').trim()
      : (_key: string) => '';

  return {
    exportRole: getData('exportRole') || undefined,
    exportComponent: getData('exportComponent') || undefined,
    exportCollection: getData('exportCollection') || undefined,
    exportIgnore: getData('exportIgnore') || undefined,
  };
}

export function setPluginMeta(
  node: AnyNode,
  meta: { exportRole?: string; exportComponent?: string; exportCollection?: string; exportIgnore?: string }
): void {
  if (!node || typeof node.setPluginData !== 'function') return;
  node.setPluginData('exportRole', String(meta.exportRole || ''));
  node.setPluginData('exportComponent', String(meta.exportComponent || ''));
  node.setPluginData('exportCollection', String(meta.exportCollection || ''));
  node.setPluginData('exportIgnore', String(meta.exportIgnore || ''));
}

export function applyComponentMeta(node: BaseNode, componentId: string): void {
  const role = COMPONENT_ROLE_MAP[componentId as ComponentTemplateId];
  setPluginMeta(node as AnyNode, {
    exportComponent: componentId,
    exportRole: role,
  });
}
