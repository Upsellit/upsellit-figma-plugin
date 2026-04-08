/* eslint-disable @typescript-eslint/no-explicit-any */

import { COMMON_COMPONENTS } from './constants';
import { AnyNode } from './types';
import {
  createAssetComponentInstance,
  getExportRoots,
} from './figma/index';
import { buildExport } from './packaging/index';

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

  if (msg.type === 'export-campaigns') {
    const roots = getExportRoots(figma.currentPage.selection, figma.currentPage);
    if (!roots.length) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Select one exportable node, or leave nothing selected to export all top-level frames on the current page.',
      });
      return;
    }

    try {
      const payload = await buildExport(roots);
      figma.ui.postMessage({
        type: 'package-ready',
        payload: payload,
      });
    } catch (error: any) {
      figma.ui.postMessage({
        type: 'error',
        message: error && error.message ? String(error.message) : 'Export failed.',
      });
    }
  }
};
