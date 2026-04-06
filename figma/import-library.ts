/* eslint-disable @typescript-eslint/no-explicit-any */

import { COMMON_COMPONENTS } from '../constants';
import { AnyNode, ComponentTemplateId, NodeBounds, NodeStyle, NormalizedNode } from '../types';
import { BUNDLED_TEMPLATE_LIBRARY } from '../generated/template-library';
import { buildAssetComponentNode } from './builders';
import {
  applyThemeSnapshot,
  applyThemeText,
  AssetThemeVariables,
  bindColorVariable,
  bindUniformRadius,
  ASSET_LIBRARY_PAGE_NAME,
  TEMPLATES_PAGE_NAME,
} from './theme';
import {
  applyComponentMeta,
  getNodeChildren,
  getPluginMeta,
  isPageNode,
  loadTextNodeFont,
  makeSolidFill,
  setPluginMeta,
} from './shared';

function findAssetLibraryPage(): PageNode | undefined {
  for (let index = 0; index < figma.root.children.length; index += 1) {
    const child = figma.root.children[index];
    if (isPageNode(child) && child.name === ASSET_LIBRARY_PAGE_NAME) return child;
  }
  return undefined;
}

function getTextDescendants(node: BaseNode): TextNode[] {
  const found: TextNode[] = [];
  const stack: BaseNode[] = [node];
  while (stack.length) {
    const current = stack.shift();
    if (!current) continue;
    if (current.type === 'TEXT') {
      found.push(current as TextNode);
      continue;
    }
    if ('children' in current && Array.isArray((current as ChildrenMixin).children)) {
      for (let index = 0; index < (current as ChildrenMixin).children.length; index += 1) {
        stack.push((current as ChildrenMixin).children[index]);
      }
    }
  }
  return found;
}

