/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  applyThemeText,
  AssetThemeVariables,
  bindColorVariable,
  bindUniformRadius,
  ensureAssetThemeVariables,
} from './theme';
import {
  applyComponentMeta,
  centerInViewport,
  getPluginMeta,
  isPageNode,
  loadTextNodeFont,
  makeSolidFill,
  positionNearReference,
  supportsChildren,
} from './shared';
import { ASSET_LIBRARY_PAGE_NAME } from './theme';

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

export async function buildAssetComponentNode(componentId: string): Promise<SceneNode> {
  let node: SceneNode;
  const theme = await ensureAssetThemeVariables();

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
    const meta = getPluginMeta(current as any);
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
