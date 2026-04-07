/* eslint-disable @typescript-eslint/no-explicit-any */

import { AnyNode, ExportFile, NodeBounds, NodeStyle, SizingMode, NormalizedNode } from '../types';
import { sanitizeFilePart } from '../utils/string';
import { getNodeChildren, getPluginMeta, setPluginMeta } from './shared';
import { flattenTree, normalizeNode } from '../analysis/index';

export function getYearMonth(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return yy + '-' + mm;
}

export function buildExportBaseName(frame: AnyNode): string {
  const fileName = sanitizeFilePart(figma.root && figma.root.name ? figma.root.name : 'figma-file');
  const frameName = sanitizeFilePart(frame && frame.name ? frame.name : 'selection');
  return fileName + '_' + frameName + '_' + getYearMonth();
}

export function paintToCss(paint: AnyNode): string | undefined {
  if (!paint || paint.visible === false) return undefined;
  if (paint.type !== 'SOLID') return undefined;

  const alpha = paint.opacity == null ? 1 : paint.opacity;
  const color = paint.color || { r: 0, g: 0, b: 0 };
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);

  if (alpha >= 0.999) return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

export function firstVisiblePaint(paints: readonly Paint[] | symbol | undefined): AnyNode {
  if (!Array.isArray(paints)) return null;
  return paints.find(function (paint) {
    return paint && paint.visible !== false;
  }) as AnyNode;
}

export function getBounds(node: AnyNode): NodeBounds {
  const box = node && node.absoluteBoundingBox ? node.absoluteBoundingBox : null;
  return {
    x: box && typeof box.x === 'number' ? box.x : node && typeof node.x === 'number' ? node.x : 0,
    y: box && typeof box.y === 'number' ? box.y : node && typeof node.y === 'number' ? node.y : 0,
    width:
      box && typeof box.width === 'number'
        ? box.width
        : node && typeof node.width === 'number'
          ? node.width
          : 0,
    height:
      box && typeof box.height === 'number'
        ? box.height
        : node && typeof node.height === 'number'
          ? node.height
          : 0,
  };
}

export function getPaddingValue(node: AnyNode, key: string): number {
  const value = node ? node[key] : undefined;
  return typeof value === 'number' ? value : 0;
}

export function getSizingMode(node: AnyNode, axis: 'horizontal' | 'vertical'): SizingMode {
  const modeKey = axis === 'horizontal' ? 'layoutSizingHorizontal' : 'layoutSizingVertical';
  const legacyKey = axis === 'horizontal' ? 'primaryAxisSizingMode' : 'counterAxisSizingMode';
  const mode = node ? node[modeKey] || node[legacyKey] : undefined;

  if (mode === 'HUG' || mode === 'AUTO') return 'HUG';
  if (mode === 'FILL') return 'FILL';
  if (mode === 'FIXED') return 'FIXED';
  return 'AUTO';
}

export function extractTextStyle(node: AnyNode): Partial<NodeStyle> {
  if (node.type !== 'TEXT') return {};

  let fontWeight: number | undefined;
  const fontName = node.fontName;
  if (fontName && fontName !== figma.mixed && typeof fontName === 'object') {
    const styleName = String(fontName.style || '').toLowerCase();
    if (/black|heavy|extrabold/.test(styleName)) fontWeight = 800;
    else if (/bold|semibold|demibold/.test(styleName)) fontWeight = 700;
    else if (/medium/.test(styleName)) fontWeight = 500;
    else fontWeight = 400;
  }

  const fills = node.fills;
  const paint = fills !== figma.mixed ? firstVisiblePaint(fills) : null;
  const color = paintToCss(paint);

  const lineHeightValue =
    node.lineHeight && node.lineHeight !== figma.mixed
      ? node.lineHeight.unit === 'PIXELS'
        ? node.lineHeight.value
        : undefined
      : undefined;

  const letterSpacingValue =
    node.letterSpacing && node.letterSpacing !== figma.mixed
      ? node.letterSpacing.unit === 'PIXELS'
        ? node.letterSpacing.value
        : undefined
      : undefined;

  return {
    color: color,
    fontFamily:
      fontName && fontName !== figma.mixed && typeof fontName === 'object'
        ? String(fontName.family || '')
        : undefined,
    fontStyle:
      fontName && fontName !== figma.mixed && typeof fontName === 'object'
        ? /italic/i.test(String(fontName.style || ''))
          ? 'italic'
          : 'normal'
        : undefined,
    fontSize: typeof node.fontSize === 'number' ? node.fontSize : undefined,
    fontWeight: fontWeight,
    lineHeight: lineHeightValue,
    textAlign: node.textAlignHorizontal ? String(node.textAlignHorizontal).toLowerCase() : undefined,
    letterSpacing: letterSpacingValue,
    textCase: node.textCase ? String(node.textCase).toLowerCase() : undefined,
  };
}

