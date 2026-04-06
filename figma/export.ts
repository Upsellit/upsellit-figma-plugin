/* eslint-disable @typescript-eslint/no-explicit-any */

import { COMMON_COMPONENTS, COMPONENT_ROLE_MAP } from '../constants';
import {
  AnyNode,
  ComponentTemplateId,
  ExportFile,
  NodeBounds,
  NodeStyle,
  NormalizedNode,
  SizingMode,
  ThemeVariableSnapshot,
} from '../types';
import { sanitizeFilePart } from '../utils/string';
import { BUNDLED_TEMPLATE_LIBRARY } from '../generated/template-library';

const ASSET_LIBRARY_PAGE_NAME = 'Upsellit Asset Source';
const TEMPLATES_PAGE_NAME = 'Upsellit Templates';
const ASSET_VARIABLE_COLLECTION_NAME = 'Upsellit Asset Tokens';

type AssetThemeVariables = {
  collection: VariableCollection;
  incentive: Variable;
  borderRadius: Variable;
  fontFamily: Variable;
  fontColor: Variable;
  background1: Variable;
  background2: Variable;
  button1: Variable;
  button2: Variable;
  highlight: Variable;
};

function hexToRgba(hex: string): RGBA {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map(function (part) { return part + part; }).join('')
    : normalized;
  return {
    r: parseInt(expanded.slice(0, 2), 16) / 255,
    g: parseInt(expanded.slice(2, 4), 16) / 255,
    b: parseInt(expanded.slice(4, 6), 16) / 255,
    a: 1,
  };
}

async function ensureAssetThemeVariables(): Promise<AssetThemeVariables> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find(function (item) {
    return item && item.name === ASSET_VARIABLE_COLLECTION_NAME;
  });
  if (!collection) {
    collection = figma.variables.createVariableCollection(ASSET_VARIABLE_COLLECTION_NAME);
  }
  const variableCollection = collection;

  const variables = await figma.variables.getLocalVariablesAsync();
  const byName: Record<string, Variable> = {};
  for (let index = 0; index < variables.length; index += 1) {
    const variable = variables[index] as any;
    if (variable && variable.variableCollectionId === variableCollection.id) {
      byName[String(variable.name)] = variables[index];
    }
  }

  function ensureVariable(name: string, resolvedType: VariableResolvedDataType, value: VariableValue): Variable {
    let variable = byName[name];
    if (!variable) {
      variable = figma.variables.createVariable(name, variableCollection, resolvedType);
      byName[name] = variable;
    }
    variable.setValueForMode(variableCollection.modes[0].modeId, value);
    return variable;
  }

  return {
    collection: variableCollection,
    incentive: ensureVariable('Incentive', 'STRING', '15% Off'),
    borderRadius: ensureVariable('Border Radius', 'FLOAT', 36),
    fontFamily: ensureVariable('FontFamily', 'STRING', 'Merriweather Sans'),
    fontColor: ensureVariable('FontColor', 'COLOR', hexToRgba('#EAEAEA')),
    background1: ensureVariable('Background 1', 'COLOR', hexToRgba('#3E3E3E')),
    background2: ensureVariable('Background 2', 'COLOR', hexToRgba('#BDBDBD')),
    button1: ensureVariable('Button 1', 'COLOR', hexToRgba('#3C8BD9')),
    button2: ensureVariable('Button 2', 'COLOR', hexToRgba('#104F8E')),
    highlight: ensureVariable('Highlight', 'COLOR', hexToRgba('#D20688')),
  };
}

export async function getAssetThemeSnapshot(): Promise<ThemeVariableSnapshot[]> {
  const theme = await ensureAssetThemeVariables();
  const variables = [
    theme.incentive,
    theme.borderRadius,
    theme.fontFamily,
    theme.fontColor,
    theme.background1,
    theme.background2,
    theme.button1,
    theme.button2,
    theme.highlight,
  ];

  return variables.map(function (variable) {
    const rawValue = variable.valuesByMode[theme.collection.modes[0].modeId] as any;
    const value =
      rawValue && typeof rawValue === 'object' && 'r' in rawValue && 'g' in rawValue && 'b' in rawValue
        ? {
            r: rawValue.r,
            g: rawValue.g,
            b: rawValue.b,
            a: rawValue.a,
          }
        : rawValue;
    return {
      collectionName: theme.collection.name,
      name: variable.name,
      resolvedType: variable.resolvedType as ThemeVariableSnapshot['resolvedType'],
      value: value,
    };
  });
}

