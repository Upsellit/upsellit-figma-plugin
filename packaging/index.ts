/* eslint-disable @typescript-eslint/no-explicit-any */

import { COMMON_COMPONENTS, COMPONENT_BY_ID, COMPONENT_BY_ROLE } from '../constants';
import { analyzeSelection, flattenTree, uniqueIds } from '../analysis/index';
import { ClientComponentCatalogEntry, ClientComponentInstance, ExportFile, NormalizedNode } from '../types';
import {
  attachProductAssets,
  buildExportBaseName,
  buildExportPackageName,
  buildNodeIndex,
  exportMockupPng,
  exportFlattenedBackgroundVariant,
  getAssetThemeSnapshot,
  getExportPageNodes,
} from '../figma/index';
import {
  renderFlattenedHtml,
  buildUsiJsFile,
  extractCampaignCss,
  renderDevModePage,
  renderMultiExportIndex,
  renderMockupReviewIndex,
  renderPreviewIndex,
  renderClientComponentsPage,
  renderRawFallback,
  renderSemanticHtml,
} from '../render/index';
import { formatFileText, formatJson } from '../utils/string';

function formatCompactJson(value: unknown): string {
  return JSON.stringify(value);
}

function buildLibraryManifestEntry(entry: {
  frameName: string;
  folder: string;
  schema: any;
  ast: NormalizedNode;
  assetTheme: any[];
  assets: {
    mockup?: string;
    flattenedLive?: string;
    flattenedTextBaked?: string;
    productAssets: string[];
    previewPages?: string[];
    cssFiles?: string[];
    jsFiles?: string[];
  };
}): {
  frameName: string;
  folder: string;
  schema: any;
  ast: NormalizedNode;
  assets: {
    mockup?: string;
    flattenedLive?: string;
    flattenedTextBaked?: string;
    productAssets: string[];
    previewPages?: string[];
    cssFiles?: string[];
    jsFiles?: string[];
  };
} {
  return {
    frameName: entry.frameName,
    folder: entry.folder,
    schema: entry.schema,
    ast: entry.ast,
    assets: entry.assets,
  };
}

function collectFlattenedHiddenAssetNodeIds(root: NormalizedNode, hideVisibleText: boolean): string[] {
  return flattenTree(root)
    .filter(function (node) {
      const definition = node.componentOverride && COMPONENT_BY_ID[node.componentOverride]
        ? COMPONENT_BY_ID[node.componentOverride]
        : COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || 'other'];
      if (!definition) return false;
      return hideVisibleText ? definition.render.flattened.textBaked === false : definition.render.flattened.liveText === false;
    })
    .map(function (node) {
      return node.id;
    });
}

function collectClientComponentInstances(
  root: NormalizedNode,
  sourceFrameName: string,
  sourceFolder: string
): ClientComponentInstance[] {
  return flattenTree(root)
    .filter(function (node) {
      return !node.ignored && !!node.componentOverride && !!COMPONENT_BY_ID[node.componentOverride];
    })
    .map(function (node) {
      const text = (node.text || '').trim();
      return {
        componentId: node.componentOverride as ClientComponentInstance['componentId'],
        sourceFrameName: sourceFrameName,
        sourceFolder: sourceFolder,
        nodeId: node.id,
        nodeName: node.name,
        text: text || undefined,
        bounds: node.bounds,
        layout: node.layout,
        style: node.style,
      };
    });
}

function buildClientComponentCatalog(
  instances: ClientComponentInstance[]
): ClientComponentCatalogEntry[] {
  const entries: Partial<Record<ClientComponentCatalogEntry['id'], ClientComponentCatalogEntry>> = {};

  for (let index = 0; index < instances.length; index += 1) {
    const instance = instances[index];
    const definition = COMPONENT_BY_ID[instance.componentId];
    if (!definition) continue;
    if (!entries[definition.id]) {
      entries[definition.id] = {
        id: definition.id,
        label: definition.label,
        role: definition.role,
        category: definition.category,
        description: definition.description,
        render: definition.render,
        usageCount: 0,
        templateCount: 0,
        templates: [],
        defaultInstance: instance,
        instances: [],
      };
    }
    const entry = entries[definition.id] as ClientComponentCatalogEntry;
    entry.usageCount += 1;
    entry.instances.push(instance);
    if (entry.templates.indexOf(instance.sourceFrameName) === -1) {
      entry.templates.push(instance.sourceFrameName);
      entry.templateCount += 1;
    }
  }

  return Object.keys(entries)
    .map(function (id) {
      return entries[id as ClientComponentCatalogEntry['id']] as ClientComponentCatalogEntry;
    })
    .sort(function (a, b) {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.label.localeCompare(b.label);
    });
}