async function applyThemeToExistingComponent(node: SceneNode, theme: AssetThemeVariables): Promise<void> {
  const meta = getPluginMeta(node as AnyNode);
  const componentId = meta.exportComponent as ComponentTemplateId | undefined;
  if (!componentId) return;

  if (
    componentId === 'modal_shell' ||
    componentId === 'sidebar_shell' ||
    componentId === 'bottom_bar_shell'
  ) {
    bindUniformRadius(node, theme.borderRadius);
    bindColorVariable(node, 'fills', theme.background2);
  }

  if (
    componentId === 'content_stack' ||
    componentId === 'media_panel' ||
    componentId === 'product_card'
  ) {
    bindColorVariable(node, 'fills', theme.background2);
  }

  if (componentId === 'product_image') {
    bindUniformRadius(node, theme.borderRadius);
    bindColorVariable(node, 'fills', theme.background1);
  }

  if (componentId === 'price_table') {
    if ('fills' in node) {
      node.fills = [makeSolidFill('#EAEAEA')];
      bindColorVariable(node, 'fills', theme.fontColor);
    }
    if ('cornerRadius' in node) (node as any).cornerRadius = 0;
  }

  if (
    componentId === 'primary_button' ||
    componentId === 'thank_you_button'
  ) {
    bindUniformRadius(node, theme.borderRadius);
    bindColorVariable(node, 'fills', theme.button1);
    const textNodes = getTextDescendants(node);
    for (let index = 0; index < textNodes.length; index += 1) {
      await applyThemeText(textNodes[index], theme, { colorVariable: theme.fontColor });
    }
  }

  if (componentId === 'product_button') {
    bindUniformRadius(node, theme.borderRadius);
    bindColorVariable(node, 'fills', theme.button2);
    const textNodes = getTextDescendants(node);
    for (let index = 0; index < textNodes.length; index += 1) {
      await applyThemeText(textNodes[index], theme, { colorVariable: theme.fontColor });
    }
  }

  if (componentId === 'no_thanks_button') {
    bindUniformRadius(node, theme.borderRadius);
    bindColorVariable(node, 'fills', theme.highlight);
    const textNodes = getTextDescendants(node);
    for (let index = 0; index < textNodes.length; index += 1) {
      await applyThemeText(textNodes[index], theme, { colorVariable: theme.fontColor });
    }
  }

  if (componentId === 'divider') {
    bindColorVariable(node, 'fills', theme.background1);
  }

  if (componentId === 'email_input' || componentId === 'phone_input') {
    bindUniformRadius(node, theme.borderRadius);
    bindColorVariable(node, 'strokes', theme.background2);
    const textNodes = getTextDescendants(node);
    for (let index = 0; index < textNodes.length; index += 1) {
      await applyThemeText(textNodes[index], theme, { colorVariable: theme.background1 });
    }
  }

  if (componentId === 'optin_component') {
    const textNodes = getTextDescendants(node);
    for (let index = 0; index < textNodes.length; index += 1) {
      await applyThemeText(textNodes[index], theme, { colorVariable: theme.fontColor });
    }
    if ('children' in node && Array.isArray((node as ChildrenMixin).children) && (node as ChildrenMixin).children[0]) {
      bindUniformRadius((node as ChildrenMixin).children[0], theme.borderRadius);
      bindColorVariable((node as ChildrenMixin).children[0], 'strokes', theme.fontColor);
    }
  }

  if (componentId === 'copy_coupon') {
    const children = 'children' in node && Array.isArray((node as ChildrenMixin).children)
      ? (node as ChildrenMixin).children
      : [];
    if (children[0]) {
      bindUniformRadius(children[0], theme.borderRadius);
      bindColorVariable(children[0], 'strokes', theme.button2);
      const codeTexts = getTextDescendants(children[0]);
      for (let index = 0; index < codeTexts.length; index += 1) {
        await applyThemeText(codeTexts[index], theme, {
          charactersVariable: theme.incentive,
          colorVariable: theme.background1,
        });
      }
    }
    if (children[1]) {
      bindUniformRadius(children[1], theme.borderRadius);
      bindColorVariable(children[1], 'fills', theme.highlight);
      const buttonTexts = getTextDescendants(children[1]);
      for (let index = 0; index < buttonTexts.length; index += 1) {
        await applyThemeText(buttonTexts[index], theme, { colorVariable: theme.fontColor });
      }
    }
  }

  if (componentId === 'progress_bar') {
    bindUniformRadius(node, theme.borderRadius);
    bindColorVariable(node, 'fills', theme.background2);
    if ('children' in node && Array.isArray((node as ChildrenMixin).children) && (node as ChildrenMixin).children[0]) {
      bindUniformRadius((node as ChildrenMixin).children[0], theme.borderRadius);
      bindColorVariable((node as ChildrenMixin).children[0], 'fills', theme.highlight);
    }
  }

  if (componentId === 'headline_block' || componentId === 'subtext_block' || componentId === 'disclaimer_text') {
    await applyThemeText(node as TextNode, theme, { colorVariable: theme.fontColor });
  }

  if (componentId === 'eyebrow_block') {
    await applyThemeText(node as TextNode, theme, {
      charactersVariable: theme.incentive,
      colorVariable: theme.fontColor,
    });
  }

  if (
    componentId === 'product_title' ||
    componentId === 'product_subtitle' ||
    componentId === 'product_price' ||
    componentId === 'price_subtotal' ||
    componentId === 'price_discount' ||
    componentId === 'price_total'
  ) {
    const textNodes = node.type === 'TEXT' ? [node as TextNode] : getTextDescendants(node);
    for (let index = 0; index < textNodes.length; index += 1) {
      await applyThemeText(textNodes[index], theme, { colorVariable: theme.background1 });
    }
  }

  if (componentId === 'countdown_timer' || componentId === 'close_control') {
    if (componentId === 'countdown_timer') {
      bindUniformRadius(node, theme.borderRadius);
      bindColorVariable(node, 'fills', theme.background1);
    }
    if (componentId === 'close_control') {
      if ('layoutMode' in node) {
        (node as FrameNode).layoutMode = 'HORIZONTAL';
        (node as FrameNode).primaryAxisSizingMode = 'FIXED';
        (node as FrameNode).counterAxisSizingMode = 'FIXED';
        (node as FrameNode).primaryAxisAlignItems = 'CENTER';
        (node as FrameNode).counterAxisAlignItems = 'CENTER';
      }
      if ('strokes' in node) {
        node.strokes = [makeSolidFill('#BDBDBD')];
        bindColorVariable(node, 'strokes', theme.background2);
      }
      if ('strokeWeight' in node) {
        (node as any).strokeWeight = 1;
      }
      bindUniformRadius(node, theme.borderRadius);
    }
    const textNodes = getTextDescendants(node);
    for (let index = 0; index < textNodes.length; index += 1) {
      textNodes[index].textAutoResize = 'WIDTH_AND_HEIGHT';
      textNodes[index].textAlignVertical = 'CENTER';
      await applyThemeText(textNodes[index], theme, { colorVariable: theme.fontColor });
    }
  }
}