export function extractNodeStyle(node: AnyNode): NodeStyle {
  const fills = node.fills !== figma.mixed ? node.fills : undefined;
  const strokes = node.strokes !== figma.mixed ? node.strokes : undefined;
  const fill = firstVisiblePaint(fills);
  const stroke = firstVisiblePaint(strokes);

  return Object.assign(
    {
      background: paintToCss(fill),
      borderColor: paintToCss(stroke),
      borderWidth: typeof node.strokeWeight === 'number' ? node.strokeWeight : undefined,
      borderRadius:
        typeof node.cornerRadius === 'number' && !Number.isNaN(node.cornerRadius)
          ? node.cornerRadius
          : undefined,
      opacity: typeof node.opacity === 'number' ? node.opacity : undefined,
    },
    extractTextStyle(node)
  );
}

export function extractNodeText(node: AnyNode): string | undefined {
  if (node.type === 'TEXT') {
    return String(node.characters || '').trim() || undefined;
  }
  return undefined;
}

export function hasImageFill(node: AnyNode): boolean {
  if (!node || !Array.isArray(node.fills) || node.fills === figma.mixed) return false;
  return node.fills.some(function (fill: AnyNode) {
    return fill && fill.visible !== false && fill.type === 'IMAGE';
  });
}

export function walkScenePaths(root: AnyNode, visitor: (node: AnyNode, path: string) => void): void {
  (function walk(node: AnyNode, path: string) {
    visitor(node, path);
    const children = getNodeChildren(node);
    for (let index = 0; index < children.length; index += 1) {
      walk(children[index], path ? path + '/' + index : String(index));
    }
  })(root, '');
}

export function buildPathMaps(root: AnyNode): {
  idToPath: Map<string, string>;
  pathToNode: Map<string, AnyNode>;
} {
  const idToPath = new Map<string, string>();
  const pathToNode = new Map<string, AnyNode>();

  walkScenePaths(root, function (node, path) {
    idToPath.set(String(node.id), path);
    pathToNode.set(path, node);
  });

  return {
    idToPath: idToPath,
    pathToNode: pathToNode,
  };
}

export async function exportNodeImage(
  node: AnyNode,
  fileName: string,
  scale?: number
): Promise<ExportFile | null> {
  if (!node || typeof node.exportAsync !== 'function') return null;
  const bytes = new Uint8Array(
    await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: typeof scale === 'number' && scale > 0 ? scale : 2 },
    })
  );

  return {
    name: fileName,
    base64: figma.base64Encode(bytes),
    mime: 'image/png',
  };
}

export async function exportMockupPng(rootNode: AnyNode, fileName: string): Promise<ExportFile | null> {
  return exportNodeImage(rootNode, fileName, 1);
}

export function buildNodeIndex(root: AnyNode): Map<string, AnyNode> {
  const index = new Map<string, AnyNode>();

  (function walk(node: AnyNode) {
    index.set(String(node.id), node);
    for (const child of getNodeChildren(node)) walk(child);
  })(root);

  return index;
}

export function getExportPageNodes(rootNode: AnyNode): Array<{ key: string; node: AnyNode }> {
  const children = getNodeChildren(rootNode);
  const pages: Array<{ key: string; node: AnyNode }> = [];
  const wanted = ['p1', 'p2', 'p3'];

  for (let index = 0; index < wanted.length; index += 1) {
    const key = wanted[index];
    const match = children.find(function (child) {
      return String(child && child.name ? child.name : '').trim().toLowerCase() === key;
    });
    if (match) pages.push({ key: key, node: match });
  }

  if (!pages.length) {
    pages.push({ key: 'p1', node: rootNode });
  }

  return pages;
}

export async function attachProductAssets(
  products: any[],
  nodeIndex: Map<string, AnyNode>,
  exportBaseName: string
): Promise<ExportFile[]> {
  const assets: ExportFile[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    if (!product._imageNodeId || seen.has(product._imageNodeId)) continue;
    const sourceNode = nodeIndex.get(product._imageNodeId);
    if (!sourceNode || !hasImageFill(sourceNode)) continue;

    const assetName = exportBaseName + '-product-' + (index + 1) + '.png';
    const asset = await exportNodeImage(sourceNode, assetName);
    if (!asset) continue;

    product.imageAsset = assetName;
    assets.push(asset);
    seen.add(product._imageNodeId);
  }

  for (const product of products) {
    if (!product.imageAsset && product._imageNodeId && seen.has(product._imageNodeId)) {
      const firstIndex = products.findIndex(function (candidate: any) {
        return candidate._imageNodeId === product._imageNodeId && !!candidate.imageAsset;
      });
      if (firstIndex >= 0) {
        product.imageAsset = products[firstIndex].imageAsset;
      }
    }
    delete product._imageNodeId;
  }

  return assets;
}