async function buildExportFilesForNode(rootNode: any, filePrefix: string): Promise<{
  files: ExportFile[];
  report: any;
  schema: any;
  images: Array<{ name: string; href: string }>;
  clientComponents: ClientComponentInstance[];
  importManifest: {
    frameName: string;
    folder: string;
    schema: any;
    ast: NormalizedNode;
    assetTheme: any[];
    assets: {
      mockup?: string;
      flattenedLive?: string;
      flattenedTextBaked?: string;
      productAssets: string[];
      previewPages: string[];
      cssFiles: string[];
      jsFiles: string[];
    };
  };
}> {
  const exportBaseName = buildExportBaseName(rootNode);
  const nodeIndex = buildNodeIndex(rootNode);
  const analysis = analyzeSelection(rootNode);
  const sourceFrameName = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
  const pageNodes = getExportPageNodes(rootNode);
  const assetTheme = await getAssetThemeSnapshot();
  const mockupAsset = await exportMockupPng(rootNode, exportBaseName + '_mockup_1x.png');
  const assets = await attachProductAssets(analysis.schema.products, nodeIndex, exportBaseName);
  const semantic = renderSemanticHtml(analysis.schema, analysis.ast);
  const raw = renderRawFallback(analysis.ast);
  const flattenedTextAssetName = exportBaseName + '_flattened_text_baked.png';
  const flattenedLiveAssetName = exportBaseName + '_flattened_live_text.png';
  const flattenedTextAsset = await exportFlattenedBackgroundVariant(
    rootNode,
    uniqueIds(analysis.dynamicNodeIds.concat(collectFlattenedHiddenAssetNodeIds(analysis.ast, true))),
    analysis.disclaimerNodeId ? [analysis.disclaimerNodeId] : [],
    false,
    flattenedTextAssetName,
    uniqueIds
  );
  const flattenedLiveAlwaysHidden: string[] = [];
  if (analysis.disclaimerNodeId) flattenedLiveAlwaysHidden.push(analysis.disclaimerNodeId);
  if (analysis.summaryNodeId) flattenedLiveAlwaysHidden.push(analysis.summaryNodeId);
  const flattenedLiveAsset = await exportFlattenedBackgroundVariant(
    rootNode,
    uniqueIds(analysis.dynamicNodeIds.concat(collectFlattenedHiddenAssetNodeIds(analysis.ast, false))),
    flattenedLiveAlwaysHidden,
    true,
    flattenedLiveAssetName,
    uniqueIds
  );
  const flattenedTextVariant = renderFlattenedHtml(analysis.ast, analysis, flattenedTextAssetName, true);
  const flattenedLiveVariant = renderFlattenedHtml(analysis.ast, analysis, flattenedLiveAssetName, false);
  const pageVariants: Array<{ key: string; variant: any; analysis: any }> = [];
  for (let index = 0; index < pageNodes.length; index += 1) {
    const pageAnalysis = analyzeSelection(pageNodes[index].node);
    const pageVariant = renderFlattenedHtml(pageAnalysis.ast, pageAnalysis, '', false);
    pageVariants.push({
      key: pageNodes[index].key,
      variant: pageVariant,
      analysis: pageAnalysis,
    });
  }
  const usiJsFile = buildUsiJsFile(pageVariants);
  const images: Array<{ name: string; href: string }> = [];
  if (mockupAsset) images.push({ name: mockupAsset.name, href: mockupAsset.name });
  if (flattenedLiveAsset) images.push({ name: flattenedLiveAsset.name, href: flattenedLiveAsset.name });
  if (flattenedTextAsset) images.push({ name: flattenedTextAsset.name, href: flattenedTextAsset.name });
  for (let index = 0; index < assets.length; index += 1) {
    images.push({ name: assets[index].name, href: assets[index].name });
  }
  const previewTitle = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
  const clientComponents = collectClientComponentInstances(analysis.ast, sourceFrameName, filePrefix || exportBaseName);
  const formattedDevCss = formatFileText('devmode.css', extractCampaignCss(flattenedTextVariant.css));
  const formattedDevJs = formatFileText('devmode.js', flattenedTextVariant.js);
  const previewHtml = renderPreviewIndex(previewTitle, images);
  const devModeHtml = renderDevModePage(
    previewTitle,
    flattenedTextAssetName,
    formattedDevCss,
    formattedDevJs
  );
  const prefixed = function (name: string): string {
    return filePrefix ? filePrefix + '/' + name : name;
  };
  const prefixedBinary = function (file: ExportFile): ExportFile {
    if ('text' in file) return file;
    return {
      name: prefixed(file.name),
      base64: file.base64,
      mime: file.mime,
    };
  };

  const files: ExportFile[] = [
    { name: prefixed('index.html'), text: previewHtml },
    { name: prefixed('devmode.html'), text: devModeHtml },
    { name: prefixed('css/styles.css'), text: semantic.css },
    { name: prefixed('semantic.html'), text: semantic.html },
    { name: prefixed('css/semantic.css'), text: semantic.css },
    { name: prefixed('flattened_text_baked.html'), text: flattenedTextVariant.html },
    { name: prefixed('css/flattened_text_baked.css'), text: flattenedTextVariant.css },
    { name: prefixed('js/flattened_text_baked.js'), text: flattenedTextVariant.js },
    { name: prefixed('flattened_live_text.html'), text: flattenedLiveVariant.html },
    { name: prefixed('css/flattened_live_text.css'), text: flattenedLiveVariant.css },
    { name: prefixed('js/flattened_live_text.js'), text: flattenedLiveVariant.js },
    { name: prefixed('js/usi_js.js'), text: usiJsFile },
    { name: prefixed('fallback-raw.html'), text: raw.html },
    { name: prefixed('css/fallback.css'), text: raw.css },
    {
      name: prefixed('export.json'),
      text: formatJson({
        schema: analysis.schema,
        report: analysis.report,
        ast: analysis.ast,
        roleMap: analysis.roleMap,
        dynamicNodeIds: analysis.dynamicNodeIds,
        commonComponents: COMMON_COMPONENTS,
      }),
    },
    {
      name: prefixed('asset_components.json'),
      text: formatJson({
        commonComponents: COMMON_COMPONENTS,
        nodeAssignments: (function () {
          const assignments: Array<{
            id: string;
            name: string;
            role?: string;
            component?: string;
            collection?: string;
            ignore?: string;
          }> = [];
          const stack = [analysis.ast];
          while (stack.length) {
            const current = stack.shift();
            if (!current) continue;
            if (current.metadata.exportRole || current.metadata.exportComponent || current.metadata.exportCollection || current.metadata.exportIgnore) {
              assignments.push({
                id: current.id,
                name: current.name,
                role: current.metadata.exportRole,
                component: current.metadata.exportComponent,
                collection: current.metadata.exportCollection,
                ignore: current.metadata.exportIgnore,
              });
            }
            for (let childIndex = 0; childIndex < current.children.length; childIndex += 1) {
              stack.push(current.children[childIndex]);
            }
          }
          return assignments;
        })(),
      }),
    },
    {
      name: prefixed('import_manifest.json'),
      text: formatJson({
        frameName: sourceFrameName,
        folder: filePrefix || exportBaseName,
        assetTheme: assetTheme,
        schema: analysis.schema,
        ast: analysis.ast,
        assets: {
          mockup: mockupAsset ? mockupAsset.name : undefined,
          flattenedLive: flattenedLiveAsset ? flattenedLiveAsset.name : undefined,
          flattenedTextBaked: flattenedTextAsset ? flattenedTextAsset.name : undefined,
          productAssets: assets.map(function (asset) { return asset.name; }),
        },
      }),
    },
    ...(mockupAsset ? [prefixedBinary(mockupAsset)] : []),
    ...(flattenedTextAsset ? [prefixedBinary(flattenedTextAsset)] : []),
    ...(flattenedLiveAsset ? [prefixedBinary(flattenedLiveAsset)] : []),
    ...assets.map(prefixedBinary),
  ];

  const formattedFiles: ExportFile[] = files.map(function (file) {
    if (!('text' in file)) return file;
    return {
      name: file.name,
      text: formatFileText(file.name, file.text),
    };
  });

  return {
    files: formattedFiles,
    report: analysis.report,
    schema: analysis.schema,
    images: images,
    clientComponents: clientComponents,
    importManifest: {
      frameName: sourceFrameName,
      folder: filePrefix || exportBaseName,
      schema: analysis.schema,
      ast: analysis.ast,
      assetTheme: assetTheme,
      assets: {
        mockup: mockupAsset ? mockupAsset.name : undefined,
        flattenedLive: flattenedLiveAsset ? flattenedLiveAsset.name : undefined,
        flattenedTextBaked: flattenedTextAsset ? flattenedTextAsset.name : undefined,
        productAssets: assets.map(function (asset) { return asset.name; }),
        previewPages: ['index.html', 'semantic.html', 'flattened_live_text.html', 'flattened_text_baked.html', 'fallback-raw.html', 'devmode.html'],
        cssFiles: ['css/styles.css', 'css/semantic.css', 'css/flattened_live_text.css', 'css/flattened_text_baked.css', 'css/fallback.css'],
        jsFiles: ['js/usi_js.js', 'js/flattened_live_text.js', 'js/flattened_text_baked.js'],
      },
    },
  };
}