function findPageByName(name: string): PageNode | undefined {
  for (let index = 0; index < figma.root.children.length; index += 1) {
    const child = figma.root.children[index];
    if (isPageNode(child) && child.name === name) return child;
  }
  return undefined;
}

function clearPageChildren(page: PageNode): void {
  const children = page.children.slice();
  for (let index = 0; index < children.length; index += 1) {
    children[index].remove();
  }
}

async function loadBestMatchingFont(textNode: TextNode, style: NodeStyle): Promise<void> {
  const family = style.fontFamily || 'Merriweather Sans';
  const styleName =
    style.fontStyle === 'italic'
      ? 'Italic'
      : style.fontWeight && style.fontWeight >= 700
        ? 'Bold'
        : style.fontWeight && style.fontWeight >= 500
          ? 'Medium'
          : 'Regular';
  try {
    await figma.loadFontAsync({ family: family, style: styleName });
    textNode.fontName = { family: family, style: styleName };
  } catch (_error) {
    try {
      await figma.loadFontAsync({ family: family, style: 'Regular' });
      textNode.fontName = { family: family, style: 'Regular' };
    } catch (_secondError) {
      // Keep whatever font is currently available.
    }
  }
}

function applyNodeStyleToShape(node: any, style: NodeStyle): void {
  if (style.background) node.fills = [makeSolidFill(cssColorToHex(style.background))];
  else if ('fills' in node) node.fills = [];
  if (style.borderColor && 'strokes' in node) {
    node.strokes = [makeSolidFill(cssColorToHex(style.borderColor))];
    if (style.borderWidth != null) node.strokeWeight = style.borderWidth;
  } else if ('strokes' in node) {
    node.strokes = [];
  }
  if (style.borderRadius != null && 'cornerRadius' in node) {
    node.cornerRadius = style.borderRadius;
  }
  if (style.opacity != null) {
    node.opacity = style.opacity;
  }
}

function cssColorToHex(value: string): string {
  const input = String(value || '').trim();
  if (input.startsWith('#')) return input;
  const match = input.match(/rgba?\(([^)]+)\)/i);
  if (!match) return '#000000';
  const parts = match[1].split(',').map(function (part) { return Number(String(part).trim()); });
  const toHex = function (num: number): string {
    return Math.max(0, Math.min(255, Math.round(num))).toString(16).padStart(2, '0');
  };
  return '#' + toHex(parts[0] || 0) + toHex(parts[1] || 0) + toHex(parts[2] || 0);
}

function mapPrimaryAlign(value: string): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
  if (value === 'CENTER') return 'CENTER';
  if (value === 'MAX') return 'MAX';
  if (value === 'SPACE_BETWEEN') return 'SPACE_BETWEEN';
  return 'MIN';
}

function mapCounterAlign(value: string): 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' {
  if (value === 'CENTER') return 'CENTER';
  if (value === 'MAX') return 'MAX';
  if (value === 'BASELINE') return 'BASELINE';
  return 'MIN';
}

function isCenteredControl(componentId?: ComponentTemplateId): boolean {
  return (
    componentId === 'primary_button' ||
    componentId === 'thank_you_button' ||
    componentId === 'no_thanks_button' ||
    componentId === 'product_button' ||
    componentId === 'close_control'
  );
}

