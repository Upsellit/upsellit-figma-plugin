/* eslint-disable @typescript-eslint/no-explicit-any */

import { COMMON_COMPONENTS } from './constants';
import { AnyNode } from './types';
import {
  createAssetComponentInstance,
  ensureAssetSourcePage,
  ensureTemplatesPageFromLibrary,
  getExportRoots,
} from './figma/index';
import { buildSemanticExport } from './packaging/index';

figma.showUI(__html__, {
  width: 440,
  height: 880,
  themeColors: true,
});

figma.ui.onmessage = async function (msg: AnyNode) {
  if (!msg) return;

  if (msg.type === 'get-component-catalog') {
    figma.ui.postMessage({
      type: 'component-catalog',
      payload: COMMON_COMPONENTS,
    });
    return;
  }

  if (msg.type === 'insert-asset-component') {
    try {
      const inserted = await createAssetComponentInstance(String(msg.componentId || ''));
      figma.ui.postMessage({
        type: 'component-added',
        message: 'Added ' + String(inserted.name || 'component') + ' to the page.',
      });
    } catch (error: any) {
      figma.ui.postMessage({
        type: 'error',
        message: error && error.message ? String(error.message) : 'Failed to add asset component.',
      });
    }
    return;
  }

  if (msg.type === 'create-asset-source-page') {
    try {
      const assetPage = await ensureAssetSourcePage();
      const templatesPage = await ensureTemplatesPageFromLibrary();
      figma.ui.postMessage({
        type: 'asset-source-page-ready',
        message:
          'Opened ' +
          String(assetPage.name || 'asset source page') +
          ' and ' +
          String(templatesPage.name || 'templates page') +
          '.',
      });
    } catch (error: any) {
      figma.ui.postMessage({
        type: 'error',
        message: error && error.message ? String(error.message) : 'Failed to create asset source page.',
      });
    }
    return;
  }

  if (msg.type === 'export-semantic') {
    const roots = getExportRoots(figma.currentPage.selection, figma.currentPage);
    if (!roots.length) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Select one exportable node, or leave nothing selected to export all top-level frames on the current page.',
      });
      return;
    }

    try {
      const payload = await buildSemanticExport(roots);
      figma.ui.postMessage({
        type: 'package-ready',
        payload: payload,
      });
    } catch (error: any) {
      figma.ui.postMessage({
        type: 'error',
        message: error && error.message ? String(error.message) : 'Semantic export failed.',
      });
    }
  }
};