async function applyThemeSnapshot(snapshot: ThemeVariableSnapshot[] | undefined): Promise<AssetThemeVariables> {
  const theme = await ensureAssetThemeVariables();
  const byName: Record<string, Variable> = {
    Incentive: theme.incentive,
    'Border Radius': theme.borderRadius,
    FontFamily: theme.fontFamily,
    FontColor: theme.fontColor,
    'Background 1': theme.background1,
    'Background 2': theme.background2,
    'Button 1': theme.button1,
    'Button 2': theme.button2,
    Highlight: theme.highlight,
  };
  const modeId = theme.collection.modes[0].modeId;

  for (let index = 0; index < (snapshot || []).length; index += 1) {
    const token = snapshot![index];
    const variable = byName[token.name];
    if (!variable) continue;
    variable.setValueForMode(modeId, token.value as VariableValue);
  }

  return theme;
}

function bindColorVariable(node: any, field: 'fills' | 'strokes', variable: Variable): void {
  const current = Array.isArray(node[field]) ? node[field] : [];
  const paints = current.length ? current.slice() : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  const nextPaints = paints.map(function (paint: any) {
    if (!paint || paint.type !== 'SOLID') return paint;
    return figma.variables.setBoundVariableForPaint(paint, 'color', variable);
  });
  node[field] = nextPaints;
}

function bindUniformRadius(node: any, variable: Variable): void {
  if (!node || typeof node.setBoundVariable !== 'function') return;
  if (
    !('topLeftRadius' in node) ||
    !('topRightRadius' in node) ||
    !('bottomLeftRadius' in node) ||
    !('bottomRightRadius' in node)
  ) {
    return;
  }
  node.setBoundVariable('topLeftRadius', variable);
  node.setBoundVariable('topRightRadius', variable);
  node.setBoundVariable('bottomLeftRadius', variable);
  node.setBoundVariable('bottomRightRadius', variable);
}

async function applyThemeFont(textNode: TextNode, theme: AssetThemeVariables): Promise<void> {
  try {
    await figma.loadFontAsync({ family: 'Merriweather Sans', style: 'Regular' });
    textNode.fontName = { family: 'Merriweather Sans', style: 'Regular' };
  } catch (_error) {
    // Keep the current font if Merriweather Sans is unavailable locally.
  }
  if (typeof textNode.setBoundVariable === 'function') {
    textNode.setBoundVariable('fontFamily', theme.fontFamily);
  }
}

async function applyThemeText(
  textNode: TextNode,
  theme: AssetThemeVariables,
  options?: { charactersVariable?: Variable; colorVariable?: Variable }
): Promise<void> {
  await applyThemeFont(textNode, theme);
  bindColorVariable(textNode, 'fills', options && options.colorVariable ? options.colorVariable : theme.fontColor);
  if (options && options.charactersVariable && typeof textNode.setBoundVariable === 'function') {
    textNode.setBoundVariable('characters', options.charactersVariable);
  }
}

export function getYearMonth(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return yy + '-' + mm;
}

