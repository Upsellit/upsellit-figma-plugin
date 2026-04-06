export function sanitizeFilePart(text: string): string {
  return (
    String(text || 'untitled')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeTemplateString(text: string): string {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

export function formatHtml(source: string): string {
  const tokens = String(source || '')
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);
  const voidTags: Record<string, boolean> = {
    area: true,
    base: true,
    br: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true,
  };
  const out: string[] = [];
  let depth = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isClosing = /^<\//.test(token);
    const tagMatch = token.match(/^<\/?([a-zA-Z0-9_-]+)/);
    const tagName = tagMatch ? String(tagMatch[1]).toLowerCase() : '';
    const isInlinePair = /^<[^>]+>.*<\/[^>]+>$/.test(token);
    const isVoid = !!voidTags[tagName] || /\/>$/.test(token);
    const isOpening = /^<[^/!][^>]*>$/.test(token) && !isVoid && !isInlinePair;

    if (isClosing) depth = Math.max(0, depth - 1);
    out.push(new Array(depth + 1).join('\t') + token);
    if (!isClosing && isOpening) depth += 1;
  }

  return out.join('\n') + '\n';
}

export function formatCss(source: string): string {
  const input = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\{\s*/g, ' {\n')
    .replace(/;\s*/g, ';\n')
    .replace(/\}\s*/g, '\n}\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  const lines = input.split('\n');
  const out: string[] = [];
  let depth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (line.indexOf('}') === 0) depth = Math.max(0, depth - 1);
    out.push(new Array(depth + 1).join('\t') + line);
    if (line.lastIndexOf('{') === line.length - 1) depth += 1;
  }

  return out.join('\n') + '\n';
}

export function formatJs(source: string): string {
  const lines = String(source || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const out: string[] = [];
  let depth = 0;
  let templateDepth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index].replace(/\s+$/g, '');
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }

    const isTemplateContent = templateDepth > 0 && trimmed !== '`;' && trimmed !== '`';
    if (!isTemplateContent && (/^[}\])]/.test(trimmed) || /^}\s*catch\b/.test(trimmed) || /^}\s*else\b/.test(trimmed))) {
      depth = Math.max(0, depth - 1);
    }

    const indent = isTemplateContent ? depth + 1 : depth;
    out.push(new Array(indent + 1).join('\t') + trimmed);

    const backtickCount = (trimmed.match(/`/g) || []).length;
    if (backtickCount % 2 === 1) {
      templateDepth = templateDepth ? 0 : 1;
    }

    if (!templateDepth) {
      const openCount = (trimmed.match(/\{/g) || []).length;
      const closeCount = (trimmed.match(/\}/g) || []).length;
      if (openCount > closeCount && !/^}/.test(trimmed)) {
        depth += openCount - closeCount;
      }
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function minifyHtml(source: string): string {
  return String(source || '')
    .replace(/\n+/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function formatFileText(name: string, text: string): string {
  if (/\.html$/i.test(name)) return formatHtml(text);
  if (/\.css$/i.test(name)) return formatCss(text);
  if (/\.json$/i.test(name)) return formatJson(JSON.parse(text));
  if (/\.js$/i.test(name)) return formatJs(text);
  return text;
}