export async function buildSemanticExport(rootNodes: any | any[]): Promise<{
  packageFileName: string;
  files: ExportFile[];
  report: any;
  schema: any;
}> {
  const nodes = Array.isArray(rootNodes) ? rootNodes.filter(Boolean) : rootNodes ? [rootNodes] : [];
  if (!nodes.length) {
    throw new Error('No exportable frames found on the current page.');
  }

  if (nodes.length === 1) {
    const exportBaseName = buildExportBaseName(nodes[0]);
    const single = await buildExportFilesForNode(nodes[0], exportBaseName);
    const clientCatalog = buildClientComponentCatalog(single.clientComponents);
    return {
      packageFileName: buildExportPackageName(nodes),
      files: [
        {
          name: 'index.html',
          text: formatFileText(
            'index.html',
            renderMultiExportIndex([
              {
                name: nodes[0] && nodes[0].name ? String(nodes[0].name) : exportBaseName,
                href: exportBaseName + '/index.html',
                images: single.images.map(function (image) {
                  return {
                    name: image.name,
                    href: exportBaseName + '/' + image.href,
                  };
                }),
              },
            ], 'client_components.html')
          ),
        },
        {
          name: 'client_components.html',
          text: formatFileText('client_components.html', renderClientComponentsPage(clientCatalog, 'Client Components')),
        },
        {
          name: 'client_components.json',
          text: formatJson({ components: clientCatalog }),
        },
        {
          name: 'library_manifest.json',
          text: formatCompactJson({
            assetTheme: single.importManifest.assetTheme,
            entries: [buildLibraryManifestEntry(single.importManifest)],
          }),
        },
        ...single.files,
      ],
      report: single.report,
      schema: single.schema,
    };
  }

  const allFiles: ExportFile[] = [];
  const exportEntries: Array<{ name: string; href: string; images: Array<{ name: string; href: string }> }> = [];
  const mockupEntries: Array<{ name: string; href: string }> = [];
  const clientInstances: ClientComponentInstance[] = [];
  const importEntries: any[] = [];
  let sharedAssetTheme: any[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const exportBaseName = buildExportBaseName(node);
    const result = await buildExportFilesForNode(node, exportBaseName);
    allFiles.push(...result.files);
    clientInstances.push(...result.clientComponents);
    importEntries.push(result.importManifest);
    if (!sharedAssetTheme.length) sharedAssetTheme = result.importManifest.assetTheme;
    exportEntries.push({
      name: node && node.name ? String(node.name) : exportBaseName,
      href: exportBaseName + '/index.html',
      images: result.images.map(function (image) {
        return {
          name: image.name,
          href: exportBaseName + '/' + image.href,
        };
      }),
    });
    const mockupImage = result.images.find(function (image) {
      return /_mockup_1x\.(png|webp)$/i.test(image.name);
    });
    if (mockupImage) {
      mockupEntries.push({
        name: node && node.name ? String(node.name) : exportBaseName,
        href: exportBaseName + '/' + mockupImage.href,
      });
    }
  }

  const clientCatalog = buildClientComponentCatalog(clientInstances);

  allFiles.unshift({
    name: 'index.html',
    text: formatFileText('index.html', renderMultiExportIndex(exportEntries, 'client_components.html')),
  });
  allFiles.unshift({
    name: 'client_components.html',
    text: formatFileText('client_components.html', renderClientComponentsPage(clientCatalog, 'Client Components')),
  });
  allFiles.unshift({
    name: 'client_components.json',
    text: formatJson({ components: clientCatalog }),
  });
  allFiles.unshift({
    name: 'library_manifest.json',
    text: formatCompactJson({
      assetTheme: sharedAssetTheme,
      entries: importEntries.map(buildLibraryManifestEntry),
    }),
  });
  if (mockupEntries.length) {
    allFiles.unshift({
      name: 'mockup_review.html',
      text: formatFileText('mockup_review.html', renderMockupReviewIndex(mockupEntries)),
    });
  }

  return {
    packageFileName: buildExportPackageName(nodes),
    files: allFiles,
    report: {
      pattern: 'multi_frame',
      warnings: [],
    },
    schema: {
      exportCount: nodes.length,
      exports: nodes.map(function (node) {
        return {
          name: node && node.name ? String(node.name) : 'frame',
          folder: buildExportBaseName(node),
        };
      }),
    },
  };
}
