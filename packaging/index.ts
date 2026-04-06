/* eslint-disable @typescript-eslint/no-explicit-any */

import { COMPONENT_BY_ID, COMPONENT_BY_ROLE } from '../constants';
import { analyzeSelection, flattenTree, uniqueIds } from '../analysis/index';
import { ExportFile, NormalizedNode } from '../types';
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
  renderMultiExportIndex,
  renderMockupReviewIndex,
  renderPreviewIndex,
  renderSemanticHtml,
} from '../render/index';
import { formatFileText } from '../utils/string';

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

async function buildExportFilesForNode(rootNode: any, filePrefix: string): Promise<{
  files: ExportFile[];
  report: any;
  schema: any;
  images: Array<{ name: string; href: string }>;
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
  const mockupRootFolder = 'mockups';
  const liveTextRootFolder = 'live_text_images';
  const textBakedRootFolder = 'text_baked_images';
  const nodeIndex = buildNodeIndex(rootNode);
  const analysis = analyzeSelection(rootNode);
  const sourceFrameName = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
  const pageNodes = getExportPageNodes(rootNode);
  const assetTheme = await getAssetThemeSnapshot();
  const mockupAsset = await exportMockupPng(rootNode, exportBaseName + '_mockup_1x.png');
  const assets = await attachProductAssets(analysis.schema.products, nodeIndex, exportBaseName);
  const semantic = renderSemanticHtml(analysis.schema, analysis.ast);
  const flattenedTextAssetName = exportBaseName + '.png';
  const flattenedLiveAssetName = exportBaseName + '.png';
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
  const flattenedTextVariant = renderFlattenedHtml(analysis.ast, analysis, '../' + textBakedRootFolder + '/' + flattenedTextAssetName, true);
  const flattenedLiveVariant = renderFlattenedHtml(analysis.ast, analysis, '../' + liveTextRootFolder + '/' + flattenedLiveAssetName, false);
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
  if (mockupAsset) images.push({ name: mockupAsset.name, href: '../' + mockupRootFolder + '/' + mockupAsset.name });
  if (flattenedLiveAsset) images.push({ name: flattenedLiveAsset.name, href: '../' + liveTextRootFolder + '/' + flattenedLiveAsset.name });
  if (flattenedTextAsset) images.push({ name: flattenedTextAsset.name, href: '../' + textBakedRootFolder + '/' + flattenedTextAsset.name });
  for (let index = 0; index < assets.length; index += 1) {
    images.push({ name: assets[index].name, href: assets[index].name });
  }
  const previewTitle = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
  const formattedDevCss = formatFileText('devmode.css', extractCampaignCss(flattenedTextVariant.css));
  const formattedDevJs = formatFileText('devmode.js', flattenedTextVariant.js);
  const previewHtml = renderPreviewIndex(
    previewTitle,
    images,
    {
      bakedImageHref: '../' + textBakedRootFolder + '/' + flattenedTextAssetName,
      cssSource: formattedDevCss,
      jsSource: formattedDevJs,
    }
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
  const rootBinary = function (folderName: string, file: ExportFile): ExportFile {
    if ('text' in file) return file;
    return {
      name: folderName + '/' + file.name,
      base64: file.base64,
      mime: file.mime,
    };
  };

  const files: ExportFile[] = [
    { name: prefixed('index.html'), text: previewHtml },
    { name: prefixed('css/styles.css'), text: semantic.css },
    { name: prefixed('semantic.html'), text: semantic.html },
    { name: prefixed('css/semantic.css'), text: semantic.css },
    { name: prefixed('flattened_text_baked.html'), text: flattenedTextVariant.html },
    { name: prefixed('css/flattened_text_baked.css'), text: flattenedTextVariant.css },
    { name: prefixed('js/flattened_text_baked.js'), text: flattenedTextVariant.js },
    { name: prefixed('flattened_live_text.html'), text: flattenedLiveVariant.html },
    { name: prefixed('css/flattened_live_text.css'), text: flattenedLiveVariant.css },
    { name: prefixed('js/usi_js.js'), text: usiJsFile },
    ...(mockupAsset ? [rootBinary(mockupRootFolder, mockupAsset)] : []),
    ...(flattenedTextAsset ? [rootBinary(textBakedRootFolder, flattenedTextAsset)] : []),
    ...(flattenedLiveAsset ? [rootBinary(liveTextRootFolder, flattenedLiveAsset)] : []),
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
    importManifest: {
      frameName: sourceFrameName,
      folder: filePrefix || exportBaseName,
      schema: analysis.schema,
      ast: analysis.ast,
      assetTheme: assetTheme,
      assets: {
        mockup: mockupAsset ? mockupRootFolder + '/' + mockupAsset.name : undefined,
        flattenedLive: flattenedLiveAsset ? liveTextRootFolder + '/' + flattenedLiveAsset.name : undefined,
        flattenedTextBaked: flattenedTextAsset ? textBakedRootFolder + '/' + flattenedTextAsset.name : undefined,
        productAssets: assets.map(function (asset) { return asset.name; }),
        previewPages: ['index.html', 'semantic.html', 'flattened_live_text.html', 'flattened_text_baked.html'],
        cssFiles: ['css/styles.css', 'css/semantic.css', 'css/flattened_live_text.css', 'css/flattened_text_baked.css'],
        jsFiles: ['js/usi_js.js', 'js/flattened_text_baked.js'],
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
                href: image.href.indexOf('../') === 0
                  ? image.href.replace(/^\.\.\//, '')
                  : exportBaseName + '/' + image.href,
              };
                }),
              },
            ])
          ),
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
  const importEntries: any[] = [];
  let sharedAssetTheme: any[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const exportBaseName = buildExportBaseName(node);
    const result = await buildExportFilesForNode(node, exportBaseName);
    allFiles.push(...result.files);
    importEntries.push(result.importManifest);
    if (!sharedAssetTheme.length) sharedAssetTheme = result.importManifest.assetTheme;
    exportEntries.push({
      name: node && node.name ? String(node.name) : exportBaseName,
      href: exportBaseName + '/index.html',
      images: result.images.map(function (image) {
        return {
          name: image.name,
          href: image.href.indexOf('../') === 0
            ? image.href.replace(/^\.\.\//, '')
            : exportBaseName + '/' + image.href,
        };
      }),
    });
    const mockupImage = result.images.find(function (image) {
      return /_mockup_1x\.(png|webp)$/i.test(image.name);
    });
    if (mockupImage) {
      mockupEntries.push({
        name: node && node.name ? String(node.name) : exportBaseName,
        href: mockupImage.href.replace(/^\.\.\//, ''),
      });
    }
  }

  allFiles.unshift({
    name: 'index.html',
    text: formatFileText('index.html', renderMultiExportIndex(exportEntries)),
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