export async function exportFlattenedBackgroundVariant(
  rootNode: AnyNode,
  dynamicNodeIds: string[],
  alwaysHiddenNodeIds: string[],
  removeAllText: boolean,
  fileName: string,
  uniqueIds: (ids: string[]) => string[]
): Promise<ExportFile | null> {
  if (!rootNode || typeof rootNode.clone !== 'function') return null;
  const clone = rootNode.clone();
  const pathMaps = buildPathMaps(rootNode);
  const disclaimerIds = new Set<string>();
  const inputIds = new Set<string>();
  const normalizedRoot = normalizeNode(rootNode);
  flattenTree(normalizedRoot).forEach(function(node: NormalizedNode) {
    if (node.componentOverride === 'disclaimer_text') {
      disclaimerIds.add(node.id);
    }
    if (node.componentOverride === 'email_input' || node.componentOverride === 'phone_input') {
      inputIds.add(node.id);
    }
  });
  const hidePaths = uniqueIds(dynamicNodeIds.concat(alwaysHiddenNodeIds).concat(Array.from(disclaimerIds)))
    .map(function (id) {
      return pathMaps.idToPath.get(id) || '';
    })
    .filter(Boolean);

  try {
    const cloneMaps = buildPathMaps(clone);
    for (const path of hidePaths) {
      const node = cloneMaps.pathToNode.get(path);
      if (!node) continue;
      if ('opacity' in node && typeof node.opacity === 'number') {
        node.opacity = 0;
      } else {
        node.visible = false;
      }
    }

    if (removeAllText) {
      walkScenePaths(clone, function (node) {
        if (node.type !== 'TEXT') return;
        if ('opacity' in node && typeof node.opacity === 'number') {
          node.opacity = 0;
        } else {
          node.visible = false;
        }
      });

      // Hide all subcomponents for background-only export
      function hideChildren(node: AnyNode) {
        if ('children' in node && Array.isArray(node.children)) {
          for (const child of node.children) {
            if (child.type === 'TEXT') continue; // Skip text nodes to keep them visible
            if (inputIds.has(child.id)) continue; // Keep input backgrounds visible
            if ('opacity' in child && typeof child.opacity === 'number') {
              child.opacity = 0;
            } else {
              child.visible = false;
            }
            hideChildren(child);
          }
        }
      }
      hideChildren(clone);
    }

    return await exportNodeImage(clone, fileName);
  } finally {
    clone.remove();
  }
}

export function validateSelection(selection: readonly SceneNode[]): AnyNode | null {
  if (!selection.length) return null;
  const root = selection[0] as AnyNode;
  if (!root) return null;
  if (
    root.type !== 'FRAME' &&
    root.type !== 'GROUP' &&
    root.type !== 'COMPONENT' &&
    root.type !== 'INSTANCE'
  ) {
    return null;
  }
  return root;
}

function collectExportFrames(node: AnyNode): AnyNode[] {
  if (!node) return [];
  if (node.type === 'FRAME') return [node];
  if (
    node.type !== 'GROUP' &&
    node.type !== 'COMPONENT' &&
    node.type !== 'INSTANCE' &&
    node.type !== 'SECTION'
  ) {
    return [];
  }

  const frames: AnyNode[] = [];
  const children = getNodeChildren(node);
  for (let index = 0; index < children.length; index += 1) {
    frames.push(...collectExportFrames(children[index]));
  }
  return frames;
}

export function getExportRoots(selection: readonly SceneNode[], page: PageNode): AnyNode[] {
  const selectedRoots = Array.from(selection || []).filter(function (node) {
    return (
      node &&
      (
        node.type === 'FRAME' ||
        node.type === 'GROUP' ||
        node.type === 'COMPONENT' ||
        node.type === 'INSTANCE' ||
        node.type === 'SECTION'
      )
    );
  }) as AnyNode[];

  if (selectedRoots.length) {
    const seen = new Set<string>();
    const frames: AnyNode[] = [];
    for (let index = 0; index < selectedRoots.length; index += 1) {
      const nextFrames = collectExportFrames(selectedRoots[index]);
      for (let frameIndex = 0; frameIndex < nextFrames.length; frameIndex += 1) {
        const frame = nextFrames[frameIndex];
        const id = String(frame.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        frames.push(frame);
      }
    }
    return frames;
  }

  const pageChildren = page && Array.isArray(page.children) ? (page.children as readonly SceneNode[]) : [];
  const seen = new Set<string>();
  const frames: AnyNode[] = [];
  for (let index = 0; index < pageChildren.length; index += 1) {
    const nextFrames = collectExportFrames(pageChildren[index] as AnyNode);
    for (let frameIndex = 0; frameIndex < nextFrames.length; frameIndex += 1) {
      const frame = nextFrames[frameIndex];
      const id = String(frame.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      frames.push(frame);
    }
  }
  return frames;
}

export function buildExportPackageName(nodes: AnyNode[]): string {
  const fileName = sanitizeFilePart(figma.root && figma.root.name ? figma.root.name : 'figma-file');

  if (!nodes.length) return fileName + '_' + getYearMonth() + '.zip';
  if (nodes.length === 1) return buildExportBaseName(nodes[0]) + '.zip';

  const pageName = sanitizeFilePart(figma.currentPage && figma.currentPage.name ? figma.currentPage.name : 'page');
  return fileName + '_' + pageName + '_' + getYearMonth() + '.zip';
}

export { getNodeChildren, getPluginMeta, setPluginMeta };
