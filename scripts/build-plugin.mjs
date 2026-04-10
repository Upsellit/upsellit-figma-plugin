import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryFile = path.join(projectRoot, 'main.ts');
const outputFile = path.join(projectRoot, 'main.js');
const googleFontsCacheFile = path.join(projectRoot, 'render', 'google-fonts-cache.ts');
const googleFontsJsonFile = path.join(projectRoot, 'render', 'google-fonts.json');

function parseDotEnv(source) {
  const env = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function fontCacheModuleSource(families, sourceLabel) {
  return (
    'export const GOOGLE_FONT_FAMILIES = ' +
    JSON.stringify(families, null, 2) +
    ';\n\nexport const GOOGLE_FONT_CACHE_SOURCE = ' +
    JSON.stringify(sourceLabel) +
    ';\n'
  );
}

async function updateGoogleFontsCache() {
  try {
    const localJson = JSON.parse(await fs.readFile(googleFontsJsonFile, 'utf8'));
    if (localJson && typeof localJson === 'object' && !Array.isArray(localJson)) {
      const families = Object.keys(localJson)
        .map(function (family) {
          return String(family).trim();
        })
        .filter(Boolean)
        .sort(function (a, b) {
          return a.localeCompare(b);
        });
      if (families.length) {
        await fs.writeFile(googleFontsCacheFile, fontCacheModuleSource(families, 'local-google-fonts-json'), 'utf8');
        return;
      }
    }
  } catch (_error) {
    // Fall through to API/cached fallback.
  }

  let envSource = '';
  try {
    envSource = await fs.readFile(path.join(projectRoot, '.env'), 'utf8');
  } catch (_error) {
    try {
      await fs.access(googleFontsCacheFile);
    } catch (_accessError) {
      await fs.writeFile(
        googleFontsCacheFile,
        fontCacheModuleSource(['Merriweather Sans'], 'fallback'),
        'utf8'
      );
    }
    return;
  }

  const env = parseDotEnv(envSource);
  const apiKey = env.GOOGLE_FONTS;
  if (!apiKey) return;

  try {
    const response = await fetch('https://www.googleapis.com/webfonts/v1/webfonts?key=' + encodeURIComponent(apiKey));
    if (!response.ok) {
      throw new Error('Google Fonts API returned ' + response.status);
    }

    const payload = await response.json();
    const families = Array.isArray(payload && payload.items)
      ? payload.items
          .map(function (item) {
            return item && typeof item.family === 'string' ? item.family.trim() : '';
          })
          .filter(Boolean)
          .sort(function (a, b) {
            return a.localeCompare(b);
          })
      : [];

    if (!families.length) {
      throw new Error('Google Fonts API returned no families');
    }

    await fs.writeFile(googleFontsCacheFile, fontCacheModuleSource(families, 'google-fonts-api'), 'utf8');
  } catch (error) {
    console.warn('[build-plugin] Unable to refresh Google Fonts cache:', error instanceof Error ? error.message : String(error));
    try {
      await fs.access(googleFontsCacheFile);
    } catch (_accessError) {
      await fs.writeFile(
        googleFontsCacheFile,
        fontCacheModuleSource(['Merriweather Sans'], 'fallback'),
        'utf8'
      );
    }
  }
}

function normalizeToPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function moduleIdFromFile(filePath) {
  const relative = normalizeToPosix(path.relative(projectRoot, filePath));
  return relative.replace(/\.ts$/, '');
}

function resolveImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base + '.ts',
    path.join(base, 'index.ts'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = require('node:fs').statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch (_error) {
      // ignore
    }
  }

  throw new Error('Unable to resolve import "' + specifier + '" from ' + fromFile);
}

function collectRelativeImports(source) {
  const imports = [];
  const patterns = [
    /import\s+(?:type\s+)?(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+(?:type\s+)?(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g,
    /require\(['"]([^'"]+)['"]\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) {
      if (match[1] && match[1].startsWith('.')) {
        imports.push(match[1]);
      }
    }
  }

  return Array.from(new Set(imports));
}

async function buildModuleGraph(filePath, graph, visited) {
  const resolved = path.resolve(filePath);
  if (visited.has(resolved)) return;
  visited.add(resolved);

  const source = await fs.readFile(resolved, 'utf8');
  graph.set(resolved, source);

  const imports = collectRelativeImports(source);
  for (const specifier of imports) {
    await buildModuleGraph(resolveImport(resolved, specifier), graph, visited);
  }
}

function transpileModule(filePath, sourceText) {
  const result = ts.transpileModule(sourceText, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
    },
    fileName: filePath,
    reportDiagnostics: false,
  });

  return result.outputText;
}

function bundleModules(graph) {
  const moduleEntries = [];

  for (const [filePath, sourceText] of graph.entries()) {
    const id = moduleIdFromFile(filePath);
    const compiled = transpileModule(filePath, sourceText).trim();
    moduleEntries.push(
      JSON.stringify(id) +
        ': function(require, module, exports) {\n' +
        compiled +
        '\n}'
    );
  }

  return (
    '(function(){\n' +
    'var modules = {\n' +
    moduleEntries.join(',\n') +
    '\n};\n' +
    'var cache = {};\n' +
    'function normalize(parts){\n' +
    '  var out=[];\n' +
    '  for(var i=0;i<parts.length;i+=1){\n' +
    '    var part=parts[i];\n' +
    '    if(!part||part==="."){continue;}\n' +
    '    if(part===".."){out.pop();}else{out.push(part);}\n' +
    '  }\n' +
    '  return out.join("/");\n' +
    '}\n' +
    'function dirname(id){\n' +
    '  var parts=id.split("/");\n' +
    '  parts.pop();\n' +
    '  return parts.join("/");\n' +
    '}\n' +
    'function resolve(fromId, request){\n' +
    '  if(request.slice(0,2)!=="./"&&request.slice(0,3)!=="../"){return request;}\n' +
    '  var fromDir=dirname(fromId);\n' +
    '  var joined=(fromDir?fromDir+"/":"")+request;\n' +
    '  var full=normalize(joined.split("/"));\n' +
    '  if(modules[full]){return full;}\n' +
    '  if(modules[full+"/index"]){return full+"/index";}\n' +
    '  if(modules[full.replace(/\\.js$/,"")]){return full.replace(/\\.js$/,"");}\n' +
    '  if(modules[full.replace(/\\.js$/,"")+"/index"]){return full.replace(/\\.js$/,"")+"/index";}\n' +
    '  return full;\n' +
    '}\n' +
    'function load(id){\n' +
    '  if(cache[id]){return cache[id].exports;}\n' +
    '  if(!modules[id]){throw new Error("Module not found: "+id);}\n' +
    '  var module={exports:{}};\n' +
    '  cache[id]=module;\n' +
    '  modules[id](function(request){return load(resolve(id, request));}, module, module.exports);\n' +
    '  return module.exports;\n' +
    '}\n' +
    'load("main");\n' +
    '})();\n'
  );
}

const graph = new Map();
await updateGoogleFontsCache();
await buildModuleGraph(entryFile, graph, new Set());
const bundle = bundleModules(graph);
await fs.writeFile(outputFile, bundle, 'utf8');