async function createNodeFromManifest(
  node: NormalizedNode,
  parentBounds?: NodeBounds,
  parentLayoutMode?: string
): Promise<SceneNode> {
  let sceneNode: SceneNode;

  if (node.type === 'TEXT') {
    const text = figma.createText();
    await loadTextNodeFont(text);
    await loadBestMatchingFont(text, node.style);
    text.characters = node.text || '';
    if (node.style.fontSize != null) text.fontSize = node.style.fontSize;
    if (node.style.textAlign) text.textAlignHorizontal = String(node.style.textAlign).toUpperCase() as any;
    if (node.componentOverride === 'close_control' || parentLayoutMode === 'HORIZONTAL' || parentLayoutMode === 'VERTICAL') {
      text.textAlignVertical = 'CENTER';
    }
    if (node.style.color) text.fills = [makeSolidFill(cssColorToHex(node.style.color))];
    if (node.style.opacity != null) text.opacity = node.style.opacity;
    if (node.bounds.width && node.bounds.height) {
      if (parentLayoutMode === 'HORIZONTAL' || parentLayoutMode === 'VERTICAL') {
        text.textAutoResize = 'WIDTH_AND_HEIGHT';
      } else {
        text.textAutoResize = 'NONE';
        text.resize(node.bounds.width, node.bounds.height);
      }
    }
    sceneNode = text;
  } else if (node.children.length || node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frame = figma.createFrame();
    frame.layoutMode = node.layout.mode === 'HORIZONTAL' || node.layout.mode === 'VERTICAL' ? node.layout.mode : 'NONE';
    if (frame.layoutMode === 'HORIZONTAL') {
      frame.primaryAxisSizingMode = node.layout.widthMode === 'HUG' ? 'AUTO' : 'FIXED';
      frame.counterAxisSizingMode = node.layout.heightMode === 'HUG' ? 'AUTO' : 'FIXED';
    } else if (frame.layoutMode === 'VERTICAL') {
      frame.primaryAxisSizingMode = node.layout.heightMode === 'HUG' ? 'AUTO' : 'FIXED';
      frame.counterAxisSizingMode = node.layout.widthMode === 'HUG' ? 'AUTO' : 'FIXED';
    }
    if (frame.layoutMode !== 'NONE') {
      frame.primaryAxisAlignItems = isCenteredControl(node.componentOverride) ? 'CENTER' : mapPrimaryAlign(node.layout.primaryAlign);
      frame.counterAxisAlignItems = isCenteredControl(node.componentOverride) ? 'CENTER' : mapCounterAlign(node.layout.counterAlign);
    }
    frame.itemSpacing = node.layout.gap || 0;
    frame.paddingTop = node.layout.padding.top || 0;
    frame.paddingRight = node.layout.padding.right || 0;
    frame.paddingBottom = node.layout.padding.bottom || 0;
    frame.paddingLeft = node.layout.padding.left || 0;
    if (node.bounds.width && node.bounds.height) frame.resize(node.bounds.width, node.bounds.height);
    applyNodeStyleToShape(frame, node.style);
    for (let index = 0; index < node.children.length; index += 1) {
      const child = await createNodeFromManifest(node.children[index], node.bounds, frame.layoutMode);
      frame.appendChild(child);
    }
    sceneNode = frame;
  } else {
    const rect = figma.createRectangle();
    if (node.bounds.width && node.bounds.height) rect.resize(node.bounds.width, node.bounds.height);
    applyNodeStyleToShape(rect, node.style);
    sceneNode = rect;
  }

  sceneNode.name = node.name;
  if (node.componentOverride) {
    applyComponentMeta(sceneNode, node.componentOverride);
  } else if (node.metadata.exportRole || node.metadata.exportComponent || node.metadata.exportCollection || node.metadata.exportIgnore) {
    setPluginMeta(sceneNode as AnyNode, node.metadata);
  }

  if (parentBounds && parentLayoutMode === 'NONE' && ('x' in sceneNode) && ('y' in sceneNode)) {
    sceneNode.x = node.bounds.x - parentBounds.x;
    sceneNode.y = node.bounds.y - parentBounds.y;
  }

  return sceneNode;
}

async function buildLibrarySectionFrame(label: string, theme: AssetThemeVariables): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = label;
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.itemSpacing = 16;
  frame.paddingTop = 24;
  frame.paddingRight = 24;
  frame.paddingBottom = 24;
  frame.paddingLeft = 24;
  frame.cornerRadius = 12;
  frame.fills = [makeSolidFill('#3E3E3E')];
  bindUniformRadius(frame, theme.borderRadius);
  bindColorVariable(frame, 'fills', theme.background1);
  const heading = figma.createText();
  await loadTextNodeFont(heading);
  heading.name = label;
  heading.characters = label;
  heading.fontSize = 20;
  await applyThemeText(heading, theme, { colorVariable: theme.fontColor });
  frame.appendChild(heading);
  return frame;
}

