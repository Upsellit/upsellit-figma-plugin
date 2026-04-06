/* eslint-disable @typescript-eslint/no-explicit-any */

import { ThemeVariableSnapshot } from '../types';

export const ASSET_LIBRARY_PAGE_NAME = 'Upsellit Asset Source';
export const TEMPLATES_PAGE_NAME = 'Upsellit Templates';
export const ASSET_VARIABLE_COLLECTION_NAME = 'Upsellit Asset Tokens';

export type AssetThemeVariables = {
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

export async function ensureAssetThemeVariables(): Promise<AssetThemeVariables> {
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

export async function applyThemeSnapshot(snapshot: ThemeVariableSnapshot[] | undefined): Promise<AssetThemeVariables> {
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

export function bindColorVariable(node: any, field: 'fills' | 'strokes', variable: Variable): void {
  const current = Array.isArray(node[field]) ? node[field] : [];
  const paints = current.length ? current.slice() : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  const nextPaints = paints.map(function (paint: any) {
    if (!paint || paint.type !== 'SOLID') return paint;
    return figma.variables.setBoundVariableForPaint(paint, 'color', variable);
  });
  node[field] = nextPaints;
}

export function bindUniformRadius(node: any, variable: Variable): void {
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

export async function applyThemeFont(textNode: TextNode, theme: AssetThemeVariables): Promise<void> {
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

export async function applyThemeText(
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
