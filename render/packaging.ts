/* eslint-disable @typescript-eslint/no-explicit-any */

import { analyzeSelection } from '../figma/analyze';
import { uniqueIds } from '../utils/tree';
import { ExportFile, NormalizedNode } from '../types';
import {
  attachMediaAssets,
  attachProductAssets,
  buildExportBaseName,
  buildExportPackageName,
  buildNodeIndex,
  exportMockupPng,
  exportFlattenedBackgroundVariant,
  getAssetThemeSnapshot,
} from '../figma/index';
import {
  renderFlattenedHtml,
  renderMultiExportIndex,
  renderMockupReviewIndex,
  renderPreviewIndex,
} from './index';
import { formatFileText } from '../utils/string';


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
  const deliverablesRootFolder = 'deliverables';
  const mockupRootFolder = 'mockups';
  const liveTextRootFolder = 'live_text_images';
  const textBakedRootFolder = 'text_baked_images';
  const nodeIndex = buildNodeIndex(rootNode);
  const analysis = analyzeSelection(rootNode);
  const sourceFrameName = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
  const assetTheme = await getAssetThemeSnapshot();
  const mockupAsset = await exportMockupPng(rootNode, exportBaseName + '_mockup_1x.png');
  const assets = await attachProductAssets(analysis.schema.products, nodeIndex, exportBaseName);
  const mediaAssets = await attachMediaAssets(analysis.ast, nodeIndex, exportBaseName);
  const flattenedTextAssetName = exportBaseName + '.png';
  const flattenedLiveAssetName = exportBaseName + '.png';
  const flattenedTextAsset = await exportFlattenedBackgroundVariant(
    rootNode,
    [],
    'textBaked',
    flattenedTextAssetName,
    uniqueIds
  );
  const flattenedLiveAsset = await exportFlattenedBackgroundVariant(
    rootNode,
    [],
    'liveText',
    flattenedLiveAssetName,
    uniqueIds
  );
  const flattenedTextVariant = renderFlattenedHtml(
    analysis.ast,
    analysis,
    '../' + textBakedRootFolder + '/' + flattenedTextAssetName,
    true,
    '../' + deliverablesRootFolder
  );
  const flattenedLiveVariant = renderFlattenedHtml(
    analysis.ast,
    analysis,
    '../' + liveTextRootFolder + '/' + flattenedLiveAssetName,
    false,
    '../' + deliverablesRootFolder
  );
  const usiJsFile = flattenedLiveVariant.js;
  const allDeliverableAssets = [...assets, ...mediaAssets].filter(function (asset, index, collection) {
    return collection.findIndex(function (candidate) {
      return candidate.name === asset.name;
    }) === index;
  });
  const images: Array<{ name: string; href: string }> = [];
  if (mockupAsset) images.push({ name: mockupAsset.name, href: '../' + mockupRootFolder + '/' + mockupAsset.name });
  if (flattenedLiveAsset) images.push({ name: flattenedLiveAsset.name, href: '../' + liveTextRootFolder + '/' + flattenedLiveAsset.name });
  if (flattenedTextAsset) images.push({ name: flattenedTextAsset.name, href: '../' + textBakedRootFolder + '/' + flattenedTextAsset.name });
  for (let index = 0; index < allDeliverableAssets.length; index += 1) {
    images.push({ name: allDeliverableAssets[index].name, href: '../' + deliverablesRootFolder + '/' + allDeliverableAssets[index].name });
  }
  const previewTitle = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
  const formattedDevCss = formatFileText('devmode.css', flattenedTextVariant.css);
  const formattedDevJs = formatFileText('devmode.js', flattenedTextVariant.js);
  const previewHtml = renderPreviewIndex(
    previewTitle,
    images,
    {
      bakedImageHref: '../' + textBakedRootFolder + '/' + flattenedTextAssetName,
      cssSource: formattedDevCss,
      jsSource: usiJsFile
    }
  );
  console.log(previewHtml);
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
    { name: prefixed('flattened_text_baked.html'), text: flattenedTextVariant.html },
    { name: prefixed('css/flattened_text_baked.css'), text: flattenedTextVariant.css },
    { name: prefixed('js/flattened_text_baked.js'), text: flattenedTextVariant.js },
    { name: prefixed('flattened_live_text.html'), text: flattenedLiveVariant.html },
    { name: prefixed('css/flattened_live_text.css'), text: flattenedLiveVariant.css },
    { name: prefixed('js/usi_js.js'), text: usiJsFile },
    ...(mockupAsset ? [rootBinary(mockupRootFolder, mockupAsset)] : []),
    ...(flattenedTextAsset ? [rootBinary(textBakedRootFolder, flattenedTextAsset)] : []),
    ...(flattenedLiveAsset ? [rootBinary(liveTextRootFolder, flattenedLiveAsset)] : []),
    ...allDeliverableAssets.map(function (asset) {
      return rootBinary(deliverablesRootFolder, asset);
    }),
  ];

  const formattedFiles: ExportFile[] = files.map(function (file) {
    if (!('text' in file)) return file;
    // Skip formatting for CSS and JS files to prevent output corruption
    const isCssOrJs = file.name.endsWith('.css') || file.name.endsWith('.js');
    if (isCssOrJs) {
      return file;
    }
    return {
      name: file.name,
      text: file.text
    };
  });

  const result = {
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
        productAssets: allDeliverableAssets.map(function (asset) { return deliverablesRootFolder + '/' + asset.name; }),
        previewPages: ['index.html', 'flattened_live_text.html', 'flattened_text_baked.html'],
        cssFiles: ['css/styles.css', 'css/flattened_live_text.css', 'css/flattened_text_baked.css'],
        jsFiles: ['js/usi_js.js', 'js/flattened_text_baked.js'],
      },
    },
  }
  console.log(result);
  return result;
}

export async function buildExport(rootNodes: any | any[]): Promise<{
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