export async function ensureTemplatesPageFromLibrary(): Promise<PageNode> {
  const library = BUNDLED_TEMPLATE_LIBRARY;
  const themeSnapshot = library.assetTheme.length
    ? library.assetTheme
    : library.entries.length && library.entries[0].assetTheme
      ? library.entries[0].assetTheme
      : [];
  await applyThemeSnapshot(themeSnapshot);

  let page = findPageByName(TEMPLATES_PAGE_NAME);
  if (!page) {
    page = figma.createPage();
    page.name = TEMPLATES_PAGE_NAME;
  }
  clearPageChildren(page);

  const entries = library.entries.slice();
  const columnGap = 80;
  const rowGap = 160;
  const maxWidth = 2400;
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry || !entry.ast) continue;
    const frame = await createNodeFromManifest(entry.ast);
    frame.name = entry.frameName;
    if (x + frame.width > maxWidth && x > 0) {
      x = 0;
      y += rowHeight + rowGap;
      rowHeight = 0;
    }
    page.appendChild(frame);
    frame.x = x;
    frame.y = y;
    x += frame.width + columnGap;
    rowHeight = Math.max(rowHeight, frame.height);
  }

  await figma.setCurrentPageAsync(page);
  figma.viewport.scrollAndZoomIntoView(page.children as SceneNode[]);
  return page;
}

export async function ensureAssetSourcePage(): Promise<PageNode> {
  const libraryTheme = BUNDLED_TEMPLATE_LIBRARY.assetTheme.length
    ? BUNDLED_TEMPLATE_LIBRARY.assetTheme
    : BUNDLED_TEMPLATE_LIBRARY.entries.length && BUNDLED_TEMPLATE_LIBRARY.entries[0].assetTheme
      ? BUNDLED_TEMPLATE_LIBRARY.entries[0].assetTheme
      : [];
  const theme = await applyThemeSnapshot(libraryTheme);
  let page = findAssetLibraryPage();
  if (!page) {
    page = figma.createPage();
    page.name = ASSET_LIBRARY_PAGE_NAME;
  }

  const sections: Partial<Record<string, FrameNode>> = {};
  for (let index = 0; index < page.children.length; index += 1) {
    const child = page.children[index];
    if (child.type === 'FRAME') {
      sections[String(child.name || '').toLowerCase()] = child;
    }
  }

  for (let index = 0; index < COMMON_COMPONENTS.length; index += 1) {
    const component = COMMON_COMPONENTS[index];
    const stack: BaseNode[] = page.children.slice();
    let existing = false;
    while (stack.length) {
      const current = stack.shift();
      if (!current) continue;
      if (getPluginMeta(current as AnyNode).exportComponent === component.id && current.type !== 'PAGE') {
        existing = true;
        break;
      }
      for (let childIndex = 0; childIndex < getNodeChildren(current as AnyNode).length; childIndex += 1) {
        stack.push(getNodeChildren(current as AnyNode)[childIndex]);
      }
    }
    if (existing) continue;
    const sectionKey = String(component.category || '').toLowerCase();
    if (!sections[sectionKey]) {
      const section = await buildLibrarySectionFrame(component.category.charAt(0).toUpperCase() + component.category.slice(1), theme);
      page.appendChild(section);
      sections[sectionKey] = section;
    }
    const node = await buildAssetComponentNode(component.id as ComponentTemplateId);
    sections[sectionKey]!.appendChild(node);
  }

  const stack: BaseNode[] = page.children.slice();
  while (stack.length) {
    const current = stack.shift();
    if (!current) continue;
    if (current.type !== 'PAGE') {
      await applyThemeToExistingComponent(current as SceneNode, theme);
    }
    if ('children' in current && Array.isArray((current as ChildrenMixin).children)) {
      for (let index = 0; index < (current as ChildrenMixin).children.length; index += 1) {
        stack.push((current as ChildrenMixin).children[index]);
      }
    }
  }

  let x = 0;
  const pageChildren = page.children.filter(function (child) { return child.type === 'FRAME'; }) as FrameNode[];
  for (let index = 0; index < pageChildren.length; index += 1) {
    bindUniformRadius(pageChildren[index], theme.borderRadius);
    bindColorVariable(pageChildren[index], 'fills', theme.background1);
    const textChildren = pageChildren[index].children.filter(function (child) { return child.type === 'TEXT'; }) as TextNode[];
    for (let textIndex = 0; textIndex < textChildren.length; textIndex += 1) {
      await applyThemeText(textChildren[textIndex], theme, { colorVariable: theme.fontColor });
    }
    pageChildren[index].x = x;
    pageChildren[index].y = 0;
    x += pageChildren[index].width + 48;
  }

  await figma.setCurrentPageAsync(page);
  figma.viewport.scrollAndZoomIntoView(page.children as SceneNode[]);
  return page;
}