export function buildExportBaseName(frame: AnyNode): string {
  const fileName = sanitizeFilePart(
    figma.root && figma.root.name ? figma.root.name : 'figma-file'
  );
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

async function loadTextNodeFont(textNode: TextNode): Promise<void> {
  const fontName = textNode.fontName;
  if (fontName && fontName !== figma.mixed && typeof fontName === 'object') {
    await figma.loadFontAsync(fontName as FontName);
  }
}

async function createTextLayer(
  name: string,
  characters: string,
  fontSize: number,
  width?: number
): Promise<TextNode> {
  const text = figma.createText();
  await loadTextNodeFont(text);
  text.name = name;
  text.characters = characters;
  text.fontSize = fontSize;
  if (typeof width === 'number') {
    text.textAutoResize = 'HEIGHT';
    text.resize(width, text.height);
  }
  return text;
}

async function createButtonFrame(
  name: string,
  label: string,
  componentId: string,
  theme: AssetThemeVariables,
  options?: {
    background?: string;
    color?: string;
    paddingX?: number;
    paddingY?: number;
    backgroundVariable?: Variable;
    textVariable?: Variable;
  }
): Promise<FrameNode> {
  const button = figma.createFrame();
  button.name = name;
  button.layoutMode = 'HORIZONTAL';
  button.primaryAxisSizingMode = 'AUTO';
  button.counterAxisSizingMode = 'AUTO';
  button.primaryAxisAlignItems = 'CENTER';
  button.counterAxisAlignItems = 'CENTER';
  button.paddingLeft = options && typeof options.paddingX === 'number' ? options.paddingX : 24;
  button.paddingRight = options && typeof options.paddingX === 'number' ? options.paddingX : 24;
  button.paddingTop = options && typeof options.paddingY === 'number' ? options.paddingY : 14;
  button.paddingBottom = options && typeof options.paddingY === 'number' ? options.paddingY : 14;
  button.fills = [makeSolidFill(options && options.background ? options.background : '#1F1F1F')];
  bindUniformRadius(button, theme.borderRadius);
  bindColorVariable(button, 'fills', options && options.backgroundVariable ? options.backgroundVariable : theme.button1);
  applyComponentMeta(button, componentId);
  const text = await createTextLayer(name + ' Label', label, 16);
  text.textAutoResize = 'WIDTH_AND_HEIGHT';
  await applyThemeText(text, theme, {
    charactersVariable: options && options.textVariable ? options.textVariable : undefined,
    colorVariable: theme.fontColor,
  });
  if (!(options && options.textVariable)) {
    text.fills = [makeSolidFill(options && options.color ? options.color : '#FFFFFF')];
    bindColorVariable(text, 'fills', theme.fontColor);
  }
  button.appendChild(text);
  return button;
}

async function createInputField(
  name: string,
  placeholder: string,
  componentId: string,
  theme: AssetThemeVariables
): Promise<FrameNode> {
  const field = figma.createFrame();
  field.name = name;
  field.layoutMode = 'HORIZONTAL';
  field.primaryAxisSizingMode = 'FIXED';
  field.counterAxisSizingMode = 'AUTO';
  field.counterAxisAlignItems = 'CENTER';
  field.resize(320, 52);
  field.paddingLeft = 16;
  field.paddingRight = 16;
  field.paddingTop = 14;
  field.paddingBottom = 14;
  field.strokes = [makeSolidFill('#CFCFCF')];
  field.strokeWeight = 1;
  field.fills = [makeSolidFill('#FFFFFF')];
  bindUniformRadius(field, theme.borderRadius);
  bindColorVariable(field, 'strokes', theme.background2);
  applyComponentMeta(field, componentId);
  const text = await createTextLayer(name + ' Placeholder', placeholder, 16, 288);
  await applyThemeText(text, theme, { colorVariable: theme.background1 });
  field.appendChild(text);
  return field;
}

async function createCheckboxRow(
  name: string,
  label: string,
  componentId: string,
  theme: AssetThemeVariables
): Promise<FrameNode> {
  const row = figma.createFrame();
  row.name = name;
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.counterAxisAlignItems = 'CENTER';
  row.itemSpacing = 10;
  row.fills = [];
  applyComponentMeta(row, componentId);

  const box = figma.createRectangle();
  box.name = name + ' Box';
  box.resize(18, 18);
  box.strokes = [makeSolidFill('#222222')];
  box.strokeWeight = 1;
  box.fills = [makeSolidFill('#FFFFFF')];
  bindColorVariable(box, 'strokes', theme.fontColor);
  bindUniformRadius(box, theme.borderRadius);

  const text = await createTextLayer(name + ' Label', label, 14, 280);
  await applyThemeText(text, theme, { colorVariable: theme.fontColor });
  row.appendChild(box);
  row.appendChild(text);
  return row;
}

async function createSurveyBlock(theme: AssetThemeVariables): Promise<FrameNode> {
  const survey = figma.createFrame();
  survey.name = 'Survey Block';
  survey.layoutMode = 'VERTICAL';
  survey.primaryAxisSizingMode = 'AUTO';
  survey.counterAxisSizingMode = 'AUTO';
  survey.resize(360, 236);
  survey.itemSpacing = 12;
  survey.fills = [];
  applyComponentMeta(survey, 'survey_block');
  const prompt = await createTextLayer('Survey Question', 'How likely are you to purchase today?', 16, 360);
  await applyThemeText(prompt, theme, { colorVariable: theme.fontColor });
  survey.appendChild(prompt);
  for (let index = 0; index < 3; index += 1) {
    survey.appendChild(await createButtonFrame('Survey Option', 'Option ' + String(index + 1), 'survey_block', theme, {
      background: '#F2F2F2',
      color: '#111111',
      paddingX: 14,
      paddingY: 10,
      backgroundVariable: theme.background2,
    }));
  }
  return survey;
}

async function createCouponBlock(theme: AssetThemeVariables): Promise<FrameNode> {
  const coupon = figma.createFrame();
  coupon.name = 'Copy Coupon';
  coupon.layoutMode = 'HORIZONTAL';
  coupon.primaryAxisSizingMode = 'AUTO';
  coupon.counterAxisSizingMode = 'AUTO';
  coupon.counterAxisAlignItems = 'CENTER';
  coupon.itemSpacing = 12;
  coupon.fills = [];
  applyComponentMeta(coupon, 'copy_coupon');

  const code = figma.createFrame();
  code.name = 'Coupon Code';
  code.layoutMode = 'HORIZONTAL';
  code.primaryAxisSizingMode = 'AUTO';
  code.counterAxisSizingMode = 'AUTO';
  code.paddingLeft = 16;
  code.paddingRight = 16;
  code.paddingTop = 12;
  code.paddingBottom = 12;
  code.strokes = [makeSolidFill('#1F1F1F')];
  code.strokeWeight = 1;
  code.fills = [makeSolidFill('#FFFFFF')];
  bindUniformRadius(code, theme.borderRadius);
  bindColorVariable(code, 'strokes', theme.button2);
  const codeText = await createTextLayer('Coupon Label', 'SAVE15', 16);
  await applyThemeText(codeText, theme, {
    charactersVariable: theme.incentive,
    colorVariable: theme.background1,
  });
  code.appendChild(codeText);

  coupon.appendChild(code);
  coupon.appendChild(await createButtonFrame('Copy Button', 'Copy Code', 'copy_coupon', theme, {
    background: '#1F1F1F',
    color: '#FFFFFF',
    paddingX: 16,
    paddingY: 12,
    backgroundVariable: theme.highlight,
  }));
  return coupon;
}

function createProgressBar(theme: AssetThemeVariables): FrameNode {
  const bar = figma.createFrame();
  bar.name = 'Progress Bar';
  bar.layoutMode = 'NONE';
  bar.resize(320, 12);
  bar.fills = [makeSolidFill('#E6E6E6')];
  bar.cornerRadius = 999;
  bindUniformRadius(bar, theme.borderRadius);
  bindColorVariable(bar, 'fills', theme.background2);
  applyComponentMeta(bar, 'progress_bar');

  const fill = figma.createRectangle();
  fill.name = 'Progress Fill';
  fill.resize(180, 12);
  fill.cornerRadius = 999;
  fill.fills = [makeSolidFill('#1F1F1F')];
  bindUniformRadius(fill, theme.borderRadius);
  bindColorVariable(fill, 'fills', theme.highlight);
  bar.appendChild(fill);
  return bar;
}

function createDividerNode(theme: AssetThemeVariables): RectangleNode {
  const divider = figma.createRectangle();
  divider.name = 'Divider';
  divider.resize(320, 4);
  divider.cornerRadius = 999;
  divider.fills = [makeSolidFill('#1F1F1F')];
  bindColorVariable(divider, 'fills', theme.background1);
  applyComponentMeta(divider, 'divider');
  return divider;
}

function makeSolidFill(hex: string): SolidPaint {
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

function centerInViewport(node: SceneNode): void {
  const viewport = figma.viewport.center;
  node.x = viewport.x - node.width / 2;
  node.y = viewport.y - node.height / 2;
}

function supportsChildren(node: BaseNode | null | undefined): node is (BaseNode & ChildrenMixin) {
  return !!node && 'appendChild' in node && typeof (node as ChildrenMixin).appendChild === 'function';
}

function positionNearReference(node: SceneNode, reference: SceneNode): void {
  node.x = reference.x;
  node.y = reference.y + reference.height + 24;
}

function isPageNode(node: BaseNode | null | undefined): node is PageNode {
  return !!node && node.type === 'PAGE';
}

function applyComponentMeta(node: BaseNode, componentId: string): void {
  const role = COMPONENT_ROLE_MAP[componentId as keyof typeof COMPONENT_ROLE_MAP];
  setPluginMeta(node as AnyNode, {
    exportComponent: componentId,
    exportRole: role,
  });
}

async function buildProductCardFrame(theme: AssetThemeVariables): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = 'Product Card';
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.resize(160, 220);
  frame.itemSpacing = 8;
  frame.paddingTop = 12;
  frame.paddingBottom = 12;
  frame.paddingLeft = 12;
  frame.paddingRight = 12;
  frame.fills = [makeSolidFill('#F3F3F3')];
  bindColorVariable(frame, 'fills', theme.background2);
  applyComponentMeta(frame, 'product_card');

  const image = figma.createRectangle();
  image.name = 'Product Image';
  image.resize(136, 96);
  image.cornerRadius = 8;
  image.fills = [makeSolidFill('#D9D9D9')];
  bindUniformRadius(image, theme.borderRadius);
  bindColorVariable(image, 'fills', theme.background1);
  applyComponentMeta(image, 'product_image');

  const title = await createTextLayer('Product Title', 'Product Name', 14, 136);
  await applyThemeText(title, theme, { colorVariable: theme.background1 });
  applyComponentMeta(title, 'product_title');

  const subtitle = await createTextLayer('Product Subtitle', '$XX.XX', 12, 136);
  await applyThemeText(subtitle, theme, { colorVariable: theme.background1 });
  applyComponentMeta(subtitle, 'product_subtitle');

  const button = figma.createFrame();
  button.name = 'Product Button';
  button.layoutMode = 'HORIZONTAL';
  button.primaryAxisSizingMode = 'AUTO';
  button.counterAxisSizingMode = 'AUTO';
  button.paddingLeft = 12;
  button.paddingRight = 12;
  button.paddingTop = 8;
  button.paddingBottom = 8;
  button.fills = [makeSolidFill('#1F1F1F')];
  bindUniformRadius(button, theme.borderRadius);
  bindColorVariable(button, 'fills', theme.button2);
  applyComponentMeta(button, 'product_button');
  const buttonText = await createTextLayer('Button Label', 'View Item', 12);
  await loadTextNodeFont(buttonText);
  await applyThemeText(buttonText, theme, { colorVariable: theme.fontColor });
  button.appendChild(buttonText);

  frame.appendChild(image);
  frame.appendChild(title);
  frame.appendChild(subtitle);
  frame.appendChild(button);

  return frame;
}

async function buildPriceRow(
  name: string,
  leftText: string,
  rightText: string,
  componentId: string,
  theme: AssetThemeVariables
): Promise<FrameNode> {
  const row = figma.createFrame();
  row.name = name;
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  row.counterAxisAlignItems = 'CENTER';
  row.resize(280, 24);
  row.fills = [];
  applyComponentMeta(row, componentId);

  const left = await createTextLayer(name + ' Label', leftText, 14, 140);
  const right = await createTextLayer(name + ' Value', rightText, 14, 120);
  await applyThemeText(left, theme, { colorVariable: theme.background1 });
  await applyThemeText(right, theme, { colorVariable: theme.background1 });
  right.textAlignHorizontal = 'RIGHT';
  row.appendChild(left);
  row.appendChild(right);
  return row;
}

export async function createAssetComponentInstance(componentId: string): Promise<SceneNode> {
  const sourceNode = findAssetSourceComponentNode(componentId);
  const node = sourceNode ? ((sourceNode as any).clone() as SceneNode) : await buildAssetComponentNode(componentId);

  const selection = figma.currentPage.selection;
  const selectedNode = selection.length ? (selection[0] as SceneNode) : null;
  const insertionParent = selectedNode
    ? supportsChildren(selectedNode)
      ? selectedNode
      : supportsChildren(selectedNode.parent)
        ? selectedNode.parent
        : figma.currentPage
    : figma.currentPage;

  insertionParent.appendChild(node);

  if (selectedNode) {
    if (insertionParent === selectedNode) {
      node.x = 24;
      node.y = 24;
    } else {
      positionNearReference(node, selectedNode);
    }
  } else {
    centerInViewport(node);
  }

  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  return node;
}

async function buildAssetComponentNode(componentId: string): Promise<SceneNode> {
  let node: SceneNode;
  const theme = await ensureAssetThemeVariables();

  // Add new assets here. In most cases a new component only needs:
  // 1. a COMMON_COMPONENTS entry
  // 2. one switch case below
  // 3. optional custom rendering if the generic renderer is not enough
  switch (componentId) {
    case 'modal_shell':
    case 'sidebar_shell':
    case 'bottom_bar_shell': {
      const frame = figma.createFrame();
      frame.name =
        componentId === 'sidebar_shell' ? 'Sidebar Shell' :
        componentId === 'bottom_bar_shell' ? 'Bottom Bar Shell' :
        'Modal Shell';
      if (componentId === 'sidebar_shell') frame.resize(320, 660);
      else if (componentId === 'bottom_bar_shell') frame.resize(1280, 180);
      else frame.resize(640, 660);
      frame.fills = [makeSolidFill('#FFFFFF')];
      bindUniformRadius(frame, theme.borderRadius);
      bindColorVariable(frame, 'fills', theme.background2);
      applyComponentMeta(frame, componentId);
      node = frame;
      break;
    }
    case 'content_stack': {
      const frame = figma.createFrame();
      frame.name = 'Content Stack';
      frame.layoutMode = 'VERTICAL';
      frame.primaryAxisSizingMode = 'AUTO';
      frame.counterAxisSizingMode = 'FIXED';
      frame.resize(560, 420);
      frame.itemSpacing = 16;
      frame.fills = [];
      bindColorVariable(frame, 'fills', theme.background2);
      applyComponentMeta(frame, componentId);
      node = frame;
      break;
    }
    case 'headline_block':
      node = await createTextLayer('Headline', 'Please Input Headline Here.', 32, 420);
      await applyThemeText(node as TextNode, theme);
      applyComponentMeta(node, componentId);
      break;
    case 'subtext_block':
      node = await createTextLayer('Subtext', 'Subtext copy here.', 16, 420);
      await applyThemeText(node as TextNode, theme);
      applyComponentMeta(node, componentId);
      break;
    case 'eyebrow_block':
      node = await createTextLayer('Eyebrow', 'FROM YOUR CART', 12, 220);
      await applyThemeText(node as TextNode, theme, { charactersVariable: theme.incentive });
      applyComponentMeta(node, componentId);
      break;
    case 'divider':
      node = createDividerNode(theme);
      break;
    case 'primary_button':
      node = await createButtonFrame('Primary Button', 'Redeem Now', componentId, theme);
      break;
    case 'thank_you_button':
      node = await createButtonFrame('Thank You Button', 'Thank You', componentId, theme);
      break;
    case 'no_thanks_button':
      node = await createButtonFrame('No Thanks Button', 'No Thanks', componentId, theme, {
        background: '#FFFFFF',
        color: '#111111',
        paddingX: 18,
        paddingY: 10,
        backgroundVariable: theme.highlight,
      });
      break;
    case 'product_grid': {
      const grid = figma.createFrame();
      grid.name = 'Product Grid';
      grid.layoutMode = 'HORIZONTAL';
      grid.primaryAxisSizingMode = 'AUTO';
      grid.counterAxisSizingMode = 'AUTO';
      grid.itemSpacing = 16;
      grid.fills = [];
      applyComponentMeta(grid, componentId);
      grid.setPluginData('exportCollection', 'products');
      for (let index = 0; index < 3; index += 1) {
        grid.appendChild(await buildProductCardFrame(theme));
      }
      node = grid;
      break;
    }
    case 'product_card':
      node = await buildProductCardFrame(theme);
      break;
    case 'product_image': {
      const image = figma.createRectangle();
      image.name = 'Product Image';
      image.resize(160, 120);
      image.cornerRadius = 8;
      image.fills = [makeSolidFill('#D9D9D9')];
      bindUniformRadius(image, theme.borderRadius);
      bindColorVariable(image, 'fills', theme.background1);
      applyComponentMeta(image, componentId);
      node = image;
      break;
    }
    case 'product_title':
      node = await createTextLayer('Product Title', 'Product Name', 14, 160);
      await applyThemeText(node as TextNode, theme, { colorVariable: theme.background1 });
      applyComponentMeta(node, componentId);
      break;
    case 'product_subtitle':
      node = await createTextLayer('Product Subtitle', '$XX.XX', 12, 160);
      await applyThemeText(node as TextNode, theme, { colorVariable: theme.background1 });
      applyComponentMeta(node, componentId);
      break;
    case 'product_price':
      node = await createTextLayer('Product Price', '$XX.XX', 14, 120);
      await applyThemeText(node as TextNode, theme, { colorVariable: theme.background1 });
      applyComponentMeta(node, componentId);
      break;
    case 'product_button':
      node = await createButtonFrame('Product Button', 'View Item', componentId, theme, {
        paddingX: 14,
        paddingY: 8,
        backgroundVariable: theme.button2,
      });
      break;
    case 'price_table': {
      const summary = figma.createFrame();
      summary.name = 'Price Table';
      summary.layoutMode = 'VERTICAL';
      summary.primaryAxisSizingMode = 'AUTO';
      summary.counterAxisSizingMode = 'FIXED';
      summary.resize(280, 96);
      summary.itemSpacing = 8;
      summary.fills = [makeSolidFill('#EAEAEA')];
      bindColorVariable(summary, 'fills', theme.fontColor);
      applyComponentMeta(summary, componentId);
      summary.appendChild(await buildPriceRow('Subtotal', 'Subtotal:', '$XX.XX', 'price_subtotal', theme));
      summary.appendChild(await buildPriceRow('Discount', 'Discount:', '-$XX.XX', 'price_discount', theme));
      summary.appendChild(await buildPriceRow('Total', 'Total:', '$XX.XX', 'price_total', theme));
      node = summary;
      break;
    }
    case 'price_subtotal':
    case 'price_discount':
    case 'price_total':
      node = await buildPriceRow(
        componentId === 'price_subtotal' ? 'Subtotal' : componentId === 'price_discount' ? 'Discount' : 'Total',
        componentId === 'price_subtotal' ? 'Subtotal:' : componentId === 'price_discount' ? 'Discount:' : 'Total:',
        componentId === 'price_discount' ? '-$XX.XX' : '$XX.XX',
        componentId,
        theme
      );
      break;
    case 'email_input':
      node = await createInputField('Email Input', 'Enter your email', componentId, theme);
      break;
    case 'phone_input':
      node = await createInputField('Phone Input', 'Enter your phone number', componentId, theme);
      break;
    case 'survey_block':
      node = await createSurveyBlock(theme);
      break;
    case 'copy_coupon':
      node = await createCouponBlock(theme);
      break;
    case 'optin_component':
      node = await createCheckboxRow('Opt-In', 'Yes, send me updates and offers.', componentId, theme);
      break;
    case 'countdown_timer': {
      const timer = figma.createFrame();
      timer.name = 'Countdown Timer';
      timer.layoutMode = 'HORIZONTAL';
      timer.primaryAxisSizingMode = 'AUTO';
      timer.counterAxisSizingMode = 'AUTO';
      timer.paddingLeft = 16;
      timer.paddingRight = 16;
      timer.paddingTop = 10;
      timer.paddingBottom = 10;
      timer.fills = [makeSolidFill('#1F1F1F')];
      bindUniformRadius(timer, theme.borderRadius);
      bindColorVariable(timer, 'fills', theme.background1);
      applyComponentMeta(timer, componentId);
      const time = await createTextLayer('Timer Text', '09:59', 18);
      await applyThemeText(time, theme, { colorVariable: theme.fontColor });
      timer.appendChild(time);
      node = timer;
      break;
    }
    case 'progress_bar':
      node = createProgressBar(theme);
      break;
    case 'close_control': {
      const frame = figma.createFrame();
      frame.name = 'Close Button';
      frame.layoutMode = 'HORIZONTAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'FIXED';
      frame.primaryAxisAlignItems = 'CENTER';
      frame.counterAxisAlignItems = 'CENTER';
      frame.resize(28, 28);
      frame.fills = [];
      frame.strokes = [makeSolidFill('#BDBDBD')];
      frame.strokeWeight = 1;
      bindUniformRadius(frame, theme.borderRadius);
      bindColorVariable(frame, 'strokes', theme.background2);
      applyComponentMeta(frame, componentId);
      const text = await createTextLayer('Close Label', '×', 18);
      text.textAutoResize = 'WIDTH_AND_HEIGHT';
      await applyThemeText(text, theme, { colorVariable: theme.fontColor });
      frame.appendChild(text);
      node = frame;
      break;
    }
    case 'disclaimer_text':
      node = await createTextLayer('Disclaimer', 'We use your information in accordance with our Privacy Policy.', 10, 320);
      await applyThemeText(node as TextNode, theme);
      applyComponentMeta(node, componentId);
      break;
    case 'media_panel':
    default: {
      const rect = figma.createRectangle();
      rect.name = 'Media Panel';
      rect.resize(220, 320);
      rect.fills = [makeSolidFill('#D9D9D9')];
      bindUniformRadius(rect, theme.borderRadius);
      bindColorVariable(rect, 'fills', theme.background2);
      applyComponentMeta(rect, 'media_panel');
      node = rect;
      break;
    }
  }

  return node;
}

function findAssetLibraryPage(): PageNode | undefined {
  for (let index = 0; index < figma.root.children.length; index += 1) {
    const child = figma.root.children[index];
    if (isPageNode(child) && child.name === ASSET_LIBRARY_PAGE_NAME) return child;
  }
  return undefined;
}

function findAssetSourceComponentNode(componentId: string): SceneNode | undefined {
  const page = findAssetLibraryPage();
  if (!page) return undefined;
  const stack: BaseNode[] = page.children.slice();
  while (stack.length) {
    const current = stack.shift();
    if (!current) continue;
    const meta = getPluginMeta(current as AnyNode);
    if (meta.exportComponent === componentId && current.type !== 'PAGE') {
      return current as SceneNode;
    }
    if ('children' in current && Array.isArray((current as ChildrenMixin).children)) {
      for (let index = 0; index < (current as ChildrenMixin).children.length; index += 1) {
        stack.push((current as ChildrenMixin).children[index]);
      }
    }
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

export async function ensureTemplatesPageFromLibrary(): Promise<PageNode> {
  const library = BUNDLED_TEMPLATE_LIBRARY;
  const themeSnapshot = library.assetTheme.length
    ? library.assetTheme
    : library.entries.length
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
  const heading = await createTextLayer(label, label, 20);
  await applyThemeText(heading, theme, { colorVariable: theme.fontColor });
  frame.appendChild(heading);
  return frame;
}

export async function ensureAssetSourcePage(): Promise<PageNode> {
  const libraryTheme = BUNDLED_TEMPLATE_LIBRARY.assetTheme.length
    ? BUNDLED_TEMPLATE_LIBRARY.assetTheme
    : BUNDLED_TEMPLATE_LIBRARY.entries.length
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
    if (findAssetSourceComponentNode(component.id)) continue;
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
  const hidePaths = uniqueIds(dynamicNodeIds.concat(alwaysHiddenNodeIds))
    .map(function (id) {
      return pathMaps.idToPath.get(id) || '';
    })
    .filter(Boolean);

  try {
    const cloneMaps = buildPathMaps(clone);
    for (const path of hidePaths) {
      const node = cloneMaps.pathToNode.get(path);
      if (node) node.visible = false;
    }

    if (removeAllText) {
      walkScenePaths(clone, function (node) {
        if (node.type === 'TEXT') node.visible = false;
      });
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
  const fileName = sanitizeFilePart(
    figma.root && figma.root.name ? figma.root.name : 'figma-file'
  );

  if (!nodes.length) return fileName + '_' + getYearMonth() + '.zip';
  if (nodes.length === 1) return buildExportBaseName(nodes[0]) + '.zip';

  const pageName = sanitizeFilePart(
    figma.currentPage && figma.currentPage.name ? figma.currentPage.name : 'page'
  );
  return fileName + '_' + pageName + '_' + getYearMonth() + '.zip';
}
