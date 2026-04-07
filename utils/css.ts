import { NormalizedNode } from '../types';

export function cssDeclarations(style: Record<string, string | number | undefined>): string {
  return Object.entries(style)
    .filter(function (_entry): _entry is [string, string | number] {
      return _entry[1] != null && _entry[1] !== '';
    })
    .map(function (entry) {
      return entry[0] + ': ' + entry[1] + ';';
    })
    .join(' ');
}

export function toPercent(value: number, total: number): string {
  if (!total) return '0%';
  return ((value / total) * 100).toFixed(4).replace(/\.?0+$/, '') + '%';
}

export function lineHeightCss(node: NormalizedNode): string | undefined {
  if (node.style.lineHeight) return node.style.lineHeight + 'px';
  if (node.style.fontSize) return (node.style.fontSize * 1.2).toFixed(2).replace(/\.?0+$/, '') + 'px';
  return undefined;
}

export function pxToEm(value?: number, base = 16, scale = 1): string | undefined {
  if (typeof value !== 'number') return undefined;
  return (value / scale / base).toFixed(4).replace(/\.?0+$/, '') + 'em';
}

export function scalePx(value?: number, scale = 1): number | undefined {
  if (typeof value !== 'number') return undefined;
  return value / scale;
}

export function textTransformFromCase(textCase?: string): string | undefined {
  if (textCase === 'upper') return 'uppercase';
  if (textCase === 'lower') return 'lowercase';
  if (textCase === 'title') return 'capitalize';
  return undefined;
}
