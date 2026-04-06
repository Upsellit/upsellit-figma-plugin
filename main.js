(function(){
var modules = {
"main": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const index_1 = require("./figma/index");
const index_2 = require("./packaging/index");
figma.showUI(__html__, {
    width: 440,
    height: 880,
    themeColors: true,
});
figma.ui.onmessage = async function (msg) {
    if (!msg)
        return;
    if (msg.type === 'get-component-catalog') {
        figma.ui.postMessage({
            type: 'component-catalog',
            payload: constants_1.COMMON_COMPONENTS,
        });
        return;
    }
    if (msg.type === 'insert-asset-component') {
        try {
            const inserted = await (0, index_1.createAssetComponentInstance)(String(msg.componentId || ''));
            figma.ui.postMessage({
                type: 'component-added',
                message: 'Added ' + String(inserted.name || 'component') + ' to the page.',
            });
        }
        catch (error) {
            figma.ui.postMessage({
                type: 'error',
                message: error && error.message ? String(error.message) : 'Failed to add asset component.',
            });
        }
        return;
    }
    if (msg.type === 'create-asset-source-page') {
        try {
            const assetPage = await (0, index_1.ensureAssetSourcePage)();
            const templatesPage = await (0, index_1.ensureTemplatesPageFromLibrary)();
            figma.ui.postMessage({
                type: 'asset-source-page-ready',
                message: 'Opened ' +
                    String(assetPage.name || 'asset source page') +
                    ' and ' +
                    String(templatesPage.name || 'templates page') +
                    '.',
            });
        }
        catch (error) {
            figma.ui.postMessage({
                type: 'error',
                message: error && error.message ? String(error.message) : 'Failed to create asset source page.',
            });
        }
        return;
    }
    if (msg.type === 'export-semantic') {
        const roots = (0, index_1.getExportRoots)(figma.currentPage.selection, figma.currentPage);
        if (!roots.length) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Select one exportable node, or leave nothing selected to export all top-level frames on the current page.',
            });
            return;
        }
        try {
            const payload = await (0, index_2.buildSemanticExport)(roots);
            figma.ui.postMessage({
                type: 'package-ready',
                payload: payload,
            });
        }
        catch (error) {
            figma.ui.postMessage({
                type: 'error',
                message: error && error.message ? String(error.message) : 'Semantic export failed.',
            });
        }
    }
};
},
"constants": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPONENT_BY_ROLE = exports.COMPONENT_BY_ID = exports.COMPONENT_ROLE_MAP = exports.COMMON_COMPONENTS = exports.THREE_X_THRESHOLD = exports.PRODUCTION_SCALE = exports.MOBILE_WIDTH_THRESHOLD = void 0;
exports.MOBILE_WIDTH_THRESHOLD = 560;
exports.PRODUCTION_SCALE = 3;
exports.THREE_X_THRESHOLD = 1200;
function component(id, label, role, description, category, render) {
    return {
        id: id,
        label: label,
        role: role,
        description: description,
        category: category,
        render: Object.assign({}, render, {
            flattened: {
                liveText: render.flattened ? render.flattened.liveText !== false : true,
                textBaked: render.flattened ? render.flattened.textBaked !== false : true,
            },
        }),
    };
}
// This catalog is the source of truth for the plugin:
// 1. the UI reads it to show insertable assets
// 2. inserted Figma nodes store the matching component id in pluginData
// 3. semantic + flattened renderers use the render metadata below
exports.COMMON_COMPONENTS = [
    component("modal_shell", "Modal Shell", "modal-root", "Standard centered modal shell.", "shell", {
        htmlTag: "article",
        className: "usi_modal",
        region: "shell",
        kind: "container"
    }),
    component("sidebar_shell", "Sidebar Shell", "modal-root", "Tall narrow modal shell for sidebar layouts.", "shell", {
        htmlTag: "article",
        className: "usi_modal usi_modal_sidebar",
        region: "shell",
        kind: "container"
    }),
    component("bottom_bar_shell", "Bottom Bar Shell", "modal-root", "Wide low shell for bottom-bar layouts.", "shell", {
        htmlTag: "article",
        className: "usi_modal usi_modal_bottom_bar",
        region: "shell",
        kind: "container"
    }),
    component("content_stack", "Content Stack", "content", "Primary content wrapper inside the shell.", "layout", {
        htmlTag: "section",
        className: "usi_modal_inner",
        region: "main",
        kind: "container"
    }),
    component("headline_block", "Headline", "headline", "Primary title copy.", "content", {
        htmlTag: "h1",
        className: "usi_headline",
        region: "main",
        kind: "text",
        fallbackText: "Please Input Headline Here."
    }),
    component("subtext_block", "Subtext", "subtext", "Supporting body copy.", "content", {
        htmlTag: "p",
        className: "usi_subtext",
        region: "main",
        kind: "text",
        fallbackText: "Subtext copy here."
    }),
    component("eyebrow_block", "Eyebrow", "eyebrow", "Small label above the headline.", "content", {
        htmlTag: "p",
        className: "usi_eyebrow",
        region: "main",
        kind: "text",
        fallbackText: "FROM YOUR CART"
    }),
    component("divider", "Divider", "divider", "Simple horizontal separator between sections.", "content", {
        htmlTag: "hr",
        className: "usi_divider",
        region: "main",
        kind: "media"
    }),
    component("primary_button", "Primary CTA", "cta", "Primary action button.", "action", {
        htmlTag: "button",
        className: "usi_primary_cta",
        region: "main",
        kind: "button",
        buttonText: "Redeem Now",
        flattened: { liveText: true, textBaked: true }
    }),
    component("thank_you_button", "Thank You Button", "cta", "Primary thank-you action for follow-up pages.", "action", {
        htmlTag: "button",
        className: "usi_primary_cta usi_thank_you_button",
        region: "main",
        kind: "button",
        buttonText: "Thank You",
        flattened: { liveText: true, textBaked: true }
    }),
    component("no_thanks_button", "No Thanks Button", "secondary-cta", "Secondary dismissal action.", "action", {
        htmlTag: "button",
        className: "usi_secondary_cta usi_no_thanks",
        region: "main",
        kind: "button",
        buttonText: "No Thanks"
    }),
    component("product_grid", "Product Grid", "product-list", "Repeated products container.", "product", {
        htmlTag: "section",
        className: "usi_products",
        region: "aside",
        kind: "container"
    }),
    component("product_card", "Product Card", "product-card", "Single product tile.", "product", {
        htmlTag: "article",
        className: "usi_product_card",
        region: "product",
        kind: "container"
    }),
    component("product_image", "Product Image", "product-image", "Product image slot.", "product", {
        htmlTag: "div",
        className: "usi_product_image",
        region: "product",
        kind: "media"
    }),
    component("product_title", "Product Title", "product-title", "Product title text.", "product", {
        htmlTag: "h3",
        className: "usi_product_title",
        region: "product",
        kind: "text",
        fallbackText: "Product Name"
    }),
    component("product_subtitle", "Product Subtitle", "product-subtitle", "Secondary product text.", "product", {
        htmlTag: "p",
        className: "usi_product_meta",
        region: "product",
        kind: "text",
        fallbackText: "Product details"
    }),
    component("product_price", "Product Price", "product-price", "Displayed product price.", "product", {
        htmlTag: "p",
        className: "usi_product_price",
        region: "product",
        kind: "text",
        fallbackText: "$XX.XX"
    }),
    component("product_button", "Product Button", "product-cta", "CTA within a product card.", "action", {
        htmlTag: "button",
        className: "usi_product_cta",
        region: "product",
        kind: "button",
        buttonText: "View Item",
        flattened: { liveText: true, textBaked: false }
    }),
    component("price_table", "Price Table", "summary", "Summary pricing block.", "summary", {
        htmlTag: "section",
        className: "usi_summary",
        region: "summary",
        kind: "container"
    }),
    component("price_subtotal", "Subtotal Row", "summary-subtotal", "Subtotal row.", "summary", {
        htmlTag: "div",
        className: "usi_price usi_summary_row",
        region: "summary",
        kind: "text",
        fallbackText: "Subtotal: $XX.XX"
    }),
    component("price_discount", "Discount Row", "summary-discount", "Discount row.", "summary", {
        htmlTag: "div",
        className: "usi_discount usi_summary_row",
        region: "summary",
        kind: "text",
        fallbackText: "Discount: -$XX.XX"
    }),
    component("price_total", "Total Row", "summary-total", "Total row.", "summary", {
        htmlTag: "div",
        className: "usi_new_price usi_summary_row",
        region: "summary",
        kind: "text",
        fallbackText: "Total: $XX.XX"
    }),
    component("email_input", "Email Input", "email-input", "Email capture field for lead forms.", "form", {
        htmlTag: "label",
        className: "usi_field usi_email_field",
        region: "main",
        kind: "input",
        inputType: "email",
        fallbackText: "Enter your email"
    }),
    component("phone_input", "Phone Input", "phone-input", "Phone capture field.", "form", {
        htmlTag: "label",
        className: "usi_field usi_phone_field",
        region: "main",
        kind: "input",
        inputType: "tel",
        fallbackText: "Enter your phone number"
    }),
    component("survey_block", "Survey Block", "survey", "Survey prompt with answer options.", "form", {
        htmlTag: "section",
        className: "usi_survey",
        region: "main",
        kind: "survey",
        fallbackText: "How likely are you to purchase today?"
    }),
    component("copy_coupon", "Copy Coupon", "copy-coupon", "Coupon code block with copy action.", "utility", {
        htmlTag: "section",
        className: "usi_coupon",
        region: "main",
        kind: "coupon",
        fallbackText: "SAVE15",
        buttonText: "Copy Code"
    }),
    component("optin_component", "Opt-In", "optin", "Checkbox or opt-in consent row.", "form", {
        htmlTag: "label",
        className: "usi_optin",
        region: "main",
        kind: "optin",
        fallbackText: "Yes, send me updates and offers.",
        flattened: { liveText: true, textBaked: true }
    }),
    component("countdown_timer", "Countdown Timer", "countdown", "Urgency timer display.", "utility", {
        htmlTag: "div",
        className: "usi_countdown",
        region: "main",
        kind: "countdown",
        fallbackText: "09:59"
    }),
    component("progress_bar", "Progress Bar", "progress", "Visual progress indicator.", "utility", {
        htmlTag: "div",
        className: "usi_progress",
        region: "main",
        kind: "progress"
    }),
    component("close_control", "Close Button", "close-button", "Dismiss control.", "action", {
        htmlTag: "button",
        className: "usi_close_button",
        region: "shell",
        kind: "button",
        buttonText: "×"
    }),
    component("disclaimer_text", "Disclaimer", "disclaimer", "Legal or privacy copy.", "content", {
        htmlTag: "p",
        className: "usi_disclaimer",
        region: "main",
        kind: "text",
        fallbackText: "We use your information in accordance with our Privacy Policy."
    }),
    component("media_panel", "Media Panel", "image", "Decorative or supporting media region.", "content", {
        htmlTag: "div",
        className: "usi_media_panel",
        region: "aside",
        kind: "media"
    })
];
exports.COMPONENT_ROLE_MAP = exports.COMMON_COMPONENTS.reduce(function (map, item) {
    map[item.id] = item.role;
    return map;
}, {});
exports.COMPONENT_BY_ID = exports.COMMON_COMPONENTS.reduce(function (map, item) {
    map[item.id] = item;
    return map;
}, {});
exports.COMPONENT_BY_ROLE = exports.COMMON_COMPONENTS.reduce(function (map, item) {
    if (!map[item.role])
        map[item.role] = item;
    return map;
}, {});
},
"types": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
},
"figma/index": function(require, module, exports) {
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkScenePaths = exports.validateSelection = exports.setPluginMeta = exports.paintToCss = exports.hasImageFill = exports.getYearMonth = exports.getSizingMode = exports.getPluginMeta = exports.getPaddingValue = exports.getNodeChildren = exports.getExportRoots = exports.getExportPageNodes = exports.getBounds = exports.firstVisiblePaint = exports.extractTextStyle = exports.extractNodeText = exports.extractNodeStyle = exports.exportNodeImage = exports.exportMockupPng = exports.exportFlattenedBackgroundVariant = exports.buildPathMaps = exports.buildNodeIndex = exports.buildExportPackageName = exports.buildExportBaseName = exports.attachProductAssets = void 0;
__exportStar(require("./theme"), exports);
__exportStar(require("./builders"), exports);
__exportStar(require("./import-library"), exports);
var export_1 = require("./export");
Object.defineProperty(exports, "attachProductAssets", { enumerable: true, get: function () { return export_1.attachProductAssets; } });
Object.defineProperty(exports, "buildExportBaseName", { enumerable: true, get: function () { return export_1.buildExportBaseName; } });
Object.defineProperty(exports, "buildExportPackageName", { enumerable: true, get: function () { return export_1.buildExportPackageName; } });
Object.defineProperty(exports, "buildNodeIndex", { enumerable: true, get: function () { return export_1.buildNodeIndex; } });
Object.defineProperty(exports, "buildPathMaps", { enumerable: true, get: function () { return export_1.buildPathMaps; } });
Object.defineProperty(exports, "exportFlattenedBackgroundVariant", { enumerable: true, get: function () { return export_1.exportFlattenedBackgroundVariant; } });
Object.defineProperty(exports, "exportMockupPng", { enumerable: true, get: function () { return export_1.exportMockupPng; } });
Object.defineProperty(exports, "exportNodeImage", { enumerable: true, get: function () { return export_1.exportNodeImage; } });
Object.defineProperty(exports, "extractNodeStyle", { enumerable: true, get: function () { return export_1.extractNodeStyle; } });
Object.defineProperty(exports, "extractNodeText", { enumerable: true, get: function () { return export_1.extractNodeText; } });
Object.defineProperty(exports, "extractTextStyle", { enumerable: true, get: function () { return export_1.extractTextStyle; } });
Object.defineProperty(exports, "firstVisiblePaint", { enumerable: true, get: function () { return export_1.firstVisiblePaint; } });
Object.defineProperty(exports, "getBounds", { enumerable: true, get: function () { return export_1.getBounds; } });
Object.defineProperty(exports, "getExportPageNodes", { enumerable: true, get: function () { return export_1.getExportPageNodes; } });
Object.defineProperty(exports, "getExportRoots", { enumerable: true, get: function () { return export_1.getExportRoots; } });
Object.defineProperty(exports, "getNodeChildren", { enumerable: true, get: function () { return export_1.getNodeChildren; } });
Object.defineProperty(exports, "getPaddingValue", { enumerable: true, get: function () { return export_1.getPaddingValue; } });
Object.defineProperty(exports, "getPluginMeta", { enumerable: true, get: function () { return export_1.getPluginMeta; } });
Object.defineProperty(exports, "getSizingMode", { enumerable: true, get: function () { return export_1.getSizingMode; } });
Object.defineProperty(exports, "getYearMonth", { enumerable: true, get: function () { return export_1.getYearMonth; } });
Object.defineProperty(exports, "hasImageFill", { enumerable: true, get: function () { return export_1.hasImageFill; } });
Object.defineProperty(exports, "paintToCss", { enumerable: true, get: function () { return export_1.paintToCss; } });
Object.defineProperty(exports, "setPluginMeta", { enumerable: true, get: function () { return export_1.setPluginMeta; } });
Object.defineProperty(exports, "validateSelection", { enumerable: true, get: function () { return export_1.validateSelection; } });
Object.defineProperty(exports, "walkScenePaths", { enumerable: true, get: function () { return export_1.walkScenePaths; } });
},
"figma/theme": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_VARIABLE_COLLECTION_NAME = exports.TEMPLATES_PAGE_NAME = exports.ASSET_LIBRARY_PAGE_NAME = void 0;
exports.ensureAssetThemeVariables = ensureAssetThemeVariables;
exports.getAssetThemeSnapshot = getAssetThemeSnapshot;
exports.applyThemeSnapshot = applyThemeSnapshot;
exports.bindColorVariable = bindColorVariable;
exports.bindUniformRadius = bindUniformRadius;
exports.applyThemeFont = applyThemeFont;
exports.applyThemeText = applyThemeText;
exports.ASSET_LIBRARY_PAGE_NAME = 'Upsellit Asset Source';
exports.TEMPLATES_PAGE_NAME = 'Upsellit Templates';
exports.ASSET_VARIABLE_COLLECTION_NAME = 'Upsellit Asset Tokens';
function hexToRgba(hex) {
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
async function ensureAssetThemeVariables() {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    let collection = collections.find(function (item) {
        return item && item.name === exports.ASSET_VARIABLE_COLLECTION_NAME;
    });
    if (!collection) {
        collection = figma.variables.createVariableCollection(exports.ASSET_VARIABLE_COLLECTION_NAME);
    }
    const variableCollection = collection;
    const variables = await figma.variables.getLocalVariablesAsync();
    const byName = {};
    for (let index = 0; index < variables.length; index += 1) {
        const variable = variables[index];
        if (variable && variable.variableCollectionId === variableCollection.id) {
            byName[String(variable.name)] = variables[index];
        }
    }
    function ensureVariable(name, resolvedType, value) {
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
async function getAssetThemeSnapshot() {
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
        const rawValue = variable.valuesByMode[theme.collection.modes[0].modeId];
        const value = rawValue && typeof rawValue === 'object' && 'r' in rawValue && 'g' in rawValue && 'b' in rawValue
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
            resolvedType: variable.resolvedType,
            value: value,
        };
    });
}
async function applyThemeSnapshot(snapshot) {
    const theme = await ensureAssetThemeVariables();
    const byName = {
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
        const token = snapshot[index];
        const variable = byName[token.name];
        if (!variable)
            continue;
        variable.setValueForMode(modeId, token.value);
    }
    return theme;
}
function bindColorVariable(node, field, variable) {
    const current = Array.isArray(node[field]) ? node[field] : [];
    const paints = current.length ? current.slice() : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    const nextPaints = paints.map(function (paint) {
        if (!paint || paint.type !== 'SOLID')
            return paint;
        return figma.variables.setBoundVariableForPaint(paint, 'color', variable);
    });
    node[field] = nextPaints;
}
function bindUniformRadius(node, variable) {
    if (!node || typeof node.setBoundVariable !== 'function')
        return;
    if (!('topLeftRadius' in node) ||
        !('topRightRadius' in node) ||
        !('bottomLeftRadius' in node) ||
        !('bottomRightRadius' in node)) {
        return;
    }
    node.setBoundVariable('topLeftRadius', variable);
    node.setBoundVariable('topRightRadius', variable);
    node.setBoundVariable('bottomLeftRadius', variable);
    node.setBoundVariable('bottomRightRadius', variable);
}
async function applyThemeFont(textNode, theme) {
    try {
        await figma.loadFontAsync({ family: 'Merriweather Sans', style: 'Regular' });
        textNode.fontName = { family: 'Merriweather Sans', style: 'Regular' };
    }
    catch (_error) {
        // Keep the current font if Merriweather Sans is unavailable locally.
    }
    if (typeof textNode.setBoundVariable === 'function') {
        textNode.setBoundVariable('fontFamily', theme.fontFamily);
    }
}
async function applyThemeText(textNode, theme, options) {
    await applyThemeFont(textNode, theme);
    bindColorVariable(textNode, 'fills', options && options.colorVariable ? options.colorVariable : theme.fontColor);
    if (options && options.charactersVariable && typeof textNode.setBoundVariable === 'function') {
        textNode.setBoundVariable('characters', options.charactersVariable);
    }
}
},
"figma/builders": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAssetComponentNode = buildAssetComponentNode;
exports.createAssetComponentInstance = createAssetComponentInstance;
const theme_1 = require("./theme");
const shared_1 = require("./shared");
const theme_2 = require("./theme");
async function createTextLayer(name, characters, fontSize, width) {
    const text = figma.createText();
    await (0, shared_1.loadTextNodeFont)(text);
    text.name = name;
    text.characters = characters;
    text.fontSize = fontSize;
    if (typeof width === 'number') {
        text.textAutoResize = 'HEIGHT';
        text.resize(width, text.height);
    }
    return text;
}
async function createButtonFrame(name, label, componentId, theme, options) {
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
    button.fills = [(0, shared_1.makeSolidFill)(options && options.background ? options.background : '#1F1F1F')];
    (0, theme_1.bindUniformRadius)(button, theme.borderRadius);
    (0, theme_1.bindColorVariable)(button, 'fills', options && options.backgroundVariable ? options.backgroundVariable : theme.button1);
    (0, shared_1.applyComponentMeta)(button, componentId);
    const text = await createTextLayer(name + ' Label', label, 16);
    text.textAutoResize = 'WIDTH_AND_HEIGHT';
    await (0, theme_1.applyThemeText)(text, theme, {
        charactersVariable: options && options.textVariable ? options.textVariable : undefined,
        colorVariable: theme.fontColor,
    });
    if (!(options && options.textVariable)) {
        text.fills = [(0, shared_1.makeSolidFill)(options && options.color ? options.color : '#FFFFFF')];
        (0, theme_1.bindColorVariable)(text, 'fills', theme.fontColor);
    }
    button.appendChild(text);
    return button;
}
async function createInputField(name, placeholder, componentId, theme) {
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
    field.strokes = [(0, shared_1.makeSolidFill)('#CFCFCF')];
    field.strokeWeight = 1;
    field.fills = [(0, shared_1.makeSolidFill)('#FFFFFF')];
    (0, theme_1.bindUniformRadius)(field, theme.borderRadius);
    (0, theme_1.bindColorVariable)(field, 'strokes', theme.background2);
    (0, shared_1.applyComponentMeta)(field, componentId);
    const text = await createTextLayer(name + ' Placeholder', placeholder, 16, 288);
    await (0, theme_1.applyThemeText)(text, theme, { colorVariable: theme.background1 });
    field.appendChild(text);
    return field;
}
async function createCheckboxRow(name, label, componentId, theme) {
    const row = figma.createFrame();
    row.name = name;
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    row.counterAxisAlignItems = 'CENTER';
    row.itemSpacing = 10;
    row.fills = [];
    (0, shared_1.applyComponentMeta)(row, componentId);
    const box = figma.createRectangle();
    box.name = name + ' Box';
    box.resize(18, 18);
    box.strokes = [(0, shared_1.makeSolidFill)('#222222')];
    box.strokeWeight = 1;
    box.fills = [(0, shared_1.makeSolidFill)('#FFFFFF')];
    (0, theme_1.bindColorVariable)(box, 'strokes', theme.fontColor);
    (0, theme_1.bindUniformRadius)(box, theme.borderRadius);
    const text = await createTextLayer(name + ' Label', label, 14, 280);
    await (0, theme_1.applyThemeText)(text, theme, { colorVariable: theme.fontColor });
    row.appendChild(box);
    row.appendChild(text);
    return row;
}
async function createSurveyBlock(theme) {
    const survey = figma.createFrame();
    survey.name = 'Survey Block';
    survey.layoutMode = 'VERTICAL';
    survey.primaryAxisSizingMode = 'AUTO';
    survey.counterAxisSizingMode = 'AUTO';
    survey.resize(360, 236);
    survey.itemSpacing = 12;
    survey.fills = [];
    (0, shared_1.applyComponentMeta)(survey, 'survey_block');
    const prompt = await createTextLayer('Survey Question', 'How likely are you to purchase today?', 16, 360);
    await (0, theme_1.applyThemeText)(prompt, theme, { colorVariable: theme.fontColor });
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
async function createCouponBlock(theme) {
    const coupon = figma.createFrame();
    coupon.name = 'Copy Coupon';
    coupon.layoutMode = 'HORIZONTAL';
    coupon.primaryAxisSizingMode = 'AUTO';
    coupon.counterAxisSizingMode = 'AUTO';
    coupon.counterAxisAlignItems = 'CENTER';
    coupon.itemSpacing = 12;
    coupon.fills = [];
    (0, shared_1.applyComponentMeta)(coupon, 'copy_coupon');
    const code = figma.createFrame();
    code.name = 'Coupon Code';
    code.layoutMode = 'HORIZONTAL';
    code.primaryAxisSizingMode = 'AUTO';
    code.counterAxisSizingMode = 'AUTO';
    code.paddingLeft = 16;
    code.paddingRight = 16;
    code.paddingTop = 12;
    code.paddingBottom = 12;
    code.strokes = [(0, shared_1.makeSolidFill)('#1F1F1F')];
    code.strokeWeight = 1;
    code.fills = [(0, shared_1.makeSolidFill)('#FFFFFF')];
    (0, theme_1.bindUniformRadius)(code, theme.borderRadius);
    (0, theme_1.bindColorVariable)(code, 'strokes', theme.button2);
    const codeText = await createTextLayer('Coupon Label', 'SAVE15', 16);
    await (0, theme_1.applyThemeText)(codeText, theme, {
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
function createProgressBar(theme) {
    const bar = figma.createFrame();
    bar.name = 'Progress Bar';
    bar.layoutMode = 'NONE';
    bar.resize(320, 12);
    bar.fills = [(0, shared_1.makeSolidFill)('#E6E6E6')];
    bar.cornerRadius = 999;
    (0, theme_1.bindUniformRadius)(bar, theme.borderRadius);
    (0, theme_1.bindColorVariable)(bar, 'fills', theme.background2);
    (0, shared_1.applyComponentMeta)(bar, 'progress_bar');
    const fill = figma.createRectangle();
    fill.name = 'Progress Fill';
    fill.resize(180, 12);
    fill.cornerRadius = 999;
    fill.fills = [(0, shared_1.makeSolidFill)('#1F1F1F')];
    (0, theme_1.bindUniformRadius)(fill, theme.borderRadius);
    (0, theme_1.bindColorVariable)(fill, 'fills', theme.highlight);
    bar.appendChild(fill);
    return bar;
}
function createDividerNode(theme) {
    const divider = figma.createRectangle();
    divider.name = 'Divider';
    divider.resize(320, 4);
    divider.cornerRadius = 999;
    divider.fills = [(0, shared_1.makeSolidFill)('#1F1F1F')];
    (0, theme_1.bindColorVariable)(divider, 'fills', theme.background1);
    (0, shared_1.applyComponentMeta)(divider, 'divider');
    return divider;
}
async function buildProductCardFrame(theme) {
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
    frame.fills = [(0, shared_1.makeSolidFill)('#F3F3F3')];
    (0, theme_1.bindColorVariable)(frame, 'fills', theme.background2);
    (0, shared_1.applyComponentMeta)(frame, 'product_card');
    const image = figma.createRectangle();
    image.name = 'Product Image';
    image.resize(136, 96);
    image.cornerRadius = 8;
    image.fills = [(0, shared_1.makeSolidFill)('#D9D9D9')];
    (0, theme_1.bindUniformRadius)(image, theme.borderRadius);
    (0, theme_1.bindColorVariable)(image, 'fills', theme.background1);
    (0, shared_1.applyComponentMeta)(image, 'product_image');
    const title = await createTextLayer('Product Title', 'Product Name', 14, 136);
    await (0, theme_1.applyThemeText)(title, theme, { colorVariable: theme.background1 });
    (0, shared_1.applyComponentMeta)(title, 'product_title');
    const subtitle = await createTextLayer('Product Subtitle', '$XX.XX', 12, 136);
    await (0, theme_1.applyThemeText)(subtitle, theme, { colorVariable: theme.background1 });
    (0, shared_1.applyComponentMeta)(subtitle, 'product_subtitle');
    const button = figma.createFrame();
    button.name = 'Product Button';
    button.layoutMode = 'HORIZONTAL';
    button.primaryAxisSizingMode = 'AUTO';
    button.counterAxisSizingMode = 'AUTO';
    button.paddingLeft = 12;
    button.paddingRight = 12;
    button.paddingTop = 8;
    button.paddingBottom = 8;
    button.fills = [(0, shared_1.makeSolidFill)('#1F1F1F')];
    (0, theme_1.bindUniformRadius)(button, theme.borderRadius);
    (0, theme_1.bindColorVariable)(button, 'fills', theme.button2);
    (0, shared_1.applyComponentMeta)(button, 'product_button');
    const buttonText = await createTextLayer('Button Label', 'View Item', 12);
    await (0, shared_1.loadTextNodeFont)(buttonText);
    await (0, theme_1.applyThemeText)(buttonText, theme, { colorVariable: theme.fontColor });
    button.appendChild(buttonText);
    frame.appendChild(image);
    frame.appendChild(title);
    frame.appendChild(subtitle);
    frame.appendChild(button);
    return frame;
}
async function buildPriceRow(name, leftText, rightText, componentId, theme) {
    const row = figma.createFrame();
    row.name = name;
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'AUTO';
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    row.counterAxisAlignItems = 'CENTER';
    row.resize(280, 24);
    row.fills = [];
    (0, shared_1.applyComponentMeta)(row, componentId);
    const left = await createTextLayer(name + ' Label', leftText, 14, 140);
    const right = await createTextLayer(name + ' Value', rightText, 14, 120);
    await (0, theme_1.applyThemeText)(left, theme, { colorVariable: theme.background1 });
    await (0, theme_1.applyThemeText)(right, theme, { colorVariable: theme.background1 });
    right.textAlignHorizontal = 'RIGHT';
    row.appendChild(left);
    row.appendChild(right);
    return row;
}
async function buildAssetComponentNode(componentId) {
    let node;
    const theme = await (0, theme_1.ensureAssetThemeVariables)();
    switch (componentId) {
        case 'modal_shell':
        case 'sidebar_shell':
        case 'bottom_bar_shell': {
            const frame = figma.createFrame();
            frame.name =
                componentId === 'sidebar_shell' ? 'Sidebar Shell' :
                    componentId === 'bottom_bar_shell' ? 'Bottom Bar Shell' :
                        'Modal Shell';
            if (componentId === 'sidebar_shell')
                frame.resize(320, 660);
            else if (componentId === 'bottom_bar_shell')
                frame.resize(1280, 180);
            else
                frame.resize(640, 660);
            frame.fills = [(0, shared_1.makeSolidFill)('#FFFFFF')];
            (0, theme_1.bindUniformRadius)(frame, theme.borderRadius);
            (0, theme_1.bindColorVariable)(frame, 'fills', theme.background2);
            (0, shared_1.applyComponentMeta)(frame, componentId);
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
            (0, theme_1.bindColorVariable)(frame, 'fills', theme.background2);
            (0, shared_1.applyComponentMeta)(frame, componentId);
            node = frame;
            break;
        }
        case 'headline_block':
            node = await createTextLayer('Headline', 'Please Input Headline Here.', 32, 420);
            await (0, theme_1.applyThemeText)(node, theme);
            (0, shared_1.applyComponentMeta)(node, componentId);
            break;
        case 'subtext_block':
            node = await createTextLayer('Subtext', 'Subtext copy here.', 16, 420);
            await (0, theme_1.applyThemeText)(node, theme);
            (0, shared_1.applyComponentMeta)(node, componentId);
            break;
        case 'eyebrow_block':
            node = await createTextLayer('Eyebrow', 'FROM YOUR CART', 12, 220);
            await (0, theme_1.applyThemeText)(node, theme, { charactersVariable: theme.incentive });
            (0, shared_1.applyComponentMeta)(node, componentId);
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
            (0, shared_1.applyComponentMeta)(grid, componentId);
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
            image.fills = [(0, shared_1.makeSolidFill)('#D9D9D9')];
            (0, theme_1.bindUniformRadius)(image, theme.borderRadius);
            (0, theme_1.bindColorVariable)(image, 'fills', theme.background1);
            (0, shared_1.applyComponentMeta)(image, componentId);
            node = image;
            break;
        }
        case 'product_title':
            node = await createTextLayer('Product Title', 'Product Name', 14, 160);
            await (0, theme_1.applyThemeText)(node, theme, { colorVariable: theme.background1 });
            (0, shared_1.applyComponentMeta)(node, componentId);
            break;
        case 'product_subtitle':
            node = await createTextLayer('Product Subtitle', '$XX.XX', 12, 160);
            await (0, theme_1.applyThemeText)(node, theme, { colorVariable: theme.background1 });
            (0, shared_1.applyComponentMeta)(node, componentId);
            break;
        case 'product_price':
            node = await createTextLayer('Product Price', '$XX.XX', 14, 120);
            await (0, theme_1.applyThemeText)(node, theme, { colorVariable: theme.background1 });
            (0, shared_1.applyComponentMeta)(node, componentId);
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
            summary.fills = [(0, shared_1.makeSolidFill)('#EAEAEA')];
            (0, theme_1.bindColorVariable)(summary, 'fills', theme.fontColor);
            (0, shared_1.applyComponentMeta)(summary, componentId);
            summary.appendChild(await buildPriceRow('Subtotal', 'Subtotal:', '$XX.XX', 'price_subtotal', theme));
            summary.appendChild(await buildPriceRow('Discount', 'Discount:', '-$XX.XX', 'price_discount', theme));
            summary.appendChild(await buildPriceRow('Total', 'Total:', '$XX.XX', 'price_total', theme));
            node = summary;
            break;
        }
        case 'price_subtotal':
        case 'price_discount':
        case 'price_total':
            node = await buildPriceRow(componentId === 'price_subtotal' ? 'Subtotal' : componentId === 'price_discount' ? 'Discount' : 'Total', componentId === 'price_subtotal' ? 'Subtotal:' : componentId === 'price_discount' ? 'Discount:' : 'Total:', componentId === 'price_discount' ? '-$XX.XX' : '$XX.XX', componentId, theme);
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
            timer.fills = [(0, shared_1.makeSolidFill)('#1F1F1F')];
            (0, theme_1.bindUniformRadius)(timer, theme.borderRadius);
            (0, theme_1.bindColorVariable)(timer, 'fills', theme.background1);
            (0, shared_1.applyComponentMeta)(timer, componentId);
            const time = await createTextLayer('Timer Text', '09:59', 18);
            await (0, theme_1.applyThemeText)(time, theme, { colorVariable: theme.fontColor });
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
            frame.strokes = [(0, shared_1.makeSolidFill)('#BDBDBD')];
            frame.strokeWeight = 1;
            (0, theme_1.bindUniformRadius)(frame, theme.borderRadius);
            (0, theme_1.bindColorVariable)(frame, 'strokes', theme.background2);
            (0, shared_1.applyComponentMeta)(frame, componentId);
            const text = await createTextLayer('Close Label', '×', 18);
            text.textAutoResize = 'WIDTH_AND_HEIGHT';
            await (0, theme_1.applyThemeText)(text, theme, { colorVariable: theme.fontColor });
            frame.appendChild(text);
            node = frame;
            break;
        }
        case 'disclaimer_text':
            node = await createTextLayer('Disclaimer', 'We use your information in accordance with our Privacy Policy.', 10, 320);
            await (0, theme_1.applyThemeText)(node, theme);
            (0, shared_1.applyComponentMeta)(node, componentId);
            break;
        case 'media_panel':
        default: {
            const rect = figma.createRectangle();
            rect.name = 'Media Panel';
            rect.resize(220, 320);
            rect.fills = [(0, shared_1.makeSolidFill)('#D9D9D9')];
            (0, theme_1.bindUniformRadius)(rect, theme.borderRadius);
            (0, theme_1.bindColorVariable)(rect, 'fills', theme.background2);
            (0, shared_1.applyComponentMeta)(rect, 'media_panel');
            node = rect;
            break;
        }
    }
    return node;
}
function findAssetLibraryPage() {
    for (let index = 0; index < figma.root.children.length; index += 1) {
        const child = figma.root.children[index];
        if ((0, shared_1.isPageNode)(child) && child.name === theme_2.ASSET_LIBRARY_PAGE_NAME)
            return child;
    }
    return undefined;
}
function findAssetSourceComponentNode(componentId) {
    const page = findAssetLibraryPage();
    if (!page)
        return undefined;
    const stack = page.children.slice();
    while (stack.length) {
        const current = stack.shift();
        if (!current)
            continue;
        const meta = (0, shared_1.getPluginMeta)(current);
        if (meta.exportComponent === componentId && current.type !== 'PAGE') {
            return current;
        }
        if ('children' in current && Array.isArray(current.children)) {
            for (let index = 0; index < current.children.length; index += 1) {
                stack.push(current.children[index]);
            }
        }
    }
    return undefined;
}
async function createAssetComponentInstance(componentId) {
    const sourceNode = findAssetSourceComponentNode(componentId);
    const node = sourceNode ? sourceNode.clone() : await buildAssetComponentNode(componentId);
    const selection = figma.currentPage.selection;
    const selectedNode = selection.length ? selection[0] : null;
    const insertionParent = selectedNode
        ? (0, shared_1.supportsChildren)(selectedNode)
            ? selectedNode
            : (0, shared_1.supportsChildren)(selectedNode.parent)
                ? selectedNode.parent
                : figma.currentPage
        : figma.currentPage;
    insertionParent.appendChild(node);
    if (selectedNode) {
        if (insertionParent === selectedNode) {
            node.x = 24;
            node.y = 24;
        }
        else {
            (0, shared_1.positionNearReference)(node, selectedNode);
        }
    }
    else {
        (0, shared_1.centerInViewport)(node);
    }
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
    return node;
}
},
"figma/shared": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSolidFill = makeSolidFill;
exports.loadTextNodeFont = loadTextNodeFont;
exports.centerInViewport = centerInViewport;
exports.supportsChildren = supportsChildren;
exports.positionNearReference = positionNearReference;
exports.isPageNode = isPageNode;
exports.getNodeChildren = getNodeChildren;
exports.getPluginMeta = getPluginMeta;
exports.setPluginMeta = setPluginMeta;
exports.applyComponentMeta = applyComponentMeta;
const constants_1 = require("../constants");
function makeSolidFill(hex) {
    const normalized = hex.replace('#', '');
    const expanded = normalized.length === 3
        ? normalized.split('').map(function (part) { return part + part; }).join('')
        : normalized;
    return {
        type: 'SOLID',
        color: {
            r: parseInt(expanded.slice(0, 2), 16) / 255,
            g: parseInt(expanded.slice(2, 4), 16) / 255,
            b: parseInt(expanded.slice(4, 6), 16) / 255,
        },
    };
}
async function loadTextNodeFont(textNode) {
    const fontName = textNode.fontName;
    if (fontName && fontName !== figma.mixed && typeof fontName === 'object') {
        await figma.loadFontAsync(fontName);
    }
}
function centerInViewport(node) {
    const viewport = figma.viewport.center;
    node.x = viewport.x - node.width / 2;
    node.y = viewport.y - node.height / 2;
}
function supportsChildren(node) {
    return !!node && 'appendChild' in node && typeof node.appendChild === 'function';
}
function positionNearReference(node, reference) {
    node.x = reference.x;
    node.y = reference.y + reference.height + 24;
}
function isPageNode(node) {
    return !!node && node.type === 'PAGE';
}
function getNodeChildren(node) {
    if (!node || !('children' in node) || !Array.isArray(node.children))
        return [];
    return node.children;
}
function getPluginMeta(node) {
    const getData = node && typeof node.getPluginData === 'function'
        ? (key) => String(node.getPluginData(key) || '').trim()
        : (_key) => '';
    return {
        exportRole: getData('exportRole') || undefined,
        exportComponent: getData('exportComponent') || undefined,
        exportCollection: getData('exportCollection') || undefined,
        exportIgnore: getData('exportIgnore') || undefined,
    };
}
function setPluginMeta(node, meta) {
    if (!node || typeof node.setPluginData !== 'function')
        return;
    node.setPluginData('exportRole', String(meta.exportRole || ''));
    node.setPluginData('exportComponent', String(meta.exportComponent || ''));
    node.setPluginData('exportCollection', String(meta.exportCollection || ''));
    node.setPluginData('exportIgnore', String(meta.exportIgnore || ''));
}
function applyComponentMeta(node, componentId) {
    const role = constants_1.COMPONENT_ROLE_MAP[componentId];
    setPluginMeta(node, {
        exportComponent: componentId,
        exportRole: role,
    });
}
},
"figma/import-library": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTemplatesPageFromLibrary = ensureTemplatesPageFromLibrary;
exports.ensureAssetSourcePage = ensureAssetSourcePage;
const constants_1 = require("../constants");
const template_library_1 = require("../generated/template-library");
const builders_1 = require("./builders");
const theme_1 = require("./theme");
const shared_1 = require("./shared");
function findAssetLibraryPage() {
    for (let index = 0; index < figma.root.children.length; index += 1) {
        const child = figma.root.children[index];
        if ((0, shared_1.isPageNode)(child) && child.name === theme_1.ASSET_LIBRARY_PAGE_NAME)
            return child;
    }
    return undefined;
}
function getTextDescendants(node) {
    const found = [];
    const stack = [node];
    while (stack.length) {
        const current = stack.shift();
        if (!current)
            continue;
        if (current.type === 'TEXT') {
            found.push(current);
            continue;
        }
        if ('children' in current && Array.isArray(current.children)) {
            for (let index = 0; index < current.children.length; index += 1) {
                stack.push(current.children[index]);
            }
        }
    }
    return found;
}
async function applyThemeToExistingComponent(node, theme) {
    const meta = (0, shared_1.getPluginMeta)(node);
    const componentId = meta.exportComponent;
    if (!componentId)
        return;
    if (componentId === 'modal_shell' ||
        componentId === 'sidebar_shell' ||
        componentId === 'bottom_bar_shell') {
        (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        (0, theme_1.bindColorVariable)(node, 'fills', theme.background2);
    }
    if (componentId === 'content_stack' ||
        componentId === 'media_panel' ||
        componentId === 'product_card') {
        (0, theme_1.bindColorVariable)(node, 'fills', theme.background2);
    }
    if (componentId === 'product_image') {
        (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        (0, theme_1.bindColorVariable)(node, 'fills', theme.background1);
    }
    if (componentId === 'price_table') {
        if ('fills' in node) {
            node.fills = [(0, shared_1.makeSolidFill)('#EAEAEA')];
            (0, theme_1.bindColorVariable)(node, 'fills', theme.fontColor);
        }
        if ('cornerRadius' in node)
            node.cornerRadius = 0;
    }
    if (componentId === 'primary_button' ||
        componentId === 'thank_you_button') {
        (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        (0, theme_1.bindColorVariable)(node, 'fills', theme.button1);
        const textNodes = getTextDescendants(node);
        for (let index = 0; index < textNodes.length; index += 1) {
            await (0, theme_1.applyThemeText)(textNodes[index], theme, { colorVariable: theme.fontColor });
        }
    }
    if (componentId === 'product_button') {
        (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        (0, theme_1.bindColorVariable)(node, 'fills', theme.button2);
        const textNodes = getTextDescendants(node);
        for (let index = 0; index < textNodes.length; index += 1) {
            await (0, theme_1.applyThemeText)(textNodes[index], theme, { colorVariable: theme.fontColor });
        }
    }
    if (componentId === 'no_thanks_button') {
        (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        (0, theme_1.bindColorVariable)(node, 'fills', theme.highlight);
        const textNodes = getTextDescendants(node);
        for (let index = 0; index < textNodes.length; index += 1) {
            await (0, theme_1.applyThemeText)(textNodes[index], theme, { colorVariable: theme.fontColor });
        }
    }
    if (componentId === 'divider') {
        (0, theme_1.bindColorVariable)(node, 'fills', theme.background1);
    }
    if (componentId === 'email_input' || componentId === 'phone_input') {
        (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        (0, theme_1.bindColorVariable)(node, 'strokes', theme.background2);
        const textNodes = getTextDescendants(node);
        for (let index = 0; index < textNodes.length; index += 1) {
            await (0, theme_1.applyThemeText)(textNodes[index], theme, { colorVariable: theme.background1 });
        }
    }
    if (componentId === 'optin_component') {
        const textNodes = getTextDescendants(node);
        for (let index = 0; index < textNodes.length; index += 1) {
            await (0, theme_1.applyThemeText)(textNodes[index], theme, { colorVariable: theme.fontColor });
        }
        if ('children' in node && Array.isArray(node.children) && node.children[0]) {
            (0, theme_1.bindUniformRadius)(node.children[0], theme.borderRadius);
            (0, theme_1.bindColorVariable)(node.children[0], 'strokes', theme.fontColor);
        }
    }
    if (componentId === 'copy_coupon') {
        const children = 'children' in node && Array.isArray(node.children)
            ? node.children
            : [];
        if (children[0]) {
            (0, theme_1.bindUniformRadius)(children[0], theme.borderRadius);
            (0, theme_1.bindColorVariable)(children[0], 'strokes', theme.button2);
            const codeTexts = getTextDescendants(children[0]);
            for (let index = 0; index < codeTexts.length; index += 1) {
                await (0, theme_1.applyThemeText)(codeTexts[index], theme, {
                    charactersVariable: theme.incentive,
                    colorVariable: theme.background1,
                });
            }
        }
        if (children[1]) {
            (0, theme_1.bindUniformRadius)(children[1], theme.borderRadius);
            (0, theme_1.bindColorVariable)(children[1], 'fills', theme.highlight);
            const buttonTexts = getTextDescendants(children[1]);
            for (let index = 0; index < buttonTexts.length; index += 1) {
                await (0, theme_1.applyThemeText)(buttonTexts[index], theme, { colorVariable: theme.fontColor });
            }
        }
    }
    if (componentId === 'progress_bar') {
        (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        (0, theme_1.bindColorVariable)(node, 'fills', theme.background2);
        if ('children' in node && Array.isArray(node.children) && node.children[0]) {
            (0, theme_1.bindUniformRadius)(node.children[0], theme.borderRadius);
            (0, theme_1.bindColorVariable)(node.children[0], 'fills', theme.highlight);
        }
    }
    if (componentId === 'headline_block' || componentId === 'subtext_block' || componentId === 'disclaimer_text') {
        await (0, theme_1.applyThemeText)(node, theme, { colorVariable: theme.fontColor });
    }
    if (componentId === 'eyebrow_block') {
        await (0, theme_1.applyThemeText)(node, theme, {
            charactersVariable: theme.incentive,
            colorVariable: theme.fontColor,
        });
    }
    if (componentId === 'product_title' ||
        componentId === 'product_subtitle' ||
        componentId === 'product_price' ||
        componentId === 'price_subtotal' ||
        componentId === 'price_discount' ||
        componentId === 'price_total') {
        const textNodes = node.type === 'TEXT' ? [node] : getTextDescendants(node);
        for (let index = 0; index < textNodes.length; index += 1) {
            await (0, theme_1.applyThemeText)(textNodes[index], theme, { colorVariable: theme.background1 });
        }
    }
    if (componentId === 'countdown_timer' || componentId === 'close_control') {
        if (componentId === 'countdown_timer') {
            (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
            (0, theme_1.bindColorVariable)(node, 'fills', theme.background1);
        }
        if (componentId === 'close_control') {
            if ('layoutMode' in node) {
                node.layoutMode = 'HORIZONTAL';
                node.primaryAxisSizingMode = 'FIXED';
                node.counterAxisSizingMode = 'FIXED';
                node.primaryAxisAlignItems = 'CENTER';
                node.counterAxisAlignItems = 'CENTER';
            }
            if ('strokes' in node) {
                node.strokes = [(0, shared_1.makeSolidFill)('#BDBDBD')];
                (0, theme_1.bindColorVariable)(node, 'strokes', theme.background2);
            }
            if ('strokeWeight' in node) {
                node.strokeWeight = 1;
            }
            (0, theme_1.bindUniformRadius)(node, theme.borderRadius);
        }
        const textNodes = getTextDescendants(node);
        for (let index = 0; index < textNodes.length; index += 1) {
            textNodes[index].textAutoResize = 'WIDTH_AND_HEIGHT';
            textNodes[index].textAlignVertical = 'CENTER';
            await (0, theme_1.applyThemeText)(textNodes[index], theme, { colorVariable: theme.fontColor });
        }
    }
}
function findPageByName(name) {
    for (let index = 0; index < figma.root.children.length; index += 1) {
        const child = figma.root.children[index];
        if ((0, shared_1.isPageNode)(child) && child.name === name)
            return child;
    }
    return undefined;
}
function clearPageChildren(page) {
    const children = page.children.slice();
    for (let index = 0; index < children.length; index += 1) {
        children[index].remove();
    }
}
async function loadBestMatchingFont(textNode, style) {
    const family = style.fontFamily || 'Merriweather Sans';
    const styleName = style.fontStyle === 'italic'
        ? 'Italic'
        : style.fontWeight && style.fontWeight >= 700
            ? 'Bold'
            : style.fontWeight && style.fontWeight >= 500
                ? 'Medium'
                : 'Regular';
    try {
        await figma.loadFontAsync({ family: family, style: styleName });
        textNode.fontName = { family: family, style: styleName };
    }
    catch (_error) {
        try {
            await figma.loadFontAsync({ family: family, style: 'Regular' });
            textNode.fontName = { family: family, style: 'Regular' };
        }
        catch (_secondError) {
            // Keep whatever font is currently available.
        }
    }
}
function applyNodeStyleToShape(node, style) {
    if (style.background)
        node.fills = [(0, shared_1.makeSolidFill)(cssColorToHex(style.background))];
    else if ('fills' in node)
        node.fills = [];
    if (style.borderColor && 'strokes' in node) {
        node.strokes = [(0, shared_1.makeSolidFill)(cssColorToHex(style.borderColor))];
        if (style.borderWidth != null)
            node.strokeWeight = style.borderWidth;
    }
    else if ('strokes' in node) {
        node.strokes = [];
    }
    if (style.borderRadius != null && 'cornerRadius' in node) {
        node.cornerRadius = style.borderRadius;
    }
    if (style.opacity != null) {
        node.opacity = style.opacity;
    }
}
function cssColorToHex(value) {
    const input = String(value || '').trim();
    if (input.startsWith('#'))
        return input;
    const match = input.match(/rgba?\(([^)]+)\)/i);
    if (!match)
        return '#000000';
    const parts = match[1].split(',').map(function (part) { return Number(String(part).trim()); });
    const toHex = function (num) {
        return Math.max(0, Math.min(255, Math.round(num))).toString(16).padStart(2, '0');
    };
    return '#' + toHex(parts[0] || 0) + toHex(parts[1] || 0) + toHex(parts[2] || 0);
}
function mapPrimaryAlign(value) {
    if (value === 'CENTER')
        return 'CENTER';
    if (value === 'MAX')
        return 'MAX';
    if (value === 'SPACE_BETWEEN')
        return 'SPACE_BETWEEN';
    return 'MIN';
}
function mapCounterAlign(value) {
    if (value === 'CENTER')
        return 'CENTER';
    if (value === 'MAX')
        return 'MAX';
    if (value === 'BASELINE')
        return 'BASELINE';
    return 'MIN';
}
function isCenteredControl(componentId) {
    return (componentId === 'primary_button' ||
        componentId === 'thank_you_button' ||
        componentId === 'no_thanks_button' ||
        componentId === 'product_button' ||
        componentId === 'close_control');
}
async function createNodeFromManifest(node, parentBounds, parentLayoutMode) {
    let sceneNode;
    if (node.type === 'TEXT') {
        const text = figma.createText();
        await (0, shared_1.loadTextNodeFont)(text);
        await loadBestMatchingFont(text, node.style);
        text.characters = node.text || '';
        if (node.style.fontSize != null)
            text.fontSize = node.style.fontSize;
        if (node.style.textAlign)
            text.textAlignHorizontal = String(node.style.textAlign).toUpperCase();
        if (node.componentOverride === 'close_control' || parentLayoutMode === 'HORIZONTAL' || parentLayoutMode === 'VERTICAL') {
            text.textAlignVertical = 'CENTER';
        }
        if (node.style.color)
            text.fills = [(0, shared_1.makeSolidFill)(cssColorToHex(node.style.color))];
        if (node.style.opacity != null)
            text.opacity = node.style.opacity;
        if (node.bounds.width && node.bounds.height) {
            if (parentLayoutMode === 'HORIZONTAL' || parentLayoutMode === 'VERTICAL') {
                text.textAutoResize = 'WIDTH_AND_HEIGHT';
            }
            else {
                text.textAutoResize = 'NONE';
                text.resize(node.bounds.width, node.bounds.height);
            }
        }
        sceneNode = text;
    }
    else if (node.children.length || node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        const frame = figma.createFrame();
        frame.layoutMode = node.layout.mode === 'HORIZONTAL' || node.layout.mode === 'VERTICAL' ? node.layout.mode : 'NONE';
        if (frame.layoutMode === 'HORIZONTAL') {
            frame.primaryAxisSizingMode = node.layout.widthMode === 'HUG' ? 'AUTO' : 'FIXED';
            frame.counterAxisSizingMode = node.layout.heightMode === 'HUG' ? 'AUTO' : 'FIXED';
        }
        else if (frame.layoutMode === 'VERTICAL') {
            frame.primaryAxisSizingMode = node.layout.heightMode === 'HUG' ? 'AUTO' : 'FIXED';
            frame.counterAxisSizingMode = node.layout.widthMode === 'HUG' ? 'AUTO' : 'FIXED';
        }
        if (frame.layoutMode !== 'NONE') {
            frame.primaryAxisAlignItems = isCenteredControl(node.componentOverride) ? 'CENTER' : mapPrimaryAlign(node.layout.primaryAlign);
            frame.counterAxisAlignItems = isCenteredControl(node.componentOverride) ? 'CENTER' : mapCounterAlign(node.layout.counterAlign);
        }
        frame.itemSpacing = node.layout.gap || 0;
        frame.paddingTop = node.layout.padding.top || 0;
        frame.paddingRight = node.layout.padding.right || 0;
        frame.paddingBottom = node.layout.padding.bottom || 0;
        frame.paddingLeft = node.layout.padding.left || 0;
        if (node.bounds.width && node.bounds.height)
            frame.resize(node.bounds.width, node.bounds.height);
        applyNodeStyleToShape(frame, node.style);
        for (let index = 0; index < node.children.length; index += 1) {
            const child = await createNodeFromManifest(node.children[index], node.bounds, frame.layoutMode);
            frame.appendChild(child);
        }
        sceneNode = frame;
    }
    else {
        const rect = figma.createRectangle();
        if (node.bounds.width && node.bounds.height)
            rect.resize(node.bounds.width, node.bounds.height);
        applyNodeStyleToShape(rect, node.style);
        sceneNode = rect;
    }
    sceneNode.name = node.name;
    if (node.componentOverride) {
        (0, shared_1.applyComponentMeta)(sceneNode, node.componentOverride);
    }
    else if (node.metadata.exportRole || node.metadata.exportComponent || node.metadata.exportCollection || node.metadata.exportIgnore) {
        (0, shared_1.setPluginMeta)(sceneNode, node.metadata);
    }
    if (parentBounds && parentLayoutMode === 'NONE' && ('x' in sceneNode) && ('y' in sceneNode)) {
        sceneNode.x = node.bounds.x - parentBounds.x;
        sceneNode.y = node.bounds.y - parentBounds.y;
    }
    return sceneNode;
}
async function buildLibrarySectionFrame(label, theme) {
    const frame = figma.createFrame();
    frame.name = label;
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.itemSpacing = 16;
    frame.paddingTop = 24;
    frame.paddingRight = 24;
    frame.paddingBottom = 24;
    frame.paddingLeft = 24;
    frame.cornerRadius = 12;
    frame.fills = [(0, shared_1.makeSolidFill)('#3E3E3E')];
    (0, theme_1.bindUniformRadius)(frame, theme.borderRadius);
    (0, theme_1.bindColorVariable)(frame, 'fills', theme.background1);
    const heading = figma.createText();
    await (0, shared_1.loadTextNodeFont)(heading);
    heading.name = label;
    heading.characters = label;
    heading.fontSize = 20;
    await (0, theme_1.applyThemeText)(heading, theme, { colorVariable: theme.fontColor });
    frame.appendChild(heading);
    return frame;
}
async function ensureTemplatesPageFromLibrary() {
    const library = template_library_1.BUNDLED_TEMPLATE_LIBRARY;
    const themeSnapshot = library.assetTheme.length
        ? library.assetTheme
        : library.entries.length && library.entries[0].assetTheme
            ? library.entries[0].assetTheme
            : [];
    await (0, theme_1.applyThemeSnapshot)(themeSnapshot);
    let page = findPageByName(theme_1.TEMPLATES_PAGE_NAME);
    if (!page) {
        page = figma.createPage();
        page.name = theme_1.TEMPLATES_PAGE_NAME;
    }
    clearPageChildren(page);
    const entries = library.entries.slice();
    const columnGap = 80;
    const rowGap = 160;
    const maxWidth = 2400;
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (!entry || !entry.ast)
            continue;
        const frame = await createNodeFromManifest(entry.ast);
        frame.name = entry.frameName;
        if (x + frame.width > maxWidth && x > 0) {
            x = 0;
            y += rowHeight + rowGap;
            rowHeight = 0;
        }
        page.appendChild(frame);
        frame.x = x;
        frame.y = y;
        x += frame.width + columnGap;
        rowHeight = Math.max(rowHeight, frame.height);
    }
    await figma.setCurrentPageAsync(page);
    figma.viewport.scrollAndZoomIntoView(page.children);
    return page;
}
async function ensureAssetSourcePage() {
    const libraryTheme = template_library_1.BUNDLED_TEMPLATE_LIBRARY.assetTheme.length
        ? template_library_1.BUNDLED_TEMPLATE_LIBRARY.assetTheme
        : template_library_1.BUNDLED_TEMPLATE_LIBRARY.entries.length && template_library_1.BUNDLED_TEMPLATE_LIBRARY.entries[0].assetTheme
            ? template_library_1.BUNDLED_TEMPLATE_LIBRARY.entries[0].assetTheme
            : [];
    const theme = await (0, theme_1.applyThemeSnapshot)(libraryTheme);
    let page = findAssetLibraryPage();
    if (!page) {
        page = figma.createPage();
        page.name = theme_1.ASSET_LIBRARY_PAGE_NAME;
    }
    const sections = {};
    for (let index = 0; index < page.children.length; index += 1) {
        const child = page.children[index];
        if (child.type === 'FRAME') {
            sections[String(child.name || '').toLowerCase()] = child;
        }
    }
    for (let index = 0; index < constants_1.COMMON_COMPONENTS.length; index += 1) {
        const component = constants_1.COMMON_COMPONENTS[index];
        const stack = page.children.slice();
        let existing = false;
        while (stack.length) {
            const current = stack.shift();
            if (!current)
                continue;
            if ((0, shared_1.getPluginMeta)(current).exportComponent === component.id && current.type !== 'PAGE') {
                existing = true;
                break;
            }
            for (let childIndex = 0; childIndex < (0, shared_1.getNodeChildren)(current).length; childIndex += 1) {
                stack.push((0, shared_1.getNodeChildren)(current)[childIndex]);
            }
        }
        if (existing)
            continue;
        const sectionKey = String(component.category || '').toLowerCase();
        if (!sections[sectionKey]) {
            const section = await buildLibrarySectionFrame(component.category.charAt(0).toUpperCase() + component.category.slice(1), theme);
            page.appendChild(section);
            sections[sectionKey] = section;
        }
        const node = await (0, builders_1.buildAssetComponentNode)(component.id);
        sections[sectionKey].appendChild(node);
    }
    const stack = page.children.slice();
    while (stack.length) {
        const current = stack.shift();
        if (!current)
            continue;
        if (current.type !== 'PAGE') {
            await applyThemeToExistingComponent(current, theme);
        }
        if ('children' in current && Array.isArray(current.children)) {
            for (let index = 0; index < current.children.length; index += 1) {
                stack.push(current.children[index]);
            }
        }
    }
    let x = 0;
    const pageChildren = page.children.filter(function (child) { return child.type === 'FRAME'; });
    for (let index = 0; index < pageChildren.length; index += 1) {
        (0, theme_1.bindUniformRadius)(pageChildren[index], theme.borderRadius);
        (0, theme_1.bindColorVariable)(pageChildren[index], 'fills', theme.background1);
        const textChildren = pageChildren[index].children.filter(function (child) { return child.type === 'TEXT'; });
        for (let textIndex = 0; textIndex < textChildren.length; textIndex += 1) {
            await (0, theme_1.applyThemeText)(textChildren[textIndex], theme, { colorVariable: theme.fontColor });
        }
        pageChildren[index].x = x;
        pageChildren[index].y = 0;
        x += pageChildren[index].width + 48;
    }
    await figma.setCurrentPageAsync(page);
    figma.viewport.scrollAndZoomIntoView(page.children);
    return page;
}
},
"generated/template-library": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUNDLED_TEMPLATE_LIBRARY = void 0;
exports.BUNDLED_TEMPLATE_LIBRARY = { "sourceFolder": "USI Modal", "assetTheme": [{ "collectionName": "Upsellit Asset Tokens", "name": "Incentive", "resolvedType": "STRING", "value": "15% Off" }, { "collectionName": "Upsellit Asset Tokens", "name": "Border Radius", "resolvedType": "FLOAT", "value": 36 }, { "collectionName": "Upsellit Asset Tokens", "name": "FontFamily", "resolvedType": "STRING", "value": "Merriweather Sans" }, { "collectionName": "Upsellit Asset Tokens", "name": "FontColor", "resolvedType": "COLOR", "value": { "r": 0.9176470637321472, "g": 0.9176470637321472, "b": 0.9176470637321472, "a": 1 } }, { "collectionName": "Upsellit Asset Tokens", "name": "Background 1", "resolvedType": "COLOR", "value": { "r": 0.24313725531101227, "g": 0.24313725531101227, "b": 0.24313725531101227, "a": 1 } }, { "collectionName": "Upsellit Asset Tokens", "name": "Background 2", "resolvedType": "COLOR", "value": { "r": 0.7400000095367432, "g": 0.7400000095367432, "b": 0.7400000095367432, "a": 1 } }, { "collectionName": "Upsellit Asset Tokens", "name": "Button 1", "resolvedType": "COLOR", "value": { "r": 0.23529411852359772, "g": 0.545098066329956, "b": 0.8509804010391235, "a": 1 } }, { "collectionName": "Upsellit Asset Tokens", "name": "Button 2", "resolvedType": "COLOR", "value": { "r": 0.06325899809598923, "g": 0.3113093078136444, "b": 0.5562196373939514, "a": 1 } }, { "collectionName": "Upsellit Asset Tokens", "name": "Highlight", "resolvedType": "COLOR", "value": { "r": 0.8235294222831726, "g": 0.0235294122248888, "b": 0.5333333611488342, "a": 1 } }], "entries": [{ "frameName": "Bottom-Bar-01", "folder": "upsellit-modal-templates-v2_bottom-bar-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "Don’t go until you take a look at this deal", "closeButton": true, "products": [], "primaryCta": { "label": "Redeem Now" }, "disclaimer": "We use your information in accordance with our Privacy Policy." }, "ast": { "id": "1:352", "name": "Bottom-Bar-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "bottom_bar_shell", "bounds": { "x": 555, "y": 1331, "width": 1280, "height": 180 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:353", "name": "Disclaimer", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "disclaimer", "componentOverride": "disclaimer_text", "text": "We use your information in accordance with our Privacy Policy.", "bounds": { "x": 1328.786376953125, "y": 1472.721923828125, "width": 320, "height": 13 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 10, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "disclaimer", "roleConfidence": 1, "metadata": { "exportRole": "disclaimer", "exportComponent": "disclaimer_text" } }, { "id": "1:354", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": 1328.786376953125, "y": 1383.721923828125, "width": 307, "height": 73 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:355", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": 1352.786376953125, "y": 1397.721923828125, "width": 259, "height": 45 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:356", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "Don’t go until you take a look at this deal", "bounds": { "x": 582.786376953125, "y": 1350.721923828125, "width": 518, "height": 134 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "6:14", "name": "Logo", "type": "INSTANCE", "visible": true, "ignored": false, "bounds": { "x": 1141, "y": 1361, "width": 107, "height": 112 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "I6:14;6:3", "name": "Logo Icon", "type": "RECTANGLE", "visible": true, "ignored": false, "bounds": { "x": 1141, "y": 1361, "width": 107, "height": 112 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "12:1189", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": 1775, "y": 1338, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I12:1189;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": 1775, "y": 1334, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "bottom_bar_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_bottom-bar-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_bottom-bar-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_bottom-bar-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "LC-Mobile-P1-01", "folder": "upsellit-modal-templates-v2_lc-mobile-p1-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "eyebrow": "TODAY ONLY", "closeButton": true, "products": [], "primaryCta": { "label": "Submit Email" } }, "ast": { "id": "1:2", "name": "LC-Mobile-P1-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1849, "y": 1345, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:5", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -1784, "y": 1799.5, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:6", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Submit Email", "bounds": { "x": -1760, "y": 1813.5, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:28", "name": "Email Input", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "email-input", "componentOverride": "email_input", "bounds": { "x": -1786, "y": 1634, "width": 527, "height": 82 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 16, "bottom": 14, "left": 16 }, "primaryAlign": "MIN", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderColor": "rgb(207, 207, 207)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:29", "name": "Email Input Placeholder", "type": "TEXT", "visible": true, "ignored": false, "text": "Enter your email", "bounds": { "x": -1770, "y": 1660, "width": 288, "height": 30 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(111, 111, 111)", "borderWidth": 1, "opacity": 1, "color": "rgb(111, 111, 111)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "email-input", "roleConfidence": 1, "metadata": { "exportRole": "email-input", "exportComponent": "email_input" } }, { "id": "1:55", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": -1849, "y": 1449, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:56", "name": "Eyebrow", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "eyebrow", "componentOverride": "eyebrow_block", "text": "TODAY ONLY", "bounds": { "x": -1636, "y": 1415.5, "width": 220, "height": 30 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "eyebrow", "roleConfidence": 1, "metadata": { "exportRole": "eyebrow", "exportComponent": "eyebrow_block" } }, { "id": "1:248", "name": "Opt-In", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "optin", "componentOverride": "optin_component", "bounds": { "x": -1784, "y": 1731, "width": 522, "height": 46 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 10, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "CENTER", "widthMode": "HUG", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:249", "name": "Opt-In Box", "type": "RECTANGLE", "visible": true, "ignored": false, "bounds": { "x": -1784, "y": 1745, "width": 18, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderColor": "rgb(34, 34, 34)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "1:250", "name": "Opt-In Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Yes, send me updates and offers.", "bounds": { "x": -1756, "y": 1735.5, "width": 494, "height": 37 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "optin", "roleConfidence": 1, "metadata": { "exportRole": "optin", "exportComponent": "optin_component" } }, { "id": "7:40", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": -1285, "y": 1362, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:40;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": -1285, "y": 1358, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_lc-mobile-p1-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_lc-mobile-p1-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_lc-mobile-p1-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "LC-Mobile-P2-01", "folder": "upsellit-modal-templates-v2_lc-mobile-p2-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "Thank you Your discount is on its way", "closeButton": true, "products": [], "primaryCta": { "label": "Continue Shopping" } }, "ast": { "id": "1:30", "name": "LC-Mobile-P2-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1147, "y": 1345, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:35", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "Thank you\nYour discount \nis on its way", "bounds": { "x": -1145, "y": 1473, "width": 640, "height": 266 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontSize": 64, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:246", "name": "Thank You Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "thank_you_button", "bounds": { "x": -1096, "y": 1815, "width": 537, "height": 126 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:247", "name": "Thank You Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Continue Shopping", "bounds": { "x": -1072, "y": 1829, "width": 513, "height": 98 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "thank_you_button" } }, { "id": "7:34", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": -583, "y": 1362, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:34;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": -583, "y": 1358, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_lc-mobile-p2-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_lc-mobile-p2-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_lc-mobile-p2-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "LC-Phone-Mobile-P1-01", "folder": "upsellit-modal-templates-v2_lc-phone-mobile-p1-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "eyebrow": "TODAY ONLY", "closeButton": true, "products": [], "primaryCta": { "label": "Send Phone Number" } }, "ast": { "id": "1:257", "name": "LC-Phone-Mobile-P1-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1849, "y": 2201, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:258", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -1784, "y": 2655.5, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:259", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Send Phone Number", "bounds": { "x": -1760, "y": 2669.5, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 40, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:262", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": -1849, "y": 2305, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:263", "name": "Eyebrow", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "eyebrow", "componentOverride": "eyebrow_block", "text": "TODAY ONLY", "bounds": { "x": -1636, "y": 2271.5, "width": 220, "height": 30 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "eyebrow", "roleConfidence": 1, "metadata": { "exportRole": "eyebrow", "exportComponent": "eyebrow_block" } }, { "id": "1:270", "name": "Phone Input", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "phone-input", "componentOverride": "phone_input", "bounds": { "x": -1784, "y": 2479, "width": 527, "height": 87 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 16, "bottom": 14, "left": 16 }, "primaryAlign": "MIN", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderColor": "rgb(207, 207, 207)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:271", "name": "Phone Input Placeholder", "type": "TEXT", "visible": true, "ignored": false, "text": "Enter your phone number", "bounds": { "x": -1768, "y": 2510, "width": 288, "height": 25 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(111, 111, 111)", "borderWidth": 1, "opacity": 1, "color": "rgb(111, 111, 111)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 20, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "phone-input", "roleConfidence": 1, "metadata": { "exportRole": "phone-input", "exportComponent": "phone_input" } }, { "id": "1:266", "name": "Opt-In", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "optin", "componentOverride": "optin_component", "bounds": { "x": -1784, "y": 2587, "width": 522, "height": 46 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 10, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "CENTER", "widthMode": "HUG", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:267", "name": "Opt-In Box", "type": "RECTANGLE", "visible": true, "ignored": false, "bounds": { "x": -1784, "y": 2601, "width": 18, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderColor": "rgb(34, 34, 34)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "1:268", "name": "Opt-In Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Yes, send me updates and offers.", "bounds": { "x": -1756, "y": 2591.5, "width": 494, "height": 37 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "optin", "roleConfidence": 1, "metadata": { "exportRole": "optin", "exportComponent": "optin_component" } }, { "id": "7:37", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": -1285, "y": 2218, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:37;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": -1285, "y": 2214, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_lc-phone-mobile-p1-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_lc-phone-mobile-p1-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_lc-phone-mobile-p1-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "LC-Phone-Mobile-P2-01", "folder": "upsellit-modal-templates-v2_lc-phone-mobile-p2-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "Thank you Your discount is on its way", "closeButton": true, "products": [], "primaryCta": { "label": "Continue Shopping" } }, "ast": { "id": "1:251", "name": "LC-Phone-Mobile-P2-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1147, "y": 2201, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:252", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "Thank you\nYour discount \nis on its way", "bounds": { "x": -1145, "y": 2329, "width": 640, "height": 266 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontSize": 64, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:255", "name": "Thank You Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "thank_you_button", "bounds": { "x": -1096, "y": 2671, "width": 537, "height": 126 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:256", "name": "Thank You Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Continue Shopping", "bounds": { "x": -1072, "y": 2685, "width": 513, "height": 98 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "thank_you_button" } }, { "id": "7:43", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": -583, "y": 2218, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:43;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": -583, "y": 2214, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_lc-phone-mobile-p2-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_lc-phone-mobile-p2-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_lc-phone-mobile-p2-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "Sidebar-01", "folder": "upsellit-modal-templates-v2_sidebar-01_26-04", "schema": { "pattern": "single", "layout": "mobile", "headline": "Don’t go until you take a look at this deal", "closeButton": true, "products": [], "primaryCta": { "label": "Redeem Now" }, "disclaimer": "We use your information in accordance with our Privacy Policy." }, "ast": { "id": "1:345", "name": "Sidebar-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "sidebar_shell", "bounds": { "x": -325, "y": 1331, "width": 400, "height": 1200 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:351", "name": "Disclaimer", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "disclaimer", "componentOverride": "disclaimer_text", "text": "We use your information in accordance with our Privacy Policy.", "bounds": { "x": -273, "y": 2486, "width": 320, "height": 13 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 10, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "disclaimer", "roleConfidence": 1, "metadata": { "exportRole": "disclaimer", "exportComponent": "disclaimer_text" } }, { "id": "1:349", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -273, "y": 2013, "width": 307, "height": 75 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:350", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": -249, "y": 2027, "width": 257, "height": 47 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:348", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "Don’t go until you take a look at this deal", "bounds": { "x": -273, "y": 1711, "width": 307, "height": 255 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "6:8", "name": "Logo", "type": "COMPONENT", "visible": true, "ignored": false, "bounds": { "x": -207, "y": 1438, "width": 165, "height": 172 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "6:3", "name": "Logo Icon", "type": "RECTANGLE", "visible": true, "ignored": false, "bounds": { "x": -207, "y": 1438, "width": 165, "height": 172 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "7:31", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": 15, "y": 1331, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:31;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": 15, "y": 1327, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "sidebar_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_sidebar-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_sidebar-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_sidebar-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "Sidebar-02", "folder": "upsellit-modal-templates-v2_sidebar-02_26-04", "schema": { "pattern": "grid", "layout": "mobile", "headline": "Don’t go until you take a look at this deal", "closeButton": true, "products": [{ "title": "Product Name", "subtitle": "$XX.XX", "cta": "View Item", "imageAlt": "Product Name", "imageAsset": "upsellit-modal-templates-v2_sidebar-02_26-04-product-1.webp" }, { "title": "Product Name", "subtitle": "$XX.XX", "cta": "View Item", "imageAlt": "Product Name", "imageAsset": "upsellit-modal-templates-v2_sidebar-02_26-04-product-2.webp" }, { "title": "Product Name", "subtitle": "$XX.XX", "cta": "View Item", "imageAlt": "Product Name", "imageAsset": "upsellit-modal-templates-v2_sidebar-02_26-04-product-3.webp" }], "primaryCta": { "label": "Redeem Now" }, "disclaimer": "We use your information in accordance with our Privacy Policy." }, "ast": { "id": "3:3", "name": "Sidebar-02", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "sidebar_shell", "bounds": { "x": 115, "y": 1331, "width": 400, "height": 1200 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "3:4", "name": "Disclaimer", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "disclaimer", "componentOverride": "disclaimer_text", "text": "We use your information in accordance with our Privacy Policy.", "bounds": { "x": 167, "y": 2486, "width": 320, "height": 13 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 10, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "disclaimer", "roleConfidence": 1, "metadata": { "exportRole": "disclaimer", "exportComponent": "disclaimer_text" } }, { "id": "3:5", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": 161, "y": 1640, "width": 307, "height": 73 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "3:6", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": 185, "y": 1654, "width": 259, "height": 45 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "3:7", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "Don’t go until you take a look at this deal", "bounds": { "x": 161, "y": 1385, "width": 307, "height": 255 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "3:11", "name": "Product Grid", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-list", "componentOverride": "product_grid", "collection": "products", "bounds": { "x": 136, "y": 1743, "width": 358, "height": 704 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 16, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "CENTER", "widthMode": "HUG", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "3:12", "name": "Product Card", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-card", "componentOverride": "product_card", "bounds": { "x": 136, "y": 1743, "width": 358, "height": 220 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 8, "padding": { "top": 12, "right": 12, "bottom": 12, "left": 12 }, "primaryAlign": "CENTER", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "3:13", "name": "Product Image", "type": "RECTANGLE", "visible": true, "ignored": false, "roleOverride": "product-image", "componentOverride": "product_image", "bounds": { "x": 247, "y": 1761, "width": 136, "height": 96 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 8, "opacity": 1 }, "children": [], "detectedRole": "product-image", "roleConfidence": 1, "metadata": { "exportRole": "product-image", "exportComponent": "product_image" } }, { "id": "3:14", "name": "Product Title", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-title", "componentOverride": "product_title", "text": "Product Name", "bounds": { "x": 247, "y": 1865, "width": 136, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-title", "roleConfidence": 1, "metadata": { "exportRole": "product-title", "exportComponent": "product_title" } }, { "id": "3:15", "name": "Product Subtitle", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-subtitle", "componentOverride": "product_subtitle", "text": "$XX.XX", "bounds": { "x": 247, "y": 1891, "width": 136, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-subtitle", "roleConfidence": 1, "metadata": { "exportRole": "product-subtitle", "exportComponent": "product_subtitle" } }, { "id": "3:16", "name": "Product Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-cta", "componentOverride": "product_button", "bounds": { "x": 148, "y": 1914, "width": 334, "height": 31 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 8, "right": 12, "bottom": 8, "left": 12 }, "primaryAlign": "CENTER", "counterAlign": "CENTER", "widthMode": "FILL", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "3:17", "name": "Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "View Item", "bounds": { "x": 286, "y": 1922, "width": 58, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "product-cta", "roleConfidence": 1, "metadata": { "exportRole": "product-cta", "exportComponent": "product_button" } }], "detectedRole": "product-card", "roleConfidence": 1, "metadata": { "exportRole": "product-card", "exportComponent": "product_card" } }, { "id": "3:18", "name": "Product Card", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-card", "componentOverride": "product_card", "bounds": { "x": 136, "y": 1979, "width": 358, "height": 220 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 8, "padding": { "top": 12, "right": 12, "bottom": 12, "left": 12 }, "primaryAlign": "CENTER", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "12:1192", "name": "Product Image", "type": "RECTANGLE", "visible": true, "ignored": false, "roleOverride": "product-image", "componentOverride": "product_image", "bounds": { "x": 247, "y": 1997, "width": 136, "height": 96 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 8, "opacity": 1 }, "children": [], "detectedRole": "product-image", "roleConfidence": 1, "metadata": { "exportRole": "product-image", "exportComponent": "product_image" } }, { "id": "3:20", "name": "Product Title", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-title", "componentOverride": "product_title", "text": "Product Name", "bounds": { "x": 247, "y": 2101, "width": 136, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-title", "roleConfidence": 1, "metadata": { "exportRole": "product-title", "exportComponent": "product_title" } }, { "id": "3:21", "name": "Product Subtitle", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-subtitle", "componentOverride": "product_subtitle", "text": "$XX.XX", "bounds": { "x": 247, "y": 2127, "width": 136, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-subtitle", "roleConfidence": 1, "metadata": { "exportRole": "product-subtitle", "exportComponent": "product_subtitle" } }, { "id": "3:22", "name": "Product Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-cta", "componentOverride": "product_button", "bounds": { "x": 148, "y": 2150, "width": 334, "height": 31 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 8, "right": 12, "bottom": 8, "left": 12 }, "primaryAlign": "CENTER", "counterAlign": "CENTER", "widthMode": "FILL", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "3:23", "name": "Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "View Item", "bounds": { "x": 286, "y": 2158, "width": 58, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "product-cta", "roleConfidence": 1, "metadata": { "exportRole": "product-cta", "exportComponent": "product_button" } }], "detectedRole": "product-card", "roleConfidence": 1, "metadata": { "exportRole": "product-card", "exportComponent": "product_card" } }, { "id": "3:24", "name": "Product Card", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-card", "componentOverride": "product_card", "bounds": { "x": 136, "y": 2215, "width": 358, "height": 220 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 8, "padding": { "top": 12, "right": 12, "bottom": 12, "left": 12 }, "primaryAlign": "CENTER", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "12:1194", "name": "Product Image", "type": "RECTANGLE", "visible": true, "ignored": false, "roleOverride": "product-image", "componentOverride": "product_image", "bounds": { "x": 247, "y": 2233, "width": 136, "height": 96 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 8, "opacity": 1 }, "children": [], "detectedRole": "product-image", "roleConfidence": 1, "metadata": { "exportRole": "product-image", "exportComponent": "product_image" } }, { "id": "3:26", "name": "Product Title", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-title", "componentOverride": "product_title", "text": "Product Name", "bounds": { "x": 247, "y": 2337, "width": 136, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-title", "roleConfidence": 1, "metadata": { "exportRole": "product-title", "exportComponent": "product_title" } }, { "id": "3:27", "name": "Product Subtitle", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-subtitle", "componentOverride": "product_subtitle", "text": "$XX.XX", "bounds": { "x": 247, "y": 2363, "width": 136, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-subtitle", "roleConfidence": 1, "metadata": { "exportRole": "product-subtitle", "exportComponent": "product_subtitle" } }, { "id": "3:28", "name": "Product Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-cta", "componentOverride": "product_button", "bounds": { "x": 148, "y": 2386, "width": 334, "height": 31 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 8, "right": 12, "bottom": 8, "left": 12 }, "primaryAlign": "CENTER", "counterAlign": "CENTER", "widthMode": "FILL", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "3:29", "name": "Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "View Item", "bounds": { "x": 286, "y": 2394, "width": 58, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "product-cta", "roleConfidence": 1, "metadata": { "exportRole": "product-cta", "exportComponent": "product_button" } }], "detectedRole": "product-card", "roleConfidence": 1, "metadata": { "exportRole": "product-card", "exportComponent": "product_card" } }], "detectedRole": "product-list", "roleConfidence": 1, "metadata": { "exportRole": "product-list", "exportComponent": "product_grid", "exportCollection": "products" } }, { "id": "7:28", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": 444, "y": 1331, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:28;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": 444, "y": 1327, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }, { "id": "12:1186", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": 444, "y": 1331, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I12:1186;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": 444, "y": 1327, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "sidebar_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_sidebar-02_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_sidebar-02_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_sidebar-02_26-04_flattened_text_baked.webp", "productAssets": ["upsellit-modal-templates-v2_sidebar-02_26-04-product-1.webp", "upsellit-modal-templates-v2_sidebar-02_26-04-product-2.webp", "upsellit-modal-templates-v2_sidebar-02_26-04-product-3.webp"], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "Survey-Mobile-P1-01", "folder": "upsellit-modal-templates-v2_survey-mobile-p1-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "closeButton": true, "products": [], "primaryCta": { "label": "Submit" } }, "ast": { "id": "1:284", "name": "Survey-Mobile-P1-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1849, "y": 3057, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:285", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -1784, "y": 3533, "width": 527, "height": 127 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:286", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Submit", "bounds": { "x": -1760, "y": 3547, "width": 479, "height": 113 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:287", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": -1849, "y": 3131, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:293", "name": "Survey Block", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "survey", "componentOverride": "survey_block", "bounds": { "x": -1774, "y": 3283, "width": 490, "height": 208 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 12, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:294", "name": "Survey Question", "type": "TEXT", "visible": true, "ignored": false, "text": "How likely are you to purchase today?", "bounds": { "x": -1774, "y": 3283, "width": 490, "height": 30 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FILL", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "1:295", "name": "Survey Option", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "survey", "componentOverride": "survey_block", "bounds": { "x": -1774, "y": 3325, "width": 92, "height": 40 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 10, "right": 14, "bottom": 10, "left": 14 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:296", "name": "Survey Option Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Option 1", "bounds": { "x": -1760, "y": 3335, "width": 64, "height": 20 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 16, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "survey", "roleConfidence": 1, "metadata": { "exportRole": "survey", "exportComponent": "survey_block" } }, { "id": "1:297", "name": "Survey Option", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "survey", "componentOverride": "survey_block", "bounds": { "x": -1774, "y": 3377, "width": 94, "height": 40 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 10, "right": 14, "bottom": 10, "left": 14 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:298", "name": "Survey Option Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Option 2", "bounds": { "x": -1760, "y": 3387, "width": 66, "height": 20 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 16, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "survey", "roleConfidence": 1, "metadata": { "exportRole": "survey", "exportComponent": "survey_block" } }, { "id": "1:299", "name": "Survey Option", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "survey", "componentOverride": "survey_block", "bounds": { "x": -1774, "y": 3429, "width": 94, "height": 40 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 10, "right": 14, "bottom": 10, "left": 14 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:300", "name": "Survey Option Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Option 3", "bounds": { "x": -1760, "y": 3439, "width": 66, "height": 20 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 16, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "survey", "roleConfidence": 1, "metadata": { "exportRole": "survey", "exportComponent": "survey_block" } }], "detectedRole": "survey", "roleConfidence": 1, "metadata": { "exportRole": "survey", "exportComponent": "survey_block" } }, { "id": "7:7", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": -1285, "y": 3074, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:7;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": -1285, "y": 3070, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_survey-mobile-p1-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_survey-mobile-p1-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_survey-mobile-p1-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "Survey-Mobile-P2-01", "folder": "upsellit-modal-templates-v2_survey-mobile-p2-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "subtext": "Thank you", "closeButton": true, "products": [], "primaryCta": { "label": "Close Window" } }, "ast": { "id": "1:301", "name": "Survey-Mobile-P2-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1169, "y": 3057, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:302", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -1104, "y": 3511.5, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:303", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Close Window", "bounds": { "x": -1080, "y": 3525.5, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:316", "name": "Subtext", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "subtext", "componentOverride": "subtext_block", "text": "Thank you", "bounds": { "x": -1104, "y": 3292, "width": 515, "height": 45 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 36, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "subtext", "roleConfidence": 1, "metadata": { "exportRole": "subtext", "exportComponent": "subtext_block" } }, { "id": "1:304", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": -1169, "y": 3131, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "7:3", "name": "Close Button", "type": "COMPONENT", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": -605, "y": 3074, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": -605, "y": 3070, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_survey-mobile-p2-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_survey-mobile-p2-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_survey-mobile-p2-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "TT-Mobile-01", "folder": "upsellit-modal-templates-v2_tt-mobile-01_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "eyebrow": "TODAY ONLY", "closeButton": true, "products": [], "primaryCta": { "label": "Redeem Now" } }, "ast": { "id": "1:21", "name": "TT-Mobile-01", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1849, "y": 425, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 68, "padding": { "top": 50, "right": 0, "bottom": 50, "left": 0 }, "primaryAlign": "CENTER", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderColor": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:22", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -1792.5, "y": 861, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 50, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "SPACE_BETWEEN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:23", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": -1768.5, "y": 875, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:52", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": -1849, "y": 639, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:53", "name": "Eyebrow", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "eyebrow", "componentOverride": "eyebrow_block", "text": "TODAY ONLY", "bounds": { "x": -1849, "y": 542, "width": 640, "height": 30 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "eyebrow", "roleConfidence": 1, "metadata": { "exportRole": "eyebrow", "exportComponent": "eyebrow_block" } }, { "id": "7:10", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": -1285, "y": 442, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:10;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": -1285, "y": 438, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_tt-mobile-01_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_tt-mobile-01_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_tt-mobile-01_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "TT-Mobile-02", "folder": "upsellit-modal-templates-v2_tt-mobile-02_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "closeButton": false, "products": [], "primaryCta": { "label": "Redeem Now" }, "disclaimer": "We use your information in accordance with our Privacy Policy." }, "ast": { "id": "1:39", "name": "TT-Mobile-02", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -1147, "y": 425, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:58", "name": "Media Panel", "type": "RECTANGLE", "visible": true, "ignored": false, "roleOverride": "image", "componentOverride": "media_panel", "bounds": { "x": -1147, "y": 425, "width": 640, "height": 330 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [], "detectedRole": "image", "roleConfidence": 1, "metadata": { "exportRole": "image", "exportComponent": "media_panel" } }, { "id": "1:48", "name": "Disclaimer", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "disclaimer", "componentOverride": "disclaimer_text", "text": "We use your information in accordance with our Privacy Policy.", "bounds": { "x": -987, "y": 1040, "width": 320, "height": 13 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 10, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "disclaimer", "roleConfidence": 1, "metadata": { "exportRole": "disclaimer", "exportComponent": "disclaimer_text" } }, { "id": "1:49", "name": "No Thanks Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "secondary-cta", "componentOverride": "no_thanks_button", "bounds": { "x": -886, "y": 985, "width": 117, "height": 40 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 10, "right": 18, "bottom": 10, "left": 18 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:50", "name": "No Thanks Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "No Thanks", "bounds": { "x": -868, "y": 995, "width": 81, "height": 20 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 16, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "secondary-cta", "roleConfidence": 1, "metadata": { "exportRole": "secondary-cta", "exportComponent": "no_thanks_button" } }, { "id": "1:40", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -1090, "y": 815, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:41", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": -1066, "y": 829, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:42", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": -1150, "y": 578, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:272", "name": "Countdown Timer", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "countdown", "componentOverride": "countdown_timer", "bounds": { "x": -859, "y": 488, "width": 86, "height": 43 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 10, "right": 16, "bottom": 10, "left": 16 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:273", "name": "Timer Text", "type": "TEXT", "visible": true, "ignored": false, "text": "09:59", "bounds": { "x": -843, "y": 498, "width": 54, "height": 23 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 18, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "countdown", "roleConfidence": 1, "metadata": { "exportRole": "countdown", "exportComponent": "countdown_timer" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_tt-mobile-02_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_tt-mobile-02_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_tt-mobile-02_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "TT-Mobile-03", "folder": "upsellit-modal-templates-v2_tt-mobile-03_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "eyebrow": "TODAY ONLY", "closeButton": false, "products": [], "primaryCta": { "label": "Redeem Now" }, "disclaimer": "We use your information in accordance with our Privacy Policy." }, "ast": { "id": "1:59", "name": "TT-Mobile-03", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": -445, "y": 425, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:67", "name": "No Thanks Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "secondary-cta", "componentOverride": "no_thanks_button", "bounds": { "x": -184, "y": 985, "width": 117, "height": 40 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 10, "right": 18, "bottom": 10, "left": 18 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(16, 79, 142)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:68", "name": "No Thanks Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "No Thanks", "bounds": { "x": -166, "y": 995, "width": 81, "height": 20 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 16, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "secondary-cta", "roleConfidence": 1, "metadata": { "exportRole": "secondary-cta", "exportComponent": "no_thanks_button" } }, { "id": "1:62", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": -388, "y": 815, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:63", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": -364, "y": 829, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:64", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": -448, "y": 519, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:65", "name": "Eyebrow", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "eyebrow", "componentOverride": "eyebrow_block", "text": "TODAY ONLY", "bounds": { "x": -232, "y": 496, "width": 220, "height": 30 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 24, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "eyebrow", "roleConfidence": 1, "metadata": { "exportRole": "eyebrow", "exportComponent": "eyebrow_block" } }, { "id": "1:66", "name": "Disclaimer", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "disclaimer", "componentOverride": "disclaimer_text", "text": "We use your information in accordance with our Privacy Policy.", "bounds": { "x": -285, "y": 1040, "width": 320, "height": 13 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 10, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "disclaimer", "roleConfidence": 1, "metadata": { "exportRole": "disclaimer", "exportComponent": "disclaimer_text" } }, { "id": "1:70", "name": "Copy Coupon", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "copy-coupon", "componentOverride": "copy_coupon", "bounds": { "x": -231, "y": 682, "width": 213, "height": 44 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 12, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "CENTER", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:71", "name": "Coupon Code", "type": "FRAME", "visible": true, "ignored": false, "bounds": { "x": -231, "y": 682, "width": 89, "height": 44 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 12, "right": 16, "bottom": 12, "left": 16 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(189, 189, 189)", "borderColor": "rgb(31, 31, 31)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:72", "name": "Coupon Label", "type": "TEXT", "visible": true, "ignored": false, "text": "SAVE15", "bounds": { "x": -215, "y": 694, "width": 57, "height": 20 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 16, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "1:73", "name": "Copy Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "copy-coupon", "componentOverride": "copy_coupon", "bounds": { "x": -130, "y": 682, "width": 112, "height": 44 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 12, "right": 16, "bottom": 12, "left": 16 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(210, 6, 136)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:74", "name": "Copy Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Copy Code", "bounds": { "x": -114, "y": 694, "width": 80, "height": 20 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "HUG" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 16, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "copy-coupon", "roleConfidence": 1, "metadata": { "exportRole": "copy-coupon", "exportComponent": "copy_coupon" } }], "detectedRole": "copy-coupon", "roleConfidence": 1, "metadata": { "exportRole": "copy-coupon", "exportComponent": "copy_coupon" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_tt-mobile-03_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_tt-mobile-03_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_tt-mobile-03_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "TT-Mobile-04", "folder": "upsellit-modal-templates-v2_tt-mobile-04_26-04", "schema": { "pattern": "grid", "layout": "desktop", "headline": "15% Off", "closeButton": true, "products": [{ "title": "Product Name", "subtitle": "$XX.XX", "imageAlt": "Product Name", "imageAsset": "upsellit-modal-templates-v2_tt-mobile-04_26-04-product-1.webp" }, { "title": "Product Name", "subtitle": "$XX.XX", "imageAlt": "Product Name", "imageAsset": "upsellit-modal-templates-v2_tt-mobile-04_26-04-product-2.webp" }, { "title": "Product Name", "subtitle": "$XX.XX", "imageAlt": "Product Name", "imageAsset": "upsellit-modal-templates-v2_tt-mobile-04_26-04-product-3.webp" }], "primaryCta": { "label": "Redeem Now" }, "disclaimer": "We use your information in accordance with our Privacy Policy." }, "ast": { "id": "1:75", "name": "TT-Mobile-04", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": 257, "y": 425, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:78", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": 310, "y": 864, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:79", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": 334, "y": 878, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:80", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": 254, "y": 458, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 96, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:82", "name": "Disclaimer", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "disclaimer", "componentOverride": "disclaimer_text", "text": "We use your information in accordance with our Privacy Policy.", "bounds": { "x": 417, "y": 1040, "width": 320, "height": 13 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 10, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "disclaimer", "roleConfidence": 1, "metadata": { "exportRole": "disclaimer", "exportComponent": "disclaimer_text" } }, { "id": "1:91", "name": "Product Grid", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-list", "componentOverride": "product_grid", "collection": "products", "bounds": { "x": 318, "y": 640, "width": 512, "height": 177 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 16, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "HUG", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:92", "name": "Product Card", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-card", "componentOverride": "product_card", "bounds": { "x": 318, "y": 640, "width": 160, "height": 177 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 8, "padding": { "top": 12, "right": 12, "bottom": 12, "left": 12 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "12:1196", "name": "Product Image", "type": "RECTANGLE", "visible": true, "ignored": false, "roleOverride": "product-image", "componentOverride": "product_image", "bounds": { "x": 330, "y": 652, "width": 136, "height": 96 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 8, "opacity": 1 }, "children": [], "detectedRole": "product-image", "roleConfidence": 1, "metadata": { "exportRole": "product-image", "exportComponent": "product_image" } }, { "id": "1:94", "name": "Product Title", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-title", "componentOverride": "product_title", "text": "Product Name", "bounds": { "x": 330, "y": 756, "width": 136, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-title", "roleConfidence": 1, "metadata": { "exportRole": "product-title", "exportComponent": "product_title" } }, { "id": "1:95", "name": "Product Subtitle", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-subtitle", "componentOverride": "product_subtitle", "text": "$XX.XX", "bounds": { "x": 330, "y": 782, "width": 136, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-subtitle", "roleConfidence": 1, "metadata": { "exportRole": "product-subtitle", "exportComponent": "product_subtitle" } }], "detectedRole": "product-card", "roleConfidence": 1, "metadata": { "exportRole": "product-card", "exportComponent": "product_card" } }, { "id": "1:98", "name": "Product Card", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-card", "componentOverride": "product_card", "bounds": { "x": 494, "y": 640, "width": 160, "height": 177 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 8, "padding": { "top": 12, "right": 12, "bottom": 12, "left": 12 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "12:1198", "name": "Product Image", "type": "RECTANGLE", "visible": true, "ignored": false, "roleOverride": "product-image", "componentOverride": "product_image", "bounds": { "x": 506, "y": 652, "width": 136, "height": 96 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 8, "opacity": 1 }, "children": [], "detectedRole": "product-image", "roleConfidence": 1, "metadata": { "exportRole": "product-image", "exportComponent": "product_image" } }, { "id": "1:100", "name": "Product Title", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-title", "componentOverride": "product_title", "text": "Product Name", "bounds": { "x": 506, "y": 756, "width": 136, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-title", "roleConfidence": 1, "metadata": { "exportRole": "product-title", "exportComponent": "product_title" } }, { "id": "1:101", "name": "Product Subtitle", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-subtitle", "componentOverride": "product_subtitle", "text": "$XX.XX", "bounds": { "x": 506, "y": 782, "width": 136, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-subtitle", "roleConfidence": 1, "metadata": { "exportRole": "product-subtitle", "exportComponent": "product_subtitle" } }], "detectedRole": "product-card", "roleConfidence": 1, "metadata": { "exportRole": "product-card", "exportComponent": "product_card" } }, { "id": "1:104", "name": "Product Card", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "product-card", "componentOverride": "product_card", "bounds": { "x": 670, "y": 640, "width": 160, "height": 177 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 8, "padding": { "top": 12, "right": 12, "bottom": 12, "left": 12 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "12:1200", "name": "Product Image", "type": "RECTANGLE", "visible": true, "ignored": false, "roleOverride": "product-image", "componentOverride": "product_image", "bounds": { "x": 682, "y": 652, "width": 136, "height": 96 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 8, "opacity": 1 }, "children": [], "detectedRole": "product-image", "roleConfidence": 1, "metadata": { "exportRole": "product-image", "exportComponent": "product_image" } }, { "id": "1:106", "name": "Product Title", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-title", "componentOverride": "product_title", "text": "Product Name", "bounds": { "x": 682, "y": 756, "width": 136, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-title", "roleConfidence": 1, "metadata": { "exportRole": "product-title", "exportComponent": "product_title" } }, { "id": "1:107", "name": "Product Subtitle", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "product-subtitle", "componentOverride": "product_subtitle", "text": "$XX.XX", "bounds": { "x": 682, "y": 782, "width": 136, "height": 15 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(0, 0, 0)", "borderWidth": 1, "opacity": 1, "color": "rgb(0, 0, 0)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 12, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "product-subtitle", "roleConfidence": 1, "metadata": { "exportRole": "product-subtitle", "exportComponent": "product_subtitle" } }], "detectedRole": "product-card", "roleConfidence": 1, "metadata": { "exportRole": "product-card", "exportComponent": "product_card" } }], "detectedRole": "product-list", "roleConfidence": 1, "metadata": { "exportRole": "product-list", "exportComponent": "product_grid", "exportCollection": "products" } }, { "id": "7:16", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": 821, "y": 442, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:16;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": 821, "y": 438, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_tt-mobile-04_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_tt-mobile-04_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_tt-mobile-04_26-04_flattened_text_baked.webp", "productAssets": ["upsellit-modal-templates-v2_tt-mobile-04_26-04-product-1.webp", "upsellit-modal-templates-v2_tt-mobile-04_26-04-product-2.webp", "upsellit-modal-templates-v2_tt-mobile-04_26-04-product-3.webp"], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "TT-Mobile-05", "folder": "upsellit-modal-templates-v2_tt-mobile-05_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "Free Shipping", "eyebrow": "You are $10 away from", "closeButton": true, "products": [], "primaryCta": { "label": "Redeem Now" } }, "ast": { "id": "1:274", "name": "TT-Mobile-05", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": 937, "y": 425, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:275", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": 1002, "y": 879.5, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:276", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": 1026, "y": 893.5, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:277", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "Free Shipping", "bounds": { "x": 937, "y": 529, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 64, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:282", "name": "Progress Bar", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "progress", "componentOverride": "progress_bar", "bounds": { "x": 1002, "y": 725, "width": 503, "height": 42 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "borderRadius": 999, "opacity": 1 }, "children": [{ "id": "1:283", "name": "Progress Fill", "type": "RECTANGLE", "visible": true, "ignored": false, "bounds": { "x": 1002, "y": 725, "width": 180, "height": 42 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(210, 6, 136)", "borderWidth": 1, "borderRadius": 999, "opacity": 1 }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "progress", "roleConfidence": 1, "metadata": { "exportRole": "progress", "exportComponent": "progress_bar" } }, { "id": "3:2", "name": "Eyebrow", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "eyebrow", "componentOverride": "eyebrow_block", "text": "You are $10 away from", "bounds": { "x": 1147, "y": 480, "width": 220, "height": 25 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontSize": 20, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "eyebrow", "roleConfidence": 1, "metadata": { "exportRole": "eyebrow", "exportComponent": "eyebrow_block" } }, { "id": "7:19", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": 1501, "y": 442, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:19;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": 1501, "y": 438, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_tt-mobile-05_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_tt-mobile-05_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_tt-mobile-05_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }, { "frameName": "TT-Mobile-06", "folder": "upsellit-modal-templates-v2_tt-mobile-06_26-04", "schema": { "pattern": "single", "layout": "desktop", "headline": "15% Off", "closeButton": true, "products": [], "summary": { "rows": [{ "label": "subtotal", "value": "$XX.XX" }, { "label": "discount", "value": "-$XX.XX" }, { "label": "total", "value": "$XX.XX" }], "subtotal": "$XX.XX", "discount": "-$XX.XX", "total": "$XX.XX" }, "primaryCta": { "label": "Redeem Now" } }, "ast": { "id": "1:317", "name": "TT-Mobile-06", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "modal-root", "componentOverride": "modal_shell", "bounds": { "x": 1617, "y": 425, "width": 640, "height": 660 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(62, 62, 62)", "borderWidth": 1, "opacity": 1 }, "children": [{ "id": "1:318", "name": "Primary Button", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "cta", "componentOverride": "primary_button", "bounds": { "x": 1682, "y": 879.5, "width": 527, "height": 148 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 14, "right": 24, "bottom": 14, "left": 24 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(60, 139, 217)", "borderWidth": 1, "borderRadius": 36, "opacity": 1 }, "children": [{ "id": "1:319", "name": "Primary Button Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Redeem Now", "bounds": { "x": 1706, "y": 893.5, "width": 479, "height": 120 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(255, 255, 255)", "borderWidth": 1, "opacity": 1, "color": "rgb(255, 255, 255)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "cta", "roleConfidence": 1, "metadata": { "exportRole": "cta", "exportComponent": "primary_button" } }, { "id": "1:320", "name": "Headline", "type": "TEXT", "visible": true, "ignored": false, "roleOverride": "headline", "componentOverride": "headline_block", "text": "15% Off", "bounds": { "x": 1626, "y": 518, "width": 640, "height": 154 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 128, "fontWeight": 700, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "headline", "roleConfidence": 1, "metadata": { "exportRole": "headline", "exportComponent": "headline_block" } }, { "id": "1:335", "name": "Price Table", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "summary", "componentOverride": "price_table", "bounds": { "x": 1797, "y": 687, "width": 280, "height": 96 }, "layout": { "mode": "VERTICAL", "wrap": false, "gap": 8, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:336", "name": "Subtotal", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "summary-subtotal", "componentOverride": "price_subtotal", "bounds": { "x": 1797, "y": 687, "width": 280, "height": 24 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "SPACE_BETWEEN", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:337", "name": "Subtotal Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Subtotal:", "bounds": { "x": 1797, "y": 690, "width": 140, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "1:338", "name": "Subtotal Value", "type": "TEXT", "visible": true, "ignored": false, "text": "$XX.XX", "bounds": { "x": 1957, "y": 690, "width": 120, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "right", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "summary-subtotal", "roleConfidence": 1, "metadata": { "exportRole": "summary-subtotal", "exportComponent": "price_subtotal" } }, { "id": "1:339", "name": "Discount", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "summary-discount", "componentOverride": "price_discount", "bounds": { "x": 1797, "y": 719, "width": 280, "height": 24 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "SPACE_BETWEEN", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:340", "name": "Discount Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Discount:", "bounds": { "x": 1797, "y": 722, "width": 140, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "1:341", "name": "Discount Value", "type": "TEXT", "visible": true, "ignored": false, "text": "-$XX.XX", "bounds": { "x": 1957, "y": 722, "width": 120, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "right", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "summary-discount", "roleConfidence": 1, "metadata": { "exportRole": "summary-discount", "exportComponent": "price_discount" } }, { "id": "1:342", "name": "Total", "type": "FRAME", "visible": true, "ignored": false, "roleOverride": "summary-total", "componentOverride": "price_total", "bounds": { "x": 1797, "y": 751, "width": 280, "height": 24 }, "layout": { "mode": "HORIZONTAL", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "SPACE_BETWEEN", "counterAlign": "CENTER", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderWidth": 1, "borderRadius": 0, "opacity": 1 }, "children": [{ "id": "1:343", "name": "Total Label", "type": "TEXT", "visible": true, "ignored": false, "text": "Total:", "bounds": { "x": 1797, "y": 754, "width": 140, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "left", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }, { "id": "1:344", "name": "Total Value", "type": "TEXT", "visible": true, "ignored": false, "text": "$XX.XX", "bounds": { "x": 1957, "y": 754, "width": 120, "height": 18 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "HUG" }, "style": { "background": "rgb(234, 234, 234)", "borderWidth": 1, "opacity": 1, "color": "rgb(234, 234, 234)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 14, "fontWeight": 400, "textAlign": "right", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "summary-total", "roleConfidence": 1, "metadata": { "exportRole": "summary-total", "exportComponent": "price_total" } }], "detectedRole": "summary", "roleConfidence": 1, "metadata": { "exportRole": "summary", "exportComponent": "price_table" } }, { "id": "7:22", "name": "Close Button", "type": "INSTANCE", "visible": true, "ignored": false, "roleOverride": "close-button", "componentOverride": "close_control", "bounds": { "x": 2181, "y": 442, "width": 60, "height": 60 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "borderColor": "rgb(189, 189, 189)", "borderWidth": 2, "borderRadius": 1000, "opacity": 1 }, "children": [{ "id": "I7:22;1:306", "name": "Close Label", "type": "TEXT", "visible": true, "ignored": false, "text": "×", "bounds": { "x": 2181, "y": 438, "width": 60, "height": 67 }, "layout": { "mode": "NONE", "wrap": false, "gap": 0, "padding": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "primaryAlign": "MIN", "counterAlign": "MIN", "widthMode": "FIXED", "heightMode": "FIXED" }, "style": { "background": "rgb(189, 189, 189)", "borderWidth": 1, "opacity": 1, "color": "rgb(189, 189, 189)", "fontFamily": "Merriweather Sans", "fontStyle": "normal", "fontSize": 48, "fontWeight": 400, "textAlign": "center", "textCase": "original" }, "children": [], "detectedRole": "other", "roleConfidence": 0, "metadata": {} }], "detectedRole": "close-button", "roleConfidence": 1, "metadata": { "exportRole": "close-button", "exportComponent": "close_control" } }], "detectedRole": "modal-root", "roleConfidence": 1, "metadata": { "exportRole": "modal-root", "exportComponent": "modal_shell" } }, "assets": { "mockup": "upsellit-modal-templates-v2_tt-mobile-06_26-04_mockup_1x.webp", "flattenedLive": "upsellit-modal-templates-v2_tt-mobile-06_26-04_flattened_live_text.webp", "flattenedTextBaked": "upsellit-modal-templates-v2_tt-mobile-06_26-04_flattened_text_baked.webp", "productAssets": [], "previewPages": ["index.html", "semantic.html", "flattened_live_text.html", "flattened_text_baked.html", "fallback-raw.html", "devmode.html"], "cssFiles": ["css/styles.css", "css/semantic.css", "css/flattened_live_text.css", "css/flattened_text_baked.css", "css/fallback.css"], "jsFiles": ["js/usi_js.js", "js/flattened_live_text.js", "js/flattened_text_baked.js"] } }] };
},
"figma/export": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPluginMeta = exports.getPluginMeta = exports.getNodeChildren = void 0;
exports.getYearMonth = getYearMonth;
exports.buildExportBaseName = buildExportBaseName;
exports.paintToCss = paintToCss;
exports.firstVisiblePaint = firstVisiblePaint;
exports.getBounds = getBounds;
exports.getPaddingValue = getPaddingValue;
exports.getSizingMode = getSizingMode;
exports.extractTextStyle = extractTextStyle;
exports.extractNodeStyle = extractNodeStyle;
exports.extractNodeText = extractNodeText;
exports.hasImageFill = hasImageFill;
exports.walkScenePaths = walkScenePaths;
exports.buildPathMaps = buildPathMaps;
exports.exportNodeImage = exportNodeImage;
exports.exportMockupPng = exportMockupPng;
exports.buildNodeIndex = buildNodeIndex;
exports.getExportPageNodes = getExportPageNodes;
exports.attachProductAssets = attachProductAssets;
exports.exportFlattenedBackgroundVariant = exportFlattenedBackgroundVariant;
exports.validateSelection = validateSelection;
exports.getExportRoots = getExportRoots;
exports.buildExportPackageName = buildExportPackageName;
const string_1 = require("../utils/string");
const shared_1 = require("./shared");
Object.defineProperty(exports, "getNodeChildren", { enumerable: true, get: function () { return shared_1.getNodeChildren; } });
Object.defineProperty(exports, "getPluginMeta", { enumerable: true, get: function () { return shared_1.getPluginMeta; } });
Object.defineProperty(exports, "setPluginMeta", { enumerable: true, get: function () { return shared_1.setPluginMeta; } });
function getYearMonth() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return yy + '-' + mm;
}
function buildExportBaseName(frame) {
    const fileName = (0, string_1.sanitizeFilePart)(figma.root && figma.root.name ? figma.root.name : 'figma-file');
    const frameName = (0, string_1.sanitizeFilePart)(frame && frame.name ? frame.name : 'selection');
    return fileName + '_' + frameName + '_' + getYearMonth();
}
function paintToCss(paint) {
    if (!paint || paint.visible === false)
        return undefined;
    if (paint.type !== 'SOLID')
        return undefined;
    const alpha = paint.opacity == null ? 1 : paint.opacity;
    const color = paint.color || { r: 0, g: 0, b: 0 };
    const r = Math.round((color.r || 0) * 255);
    const g = Math.round((color.g || 0) * 255);
    const b = Math.round((color.b || 0) * 255);
    if (alpha >= 0.999)
        return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}
function firstVisiblePaint(paints) {
    if (!Array.isArray(paints))
        return null;
    return paints.find(function (paint) {
        return paint && paint.visible !== false;
    });
}
function getBounds(node) {
    const box = node && node.absoluteBoundingBox ? node.absoluteBoundingBox : null;
    return {
        x: box && typeof box.x === 'number' ? box.x : node && typeof node.x === 'number' ? node.x : 0,
        y: box && typeof box.y === 'number' ? box.y : node && typeof node.y === 'number' ? node.y : 0,
        width: box && typeof box.width === 'number'
            ? box.width
            : node && typeof node.width === 'number'
                ? node.width
                : 0,
        height: box && typeof box.height === 'number'
            ? box.height
            : node && typeof node.height === 'number'
                ? node.height
                : 0,
    };
}
function getPaddingValue(node, key) {
    const value = node ? node[key] : undefined;
    return typeof value === 'number' ? value : 0;
}
function getSizingMode(node, axis) {
    const modeKey = axis === 'horizontal' ? 'layoutSizingHorizontal' : 'layoutSizingVertical';
    const legacyKey = axis === 'horizontal' ? 'primaryAxisSizingMode' : 'counterAxisSizingMode';
    const mode = node ? node[modeKey] || node[legacyKey] : undefined;
    if (mode === 'HUG' || mode === 'AUTO')
        return 'HUG';
    if (mode === 'FILL')
        return 'FILL';
    if (mode === 'FIXED')
        return 'FIXED';
    return 'AUTO';
}
function extractTextStyle(node) {
    if (node.type !== 'TEXT')
        return {};
    let fontWeight;
    const fontName = node.fontName;
    if (fontName && fontName !== figma.mixed && typeof fontName === 'object') {
        const styleName = String(fontName.style || '').toLowerCase();
        if (/black|heavy|extrabold/.test(styleName))
            fontWeight = 800;
        else if (/bold|semibold|demibold/.test(styleName))
            fontWeight = 700;
        else if (/medium/.test(styleName))
            fontWeight = 500;
        else
            fontWeight = 400;
    }
    const fills = node.fills;
    const paint = fills !== figma.mixed ? firstVisiblePaint(fills) : null;
    const color = paintToCss(paint);
    const lineHeightValue = node.lineHeight && node.lineHeight !== figma.mixed
        ? node.lineHeight.unit === 'PIXELS'
            ? node.lineHeight.value
            : undefined
        : undefined;
    const letterSpacingValue = node.letterSpacing && node.letterSpacing !== figma.mixed
        ? node.letterSpacing.unit === 'PIXELS'
            ? node.letterSpacing.value
            : undefined
        : undefined;
    return {
        color: color,
        fontFamily: fontName && fontName !== figma.mixed && typeof fontName === 'object'
            ? String(fontName.family || '')
            : undefined,
        fontStyle: fontName && fontName !== figma.mixed && typeof fontName === 'object'
            ? /italic/i.test(String(fontName.style || ''))
                ? 'italic'
                : 'normal'
            : undefined,
        fontSize: typeof node.fontSize === 'number' ? node.fontSize : undefined,
        fontWeight: fontWeight,
        lineHeight: lineHeightValue,
        textAlign: node.textAlignHorizontal ? String(node.textAlignHorizontal).toLowerCase() : undefined,
        letterSpacing: letterSpacingValue,
        textCase: node.textCase ? String(node.textCase).toLowerCase() : undefined,
    };
}
function extractNodeStyle(node) {
    const fills = node.fills !== figma.mixed ? node.fills : undefined;
    const strokes = node.strokes !== figma.mixed ? node.strokes : undefined;
    const fill = firstVisiblePaint(fills);
    const stroke = firstVisiblePaint(strokes);
    return Object.assign({
        background: paintToCss(fill),
        borderColor: paintToCss(stroke),
        borderWidth: typeof node.strokeWeight === 'number' ? node.strokeWeight : undefined,
        borderRadius: typeof node.cornerRadius === 'number' && !Number.isNaN(node.cornerRadius)
            ? node.cornerRadius
            : undefined,
        opacity: typeof node.opacity === 'number' ? node.opacity : undefined,
    }, extractTextStyle(node));
}
function extractNodeText(node) {
    if (node.type === 'TEXT') {
        return String(node.characters || '').trim() || undefined;
    }
    return undefined;
}
function hasImageFill(node) {
    if (!node || !Array.isArray(node.fills) || node.fills === figma.mixed)
        return false;
    return node.fills.some(function (fill) {
        return fill && fill.visible !== false && fill.type === 'IMAGE';
    });
}
function walkScenePaths(root, visitor) {
    (function walk(node, path) {
        visitor(node, path);
        const children = (0, shared_1.getNodeChildren)(node);
        for (let index = 0; index < children.length; index += 1) {
            walk(children[index], path ? path + '/' + index : String(index));
        }
    })(root, '');
}
function buildPathMaps(root) {
    const idToPath = new Map();
    const pathToNode = new Map();
    walkScenePaths(root, function (node, path) {
        idToPath.set(String(node.id), path);
        pathToNode.set(path, node);
    });
    return {
        idToPath: idToPath,
        pathToNode: pathToNode,
    };
}
async function exportNodeImage(node, fileName, scale) {
    if (!node || typeof node.exportAsync !== 'function')
        return null;
    const bytes = new Uint8Array(await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: typeof scale === 'number' && scale > 0 ? scale : 2 },
    }));
    return {
        name: fileName,
        base64: figma.base64Encode(bytes),
        mime: 'image/png',
    };
}
async function exportMockupPng(rootNode, fileName) {
    return exportNodeImage(rootNode, fileName, 1);
}
function buildNodeIndex(root) {
    const index = new Map();
    (function walk(node) {
        index.set(String(node.id), node);
        for (const child of (0, shared_1.getNodeChildren)(node))
            walk(child);
    })(root);
    return index;
}
function getExportPageNodes(rootNode) {
    const children = (0, shared_1.getNodeChildren)(rootNode);
    const pages = [];
    const wanted = ['p1', 'p2', 'p3'];
    for (let index = 0; index < wanted.length; index += 1) {
        const key = wanted[index];
        const match = children.find(function (child) {
            return String(child && child.name ? child.name : '').trim().toLowerCase() === key;
        });
        if (match)
            pages.push({ key: key, node: match });
    }
    if (!pages.length) {
        pages.push({ key: 'p1', node: rootNode });
    }
    return pages;
}
async function attachProductAssets(products, nodeIndex, exportBaseName) {
    const assets = [];
    const seen = new Set();
    for (let index = 0; index < products.length; index += 1) {
        const product = products[index];
        if (!product._imageNodeId || seen.has(product._imageNodeId))
            continue;
        const sourceNode = nodeIndex.get(product._imageNodeId);
        if (!sourceNode || !hasImageFill(sourceNode))
            continue;
        const assetName = exportBaseName + '-product-' + (index + 1) + '.png';
        const asset = await exportNodeImage(sourceNode, assetName);
        if (!asset)
            continue;
        product.imageAsset = assetName;
        assets.push(asset);
        seen.add(product._imageNodeId);
    }
    for (const product of products) {
        if (!product.imageAsset && product._imageNodeId && seen.has(product._imageNodeId)) {
            const firstIndex = products.findIndex(function (candidate) {
                return candidate._imageNodeId === product._imageNodeId && !!candidate.imageAsset;
            });
            if (firstIndex >= 0) {
                product.imageAsset = products[firstIndex].imageAsset;
            }
        }
        delete product._imageNodeId;
    }
    return assets;
}
async function exportFlattenedBackgroundVariant(rootNode, dynamicNodeIds, alwaysHiddenNodeIds, removeAllText, fileName, uniqueIds) {
    if (!rootNode || typeof rootNode.clone !== 'function')
        return null;
    const clone = rootNode.clone();
    const pathMaps = buildPathMaps(rootNode);
    const hidePaths = uniqueIds(dynamicNodeIds.concat(alwaysHiddenNodeIds))
        .map(function (id) {
        return pathMaps.idToPath.get(id) || '';
    })
        .filter(Boolean);
    try {
        const cloneMaps = buildPathMaps(clone);
        for (const path of hidePaths) {
            const node = cloneMaps.pathToNode.get(path);
            if (node)
                node.visible = false;
        }
        if (removeAllText) {
            walkScenePaths(clone, function (node) {
                if (node.type === 'TEXT')
                    node.visible = false;
            });
        }
        return await exportNodeImage(clone, fileName);
    }
    finally {
        clone.remove();
    }
}
function validateSelection(selection) {
    if (!selection.length)
        return null;
    const root = selection[0];
    if (!root)
        return null;
    if (root.type !== 'FRAME' &&
        root.type !== 'GROUP' &&
        root.type !== 'COMPONENT' &&
        root.type !== 'INSTANCE') {
        return null;
    }
    return root;
}
function collectExportFrames(node) {
    if (!node)
        return [];
    if (node.type === 'FRAME')
        return [node];
    if (node.type !== 'GROUP' &&
        node.type !== 'COMPONENT' &&
        node.type !== 'INSTANCE' &&
        node.type !== 'SECTION') {
        return [];
    }
    const frames = [];
    const children = (0, shared_1.getNodeChildren)(node);
    for (let index = 0; index < children.length; index += 1) {
        frames.push(...collectExportFrames(children[index]));
    }
    return frames;
}
function getExportRoots(selection, page) {
    const selectedRoots = Array.from(selection || []).filter(function (node) {
        return (node &&
            (node.type === 'FRAME' ||
                node.type === 'GROUP' ||
                node.type === 'COMPONENT' ||
                node.type === 'INSTANCE' ||
                node.type === 'SECTION'));
    });
    if (selectedRoots.length) {
        const seen = new Set();
        const frames = [];
        for (let index = 0; index < selectedRoots.length; index += 1) {
            const nextFrames = collectExportFrames(selectedRoots[index]);
            for (let frameIndex = 0; frameIndex < nextFrames.length; frameIndex += 1) {
                const frame = nextFrames[frameIndex];
                const id = String(frame.id || '');
                if (!id || seen.has(id))
                    continue;
                seen.add(id);
                frames.push(frame);
            }
        }
        return frames;
    }
    const pageChildren = page && Array.isArray(page.children) ? page.children : [];
    const seen = new Set();
    const frames = [];
    for (let index = 0; index < pageChildren.length; index += 1) {
        const nextFrames = collectExportFrames(pageChildren[index]);
        for (let frameIndex = 0; frameIndex < nextFrames.length; frameIndex += 1) {
            const frame = nextFrames[frameIndex];
            const id = String(frame.id || '');
            if (!id || seen.has(id))
                continue;
            seen.add(id);
            frames.push(frame);
        }
    }
    return frames;
}
function buildExportPackageName(nodes) {
    const fileName = (0, string_1.sanitizeFilePart)(figma.root && figma.root.name ? figma.root.name : 'figma-file');
    if (!nodes.length)
        return fileName + '_' + getYearMonth() + '.zip';
    if (nodes.length === 1)
        return buildExportBaseName(nodes[0]) + '.zip';
    const pageName = (0, string_1.sanitizeFilePart)(figma.currentPage && figma.currentPage.name ? figma.currentPage.name : 'page');
    return fileName + '_' + pageName + '_' + getYearMonth() + '.zip';
}
},
"utils/string": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeFilePart = sanitizeFilePart;
exports.escapeHtml = escapeHtml;
exports.escapeTemplateString = escapeTemplateString;
exports.formatJson = formatJson;
exports.formatHtml = formatHtml;
exports.formatCss = formatCss;
exports.formatJs = formatJs;
exports.minifyHtml = minifyHtml;
exports.formatFileText = formatFileText;
function sanitizeFilePart(text) {
    return (String(text || 'untitled')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled');
}
function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escapeTemplateString(text) {
    return String(text || '')
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
}
function formatJson(value) {
    return JSON.stringify(value, null, 2) + '\n';
}
function formatHtml(source) {
    const tokens = String(source || '')
        .replace(/>\s*</g, '>\n<')
        .split('\n')
        .map(function (line) {
        return line.trim();
    })
        .filter(Boolean);
    const voidTags = {
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
    const out = [];
    let depth = 0;
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        const isClosing = /^<\//.test(token);
        const tagMatch = token.match(/^<\/?([a-zA-Z0-9_-]+)/);
        const tagName = tagMatch ? String(tagMatch[1]).toLowerCase() : '';
        const isInlinePair = /^<[^>]+>.*<\/[^>]+>$/.test(token);
        const isVoid = !!voidTags[tagName] || /\/>$/.test(token);
        const isOpening = /^<[^/!][^>]*>$/.test(token) && !isVoid && !isInlinePair;
        if (isClosing)
            depth = Math.max(0, depth - 1);
        out.push(new Array(depth + 1).join('\t') + token);
        if (!isClosing && isOpening)
            depth += 1;
    }
    return out.join('\n') + '\n';
}
function formatCss(source) {
    const input = String(source || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\{\s*/g, ' {\n')
        .replace(/;\s*/g, ';\n')
        .replace(/\}\s*/g, '\n}\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
    const lines = input.split('\n');
    const out = [];
    let depth = 0;
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].trim();
        if (!line)
            continue;
        if (line.indexOf('}') === 0)
            depth = Math.max(0, depth - 1);
        out.push(new Array(depth + 1).join('\t') + line);
        if (line.lastIndexOf('{') === line.length - 1)
            depth += 1;
    }
    return out.join('\n') + '\n';
}
function formatJs(source) {
    const lines = String(source || '')
        .replace(/\r\n/g, '\n')
        .split('\n');
    const out = [];
    let depth = 0;
    let templateDepth = 0;
    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index].replace(/\s+$/g, '');
        const trimmed = rawLine.trim();
        if (!trimmed) {
            if (out.length && out[out.length - 1] !== '')
                out.push('');
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
function minifyHtml(source) {
    return String(source || '')
        .replace(/\n+/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
function formatFileText(name, text) {
    if (/\.html$/i.test(name))
        return formatHtml(text);
    if (/\.css$/i.test(name))
        return formatCss(text);
    if (/\.json$/i.test(name))
        return formatJson(JSON.parse(text));
    if (/\.js$/i.test(name))
        return formatJs(text);
    return text;
}
},
"packaging/index": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSemanticExport = buildSemanticExport;
const constants_1 = require("../constants");
const index_1 = require("../analysis/index");
const index_2 = require("../figma/index");
const index_3 = require("../render/index");
const string_1 = require("../utils/string");
function formatCompactJson(value) {
    return JSON.stringify(value);
}
function buildLibraryManifestEntry(entry) {
    return {
        frameName: entry.frameName,
        folder: entry.folder,
        schema: entry.schema,
        ast: entry.ast,
        assets: entry.assets,
    };
}
function collectFlattenedHiddenAssetNodeIds(root, hideVisibleText) {
    return (0, index_1.flattenTree)(root)
        .filter(function (node) {
        const definition = node.componentOverride && constants_1.COMPONENT_BY_ID[node.componentOverride]
            ? constants_1.COMPONENT_BY_ID[node.componentOverride]
            : constants_1.COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || 'other'];
        if (!definition)
            return false;
        return hideVisibleText ? definition.render.flattened.textBaked === false : definition.render.flattened.liveText === false;
    })
        .map(function (node) {
        return node.id;
    });
}
async function buildExportFilesForNode(rootNode, filePrefix) {
    const exportBaseName = (0, index_2.buildExportBaseName)(rootNode);
    const mockupRootFolder = 'mockups';
    const liveTextRootFolder = 'live_text_images';
    const textBakedRootFolder = 'text_baked_images';
    const nodeIndex = (0, index_2.buildNodeIndex)(rootNode);
    const analysis = (0, index_1.analyzeSelection)(rootNode);
    const sourceFrameName = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
    const pageNodes = (0, index_2.getExportPageNodes)(rootNode);
    const assetTheme = await (0, index_2.getAssetThemeSnapshot)();
    const mockupAsset = await (0, index_2.exportMockupPng)(rootNode, exportBaseName + '_mockup_1x.png');
    const assets = await (0, index_2.attachProductAssets)(analysis.schema.products, nodeIndex, exportBaseName);
    const semantic = (0, index_3.renderSemanticHtml)(analysis.schema, analysis.ast);
    const flattenedTextAssetName = exportBaseName + '.png';
    const flattenedLiveAssetName = exportBaseName + '.png';
    const flattenedTextAsset = await (0, index_2.exportFlattenedBackgroundVariant)(rootNode, (0, index_1.uniqueIds)(analysis.dynamicNodeIds.concat(collectFlattenedHiddenAssetNodeIds(analysis.ast, true))), analysis.disclaimerNodeId ? [analysis.disclaimerNodeId] : [], false, flattenedTextAssetName, index_1.uniqueIds);
    const flattenedLiveAlwaysHidden = [];
    if (analysis.disclaimerNodeId)
        flattenedLiveAlwaysHidden.push(analysis.disclaimerNodeId);
    if (analysis.summaryNodeId)
        flattenedLiveAlwaysHidden.push(analysis.summaryNodeId);
    const flattenedLiveAsset = await (0, index_2.exportFlattenedBackgroundVariant)(rootNode, (0, index_1.uniqueIds)(analysis.dynamicNodeIds.concat(collectFlattenedHiddenAssetNodeIds(analysis.ast, false))), flattenedLiveAlwaysHidden, true, flattenedLiveAssetName, index_1.uniqueIds);
    const flattenedTextVariant = (0, index_3.renderFlattenedHtml)(analysis.ast, analysis, '../' + textBakedRootFolder + '/' + flattenedTextAssetName, true);
    const flattenedLiveVariant = (0, index_3.renderFlattenedHtml)(analysis.ast, analysis, '../' + liveTextRootFolder + '/' + flattenedLiveAssetName, false);
    const pageVariants = [];
    for (let index = 0; index < pageNodes.length; index += 1) {
        const pageAnalysis = (0, index_1.analyzeSelection)(pageNodes[index].node);
        const pageVariant = (0, index_3.renderFlattenedHtml)(pageAnalysis.ast, pageAnalysis, '', false);
        pageVariants.push({
            key: pageNodes[index].key,
            variant: pageVariant,
            analysis: pageAnalysis,
        });
    }
    const usiJsFile = (0, index_3.buildUsiJsFile)(pageVariants);
    const images = [];
    if (mockupAsset)
        images.push({ name: mockupAsset.name, href: '../' + mockupRootFolder + '/' + mockupAsset.name });
    if (flattenedLiveAsset)
        images.push({ name: flattenedLiveAsset.name, href: '../' + liveTextRootFolder + '/' + flattenedLiveAsset.name });
    if (flattenedTextAsset)
        images.push({ name: flattenedTextAsset.name, href: '../' + textBakedRootFolder + '/' + flattenedTextAsset.name });
    for (let index = 0; index < assets.length; index += 1) {
        images.push({ name: assets[index].name, href: assets[index].name });
    }
    const previewTitle = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
    const formattedDevCss = (0, string_1.formatFileText)('devmode.css', (0, index_3.extractCampaignCss)(flattenedTextVariant.css));
    const formattedDevJs = (0, string_1.formatFileText)('devmode.js', flattenedTextVariant.js);
    const previewHtml = (0, index_3.renderPreviewIndex)(previewTitle, images, {
        bakedImageHref: '../' + textBakedRootFolder + '/' + flattenedTextAssetName,
        cssSource: formattedDevCss,
        jsSource: formattedDevJs,
    });
    const prefixed = function (name) {
        return filePrefix ? filePrefix + '/' + name : name;
    };
    const prefixedBinary = function (file) {
        if ('text' in file)
            return file;
        return {
            name: prefixed(file.name),
            base64: file.base64,
            mime: file.mime,
        };
    };
    const rootBinary = function (folderName, file) {
        if ('text' in file)
            return file;
        return {
            name: folderName + '/' + file.name,
            base64: file.base64,
            mime: file.mime,
        };
    };
    const files = [
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
    const formattedFiles = files.map(function (file) {
        if (!('text' in file))
            return file;
        return {
            name: file.name,
            text: (0, string_1.formatFileText)(file.name, file.text),
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
async function buildSemanticExport(rootNodes) {
    const nodes = Array.isArray(rootNodes) ? rootNodes.filter(Boolean) : rootNodes ? [rootNodes] : [];
    if (!nodes.length) {
        throw new Error('No exportable frames found on the current page.');
    }
    if (nodes.length === 1) {
        const exportBaseName = (0, index_2.buildExportBaseName)(nodes[0]);
        const single = await buildExportFilesForNode(nodes[0], exportBaseName);
        return {
            packageFileName: (0, index_2.buildExportPackageName)(nodes),
            files: [
                {
                    name: 'index.html',
                    text: (0, string_1.formatFileText)('index.html', (0, index_3.renderMultiExportIndex)([
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
                    ])),
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
    const allFiles = [];
    const exportEntries = [];
    const mockupEntries = [];
    const importEntries = [];
    let sharedAssetTheme = [];
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const exportBaseName = (0, index_2.buildExportBaseName)(node);
        const result = await buildExportFilesForNode(node, exportBaseName);
        allFiles.push(...result.files);
        importEntries.push(result.importManifest);
        if (!sharedAssetTheme.length)
            sharedAssetTheme = result.importManifest.assetTheme;
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
        text: (0, string_1.formatFileText)('index.html', (0, index_3.renderMultiExportIndex)(exportEntries)),
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
            text: (0, string_1.formatFileText)('mockup_review.html', (0, index_3.renderMockupReviewIndex)(mockupEntries)),
        });
    }
    return {
        packageFileName: (0, index_2.buildExportPackageName)(nodes),
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
                    folder: (0, index_2.buildExportBaseName)(node),
                };
            }),
        },
    };
}
},
"analysis/index": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRole = normalizeRole;
exports.normalizeComponent = normalizeComponent;
exports.normalizeNode = normalizeNode;
exports.flattenTree = flattenTree;
exports.collectText = collectText;
exports.sortByPosition = sortByPosition;
exports.pickBestNode = pickBestNode;
exports.findNodesByRole = findNodesByRole;
exports.findNormalizedNodeById = findNormalizedNodeById;
exports.findImageNodeId = findImageNodeId;
exports.uniqueIds = uniqueIds;
exports.analyzeSelection = analyzeSelection;
const constants_1 = require("../constants");
const constants_2 = require("../constants");
const index_1 = require("../figma/index");
function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized)
        return undefined;
    const roleMap = {
        'modal-root': 'modal-root',
        content: 'content',
        headline: 'headline',
        subtext: 'subtext',
        eyebrow: 'eyebrow',
        divider: 'divider',
        cta: 'cta',
        'secondary-cta': 'secondary-cta',
        'product-card': 'product-card',
        'product-list': 'product-list',
        'product-image': 'product-image',
        'product-title': 'product-title',
        'product-subtitle': 'product-subtitle',
        'product-price': 'product-price',
        'product-cta': 'product-cta',
        summary: 'summary',
        'summary-subtotal': 'summary-subtotal',
        'summary-discount': 'summary-discount',
        'summary-total': 'summary-total',
        'email-input': 'email-input',
        'phone-input': 'phone-input',
        survey: 'survey',
        'copy-coupon': 'copy-coupon',
        optin: 'optin',
        countdown: 'countdown',
        progress: 'progress',
        disclaimer: 'disclaimer',
        'close-button': 'close-button',
        image: 'image',
        background: 'background',
        ignore: 'ignore',
        other: 'other',
    };
    return roleMap[normalized];
}
function normalizeComponent(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
    return normalized ? normalized : undefined;
}
function normalizeNode(node) {
    const meta = (0, index_1.getPluginMeta)(node);
    const ignored = /^(1|true|yes)$/i.test(meta.exportIgnore || '');
    const componentOverride = normalizeComponent(meta.exportComponent);
    const roleOverride = normalizeRole(meta.exportRole) || (componentOverride ? constants_2.COMPONENT_ROLE_MAP[componentOverride] : undefined);
    const children = (0, index_1.getNodeChildren)(node)
        .filter(function (child) {
        return child && child.visible !== false;
    })
        .map(function (child) {
        return normalizeNode(child);
    });
    return {
        id: String(node.id),
        name: String(node.name || ''),
        type: String(node.type || 'UNKNOWN'),
        visible: node && node.visible !== false,
        ignored: ignored || roleOverride === 'ignore',
        roleOverride: roleOverride,
        componentOverride: componentOverride,
        collection: meta.exportCollection || undefined,
        text: (0, index_1.extractNodeText)(node),
        bounds: (0, index_1.getBounds)(node),
        layout: {
            mode: node.layoutMode || 'NONE',
            wrap: !!node.layoutWrap && node.layoutWrap !== 'NO_WRAP',
            gap: typeof node.itemSpacing === 'number' ? node.itemSpacing : 0,
            padding: {
                top: (0, index_1.getPaddingValue)(node, 'paddingTop'),
                right: (0, index_1.getPaddingValue)(node, 'paddingRight'),
                bottom: (0, index_1.getPaddingValue)(node, 'paddingBottom'),
                left: (0, index_1.getPaddingValue)(node, 'paddingLeft'),
            },
            primaryAlign: String(node.primaryAxisAlignItems || 'MIN'),
            counterAlign: String(node.counterAxisAlignItems || 'MIN'),
            widthMode: (0, index_1.getSizingMode)(node, 'horizontal'),
            heightMode: (0, index_1.getSizingMode)(node, 'vertical'),
        },
        style: (0, index_1.extractNodeStyle)(node),
        children: children,
        detectedRole: roleOverride || 'other',
        roleConfidence: roleOverride ? 1 : 0,
        metadata: meta,
    };
}
function flattenTree(root) {
    const out = [];
    (function walk(node) {
        out.push(node);
        for (let index = 0; index < node.children.length; index += 1) {
            walk(node.children[index]);
        }
    })(root);
    return out;
}
function collectText(node) {
    const parts = [];
    if (node.text)
        parts.push(node.text);
    for (let index = 0; index < node.children.length; index += 1) {
        const childText = collectText(node.children[index]);
        if (childText)
            parts.push(childText);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
}
function sortByPosition(nodes) {
    return nodes.slice().sort(function (a, b) {
        if (Math.abs(a.bounds.y - b.bounds.y) > 2)
            return a.bounds.y - b.bounds.y;
        if (Math.abs(a.bounds.x - b.bounds.x) > 2)
            return a.bounds.x - b.bounds.x;
        return a.name.localeCompare(b.name);
    });
}
function pickBestNode(nodes) {
    return nodes[0];
}
function findNodesByRole(root, role, minimumConfidence = 0) {
    return sortByPosition(flattenTree(root).filter(function (node) {
        return !node.ignored && node.detectedRole === role && (node.roleConfidence || 0) >= minimumConfidence;
    }));
}
function findNormalizedNodeById(root, id) {
    if (!id)
        return undefined;
    return flattenTree(root).find(function (node) {
        return node.id === id;
    });
}
function firstNodeText(root, role) {
    const node = findNodesByRole(root, role, 0)[0];
    return node ? collectText(node) || node.text : undefined;
}
function findProductListContainer(root) {
    const explicitCollection = flattenTree(root).find(function (node) {
        return !node.ignored && String(node.collection || '').toLowerCase() === 'products';
    });
    if (explicitCollection)
        return explicitCollection;
    return findNodesByRole(root, 'product-list', 0)[0];
}
function findProductCards(root, container) {
    if (container) {
        return sortByPosition(flattenTree(container).filter(function (node) {
            return !node.ignored && node.detectedRole === 'product-card';
        }));
    }
    return findNodesByRole(root, 'product-card', 0);
}
function findImageNodeId(card) {
    const imageNode = flattenTree(card).find(function (node) {
        return node.detectedRole === 'product-image' || node.detectedRole === 'image';
    });
    return imageNode ? imageNode.id : undefined;
}
function uniqueIds(ids) {
    return Array.from(new Set(ids.filter(Boolean)));
}
function collectDynamicNodeIds(root) {
    return uniqueIds(flattenTree(root)
        .filter(function (node) {
        return [
            'product-card',
            'product-list',
            'product-image',
            'product-title',
            'product-subtitle',
            'product-price',
            'product-cta',
            'summary',
            'summary-subtotal',
            'summary-discount',
            'summary-total',
            'email-input',
            'phone-input',
            'copy-coupon',
            'countdown',
            'progress',
        ].includes(node.detectedRole || 'other');
    })
        .map(function (node) {
        return node.id;
    }));
}
function parseSummaryText(node) {
    const rows = [];
    const rowNodes = sortByPosition(flattenTree(node).filter(function (child) {
        return (child.detectedRole === 'summary-subtotal' ||
            child.detectedRole === 'summary-discount' ||
            child.detectedRole === 'summary-total');
    }));
    for (let index = 0; index < rowNodes.length; index += 1) {
        const rowNode = rowNodes[index];
        const role = rowNode.detectedRole;
        const text = collectText(rowNode);
        const valueMatch = text.match(/-?\$[\d,.Xx]+/);
        if (role === 'summary-subtotal')
            rows.push({ label: 'subtotal', value: valueMatch ? valueMatch[0] : text });
        if (role === 'summary-discount')
            rows.push({ label: 'discount', value: valueMatch ? valueMatch[0] : text });
        if (role === 'summary-total')
            rows.push({ label: 'total', value: valueMatch ? valueMatch[0] : text });
    }
    if (!rows.length) {
        const text = collectText(node);
        if (/subtotal/i.test(text))
            rows.push({ label: 'subtotal', value: (text.match(/subtotal[^$-]*(-?\$[\d,.Xx]+)/i) || [])[1] });
        if (/discount/i.test(text))
            rows.push({ label: 'discount', value: (text.match(/discount[^$-]*(-?\$[\d,.Xx]+)/i) || [])[1] });
        if (/total/i.test(text))
            rows.push({ label: 'total', value: (text.match(/total[^$-]*(-?\$[\d,.Xx]+)/i) || [])[1] });
    }
    if (!rows.length)
        return undefined;
    const summary = { rows: rows };
    for (let index = 0; index < rows.length; index += 1) {
        if (rows[index].label === 'subtotal')
            summary.subtotal = rows[index].value;
        if (rows[index].label === 'discount')
            summary.discount = rows[index].value;
        if (rows[index].label === 'total')
            summary.total = rows[index].value;
    }
    return summary;
}
function findSummaryNode(root) {
    return findNodesByRole(root, 'summary', 0)[0];
}
function buildSummary(root) {
    const summaryNode = findSummaryNode(root);
    return summaryNode ? parseSummaryText(summaryNode) : undefined;
}
function findPrimaryCtaNode(root, productContainer) {
    return findNodesByRole(root, 'cta', 0).find(function (node) {
        if (!productContainer)
            return true;
        return !flattenTree(productContainer).some(function (child) {
            return child.id === node.id;
        });
    });
}
function buildPrimaryCta(root, productContainer) {
    const node = findPrimaryCtaNode(root, productContainer);
    if (!node)
        return undefined;
    return {
        label: collectText(node) || node.text || 'Continue',
    };
}
function findDisclaimerText(root) {
    return firstNodeText(root, 'disclaimer');
}
function findDisclaimerNode(root) {
    return findNodesByRole(root, 'disclaimer', 0)[0];
}
function resolvePattern(root, productCount, hasSummary) {
    const hasWideProducts = !!findNodesByRole(root, 'product-list', 0)[0];
    if (hasSummary && productCount > 0)
        return 'cart_recovery_split';
    if (productCount > 1 && hasWideProducts)
        return 'grid';
    return productCount > 1 ? 'carousel' : 'single';
}
function collectWarnings(schema) {
    const warnings = [];
    if (!schema.headline)
        warnings.push('No headline component found.');
    if (!schema.primaryCta)
        warnings.push('No primary CTA component found.');
    return warnings;
}
function buildProduct(card) {
    const descendants = flattenTree(card);
    const titleNode = descendants.find(function (node) { return node.detectedRole === 'product-title'; });
    const subtitleNode = descendants.find(function (node) { return node.detectedRole === 'product-subtitle'; });
    const priceNode = descendants.find(function (node) { return node.detectedRole === 'product-price'; });
    const ctaNode = descendants.find(function (node) { return node.detectedRole === 'product-cta'; });
    return {
        title: titleNode ? collectText(titleNode) : undefined,
        subtitle: subtitleNode ? collectText(subtitleNode) : undefined,
        price: priceNode ? collectText(priceNode) : undefined,
        cta: ctaNode ? collectText(ctaNode) : undefined,
        imageAlt: titleNode ? collectText(titleNode) : 'Product image',
        _imageNodeId: findImageNodeId(card),
    };
}
function analyzeSelection(rootNode) {
    const ast = normalizeNode(rootNode);
    const roleMap = {};
    const nodes = flattenTree(ast);
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        roleMap[node.id] = {
            role: node.detectedRole || 'other',
            confidence: node.detectedRole && node.detectedRole !== 'other' ? 1 : 0,
        };
    }
    const productContainer = findProductListContainer(ast);
    const productCards = findProductCards(ast, productContainer);
    const summaryNode = findSummaryNode(ast);
    const primaryCtaNode = findPrimaryCtaNode(ast, productContainer);
    const disclaimerNode = findDisclaimerNode(ast);
    const headlineNode = findNodesByRole(ast, 'headline', 0)[0];
    const subtextNode = findNodesByRole(ast, 'subtext', 0)[0];
    const eyebrowNode = findNodesByRole(ast, 'eyebrow', 0)[0];
    const products = productCards.map(buildProduct);
    const summary = buildSummary(ast);
    const schema = {
        pattern: resolvePattern(ast, products.length, !!summary),
        layout: ast.bounds.width < constants_1.MOBILE_WIDTH_THRESHOLD ? 'mobile' : 'desktop',
        headline: headlineNode ? collectText(headlineNode) : undefined,
        subtext: subtextNode ? collectText(subtextNode) : undefined,
        eyebrow: eyebrowNode ? collectText(eyebrowNode) : undefined,
        closeButton: !!findNodesByRole(ast, 'close-button', 0)[0],
        products: products,
        summary: summary,
        primaryCta: buildPrimaryCta(ast, productContainer),
        disclaimer: findDisclaimerText(ast),
    };
    return {
        ast: ast,
        schema: schema,
        report: {
            pattern: schema.pattern,
            warnings: collectWarnings(schema),
        },
        roleMap: roleMap,
        dynamicNodeIds: collectDynamicNodeIds(ast),
        headlineNodeId: headlineNode ? headlineNode.id : undefined,
        subtextNodeId: subtextNode ? subtextNode.id : undefined,
        eyebrowNodeId: eyebrowNode ? eyebrowNode.id : undefined,
        summaryNodeId: summaryNode ? summaryNode.id : undefined,
        productContainerNodeId: productContainer ? productContainer.id : undefined,
        productCardNodeIds: productCards.map(function (card) { return card.id; }),
        primaryCtaNodeId: primaryCtaNode ? primaryCtaNode.id : undefined,
        disclaimerNodeId: disclaimerNode ? disclaimerNode.id : undefined,
    };
}
},
"render/index": function(require, module, exports) {
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderFlattenedHtml = exports.buildUsiJsFile = exports.extractCampaignCss = exports.renderSemanticHtml = void 0;
var semantic_1 = require("./semantic");
Object.defineProperty(exports, "renderSemanticHtml", { enumerable: true, get: function () { return semantic_1.renderSemanticHtml; } });
__exportStar(require("./preview-pages"), exports);
var devmode_1 = require("./devmode");
Object.defineProperty(exports, "extractCampaignCss", { enumerable: true, get: function () { return devmode_1.extractCampaignCss; } });
var flattened_1 = require("./flattened");
Object.defineProperty(exports, "buildUsiJsFile", { enumerable: true, get: function () { return flattened_1.buildUsiJsFile; } });
Object.defineProperty(exports, "renderFlattenedHtml", { enumerable: true, get: function () { return flattened_1.renderFlattenedHtml; } });
},
"render/semantic": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSemanticHtml = renderSemanticHtml;
exports.renderRawFallback = renderRawFallback;
const string_1 = require("../utils/string");
const constants_1 = require("../constants");
const css_1 = require("../utils/css");
const index_1 = require("../analysis/index");
function renderProductCard(product) {
    const imageHtml = product.imageAsset
        ? '<img class="usi_product_image" src="' +
            (0, string_1.escapeHtml)(product.imageAsset) +
            '" alt="' +
            (0, string_1.escapeHtml)(product.imageAlt || product.title || 'Product image') +
            '" />'
        : '<div class="usi_product_image usi_product_image_placeholder" aria-hidden="true"></div>';
    const subtitleHtml = product.subtitle ? '<p class="usi_product_meta">' + (0, string_1.escapeHtml)(product.subtitle) + '</p>' : '';
    const priceHtml = product.price ? '<p class="usi_product_price">' + (0, string_1.escapeHtml)(product.price) + '</p>' : '';
    const ctaHtml = product.cta ? '<button class="usi_product_cta" type="button">' + (0, string_1.escapeHtml)(product.cta) + '</button>' : '';
    return ('<article class="usi_product_card">' +
        imageHtml +
        '<section class="usi_product_body">' +
        '<h3 class="usi_product_title">' +
        (0, string_1.escapeHtml)(product.title || 'Product') +
        '</h3>' +
        subtitleHtml +
        priceHtml +
        ctaHtml +
        '</section>' +
        '</article>');
}
function hasInsertedComponent(root, componentId) {
    return (0, index_1.flattenTree)(root).some(function (node) {
        return !node.ignored && node.componentOverride === componentId;
    });
}
function renderSummary(summary) {
    if (!summary || !summary.rows.length)
        return '';
    const rowsHtml = summary.rows
        .map(function (row) {
        return ('<div class="usi_summary_row"><span>' +
            (0, string_1.escapeHtml)(row.label) +
            '</span><strong>' +
            (0, string_1.escapeHtml)(row.value || '') +
            '</strong></div>');
    })
        .join('');
    return '<section class="usi_summary" aria-label="Cart summary">' + rowsHtml + '</section>';
}
function componentDefinitionForNode(node) {
    if (node.componentOverride && constants_1.COMPONENT_BY_ID[node.componentOverride]) {
        return constants_1.COMPONENT_BY_ID[node.componentOverride];
    }
    return constants_1.COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || 'other'];
}
function componentText(node, definition) {
    const text = (0, index_1.collectText)(node) || node.text || node.name || '';
    if (text)
        return text;
    return definition && definition.render.fallbackText ? definition.render.fallbackText : '';
}
function renderExplicitComponentNode(node) {
    const definition = componentDefinitionForNode(node);
    if (!definition)
        return '';
    const tag = definition.render.htmlTag;
    const className = definition.render.className;
    const text = componentText(node, definition);
    const kind = definition.render.kind;
    if (kind === 'input') {
        return '<label class="' + className + '"><span class="usi_field_label">' + (0, string_1.escapeHtml)(node.name || definition.label) + '</span><input class="usi_field_input" type="' + (0, string_1.escapeHtml)(definition.render.inputType || 'text') + '" placeholder="' + (0, string_1.escapeHtml)(text) + '" /></label>';
    }
    if (kind === 'survey') {
        const children = node.children.filter(function (child) { return !child.ignored && child.visible; });
        const prompt = children[0] ? componentText(children[0]) : text;
        const options = (children.length > 1 ? children.slice(1) : [])
            .map(function (child) {
            return '<button class="usi_survey_option" type="button">' + (0, string_1.escapeHtml)(componentText(child)) + '</button>';
        })
            .join('') || '<button class="usi_survey_option" type="button">Option 1</button><button class="usi_survey_option" type="button">Option 2</button>';
        return '<section class="' + className + '"><p class="usi_survey_prompt">' + (0, string_1.escapeHtml)(prompt) + '</p><div class="usi_survey_options">' + options + '</div></section>';
    }
    if (kind === 'coupon') {
        const childrenText = node.children.map(function (child) { return componentText(child); }).filter(Boolean);
        const code = childrenText[0] || text || definition.render.fallbackText || 'SAVE15';
        const label = childrenText[1] || definition.render.buttonText || 'Copy Code';
        return '<section class="' + className + '"><div class="usi_coupon_code">' + (0, string_1.escapeHtml)(code) + '</div><button class="usi_coupon_button" type="button">' + (0, string_1.escapeHtml)(label) + '</button></section>';
    }
    if (kind === 'optin') {
        return '<label class="' + className + '"><input class="usi_optin_input" type="checkbox" /><span class="usi_optin_label">' + (0, string_1.escapeHtml)(text) + '</span></label>';
    }
    if (kind === 'countdown') {
        return '<div class="' + className + '">' + (0, string_1.escapeHtml)(text || '09:59') + '</div>';
    }
    if (kind === 'progress') {
        return '<div class="' + className + '"><div class="usi_progress_fill"></div></div>';
    }
    if (kind === 'media') {
        if (tag === 'hr') {
            return '<hr class="' + className + '" />';
        }
        return '<div class="' + className + '" aria-hidden="true"></div>';
    }
    if (kind === 'button' || tag === 'button') {
        return '<button class="' + className + '" type="button">' + (0, string_1.escapeHtml)(text || definition.render.buttonText || definition.label) + '</button>';
    }
    return '<' + tag + ' class="' + className + '">' + (0, string_1.escapeHtml)(text) + '</' + tag + '>';
}
function renderExtraRegionNodes(root, region, excludedIds) {
    const rendered = [];
    (function walk(node) {
        if (node.ignored || excludedIds.indexOf(node.id) !== -1)
            return;
        const definition = componentDefinitionForNode(node);
        if (definition && definition.render.region === region) {
            rendered.push(renderExplicitComponentNode(node));
            return;
        }
        for (let index = 0; index < node.children.length; index += 1) {
            walk(node.children[index]);
        }
    })(root);
    return rendered.join('');
}
function renderExtraRegionCss(root, region, excludedIds) {
    const nodes = [];
    (function walk(node) {
        if (node.ignored || excludedIds.indexOf(node.id) !== -1)
            return;
        const definition = componentDefinitionForNode(node);
        if (definition && definition.render.region === region) {
            nodes.push(node);
            return;
        }
        for (let index = 0; index < node.children.length; index += 1) {
            walk(node.children[index]);
        }
    })(root);
    return nodes
        .map(function (node, index) {
        const definition = componentDefinitionForNode(node);
        if (!definition)
            return '';
        return semanticNodeRule('.' + definition.render.className.split(' ')[0] + ':nth-of-type(' + (index + 1) + ')', node, {});
    })
        .join('');
}
function inlineStyleAttr(style) {
    const css = (0, css_1.cssDeclarations)(style);
    return css ? ' style="' + (0, string_1.escapeHtml)(css) + '"' : '';
}
function combineBounds(nodes) {
    const filtered = nodes.filter(Boolean);
    if (!filtered.length)
        return undefined;
    let left = filtered[0].bounds.x;
    let top = filtered[0].bounds.y;
    let right = filtered[0].bounds.x + filtered[0].bounds.width;
    let bottom = filtered[0].bounds.y + filtered[0].bounds.height;
    for (let index = 1; index < filtered.length; index += 1) {
        left = Math.min(left, filtered[index].bounds.x);
        top = Math.min(top, filtered[index].bounds.y);
        right = Math.max(right, filtered[index].bounds.x + filtered[index].bounds.width);
        bottom = Math.max(bottom, filtered[index].bounds.y + filtered[index].bounds.height);
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
}
function regionRule(selector, root, bounds) {
    if (!bounds)
        return '';
    return selector + ' { ' + (0, css_1.cssDeclarations)({
        width: String((bounds.width / root.bounds.width) * 100) + '%',
        'min-height': String((bounds.height / root.bounds.height) * 100) + '%',
    }) + ' }\n';
}
function buttonStyleDeclarations(node) {
    return {
        'background-color': node.style.background || 'transparent',
        color: node.style.color || '#111111',
        border: node.style.borderColor
            ? (node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor
            : '1px solid rgba(0, 0, 0, 0.25)',
        'border-radius': node.style.borderRadius != null ? node.style.borderRadius + 'px' : undefined,
        opacity: node.style.opacity,
        'font-size': node.style.fontSize ? node.style.fontSize + 'px' : undefined,
        'font-weight': node.style.fontWeight,
        'line-height': (0, css_1.lineHeightCss)(node),
        'letter-spacing': node.style.letterSpacing ? node.style.letterSpacing + 'px' : undefined,
        'text-align': node.style.textAlign,
        'text-transform': (0, css_1.textTransformFromCase)(node.style.textCase),
    };
}
function semanticBoxInlineStyle(node) {
    if (!node)
        return '';
    return inlineStyleAttr({
        'background-color': node.style.background,
        color: node.style.color,
        border: node.style.borderColor ? (node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor : undefined,
        'border-radius': node.style.borderRadius != null ? node.style.borderRadius + 'px' : undefined,
        opacity: node.style.opacity,
    });
}
function semanticNodeRule(selector, node, extra) {
    if (!node)
        return '';
    const declarations = (0, css_1.cssDeclarations)(Object.assign({
        'background-color': node.style.background,
        color: node.style.color,
        border: node.style.borderColor ? String(node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor : undefined,
        'border-radius': node.style.borderRadius != null ? String(node.style.borderRadius) + 'px' : undefined,
        opacity: node.style.opacity,
        'font-family': node.style.fontFamily ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif' : undefined,
        'font-style': node.style.fontStyle,
        'font-size': node.style.fontSize ? String(node.style.fontSize) + 'px' : undefined,
        'font-weight': node.style.fontWeight,
        'line-height': node.style.lineHeight ? String(node.style.lineHeight) + 'px' : undefined,
        'letter-spacing': node.style.letterSpacing ? String(node.style.letterSpacing) + 'px' : undefined,
        'text-align': node.style.textAlign,
        'text-transform': (0, css_1.textTransformFromCase)(node.style.textCase),
    }, extra));
    return declarations ? selector + ' { ' + declarations + ' }\n' : '';
}
function renderSemanticHtml(schema, ast) {
    const frameScale = (0, css_1.getProductionScaleForFrame)(ast.bounds);
    const displayWidth = (0, css_1.scalePx)(ast.bounds.width, frameScale) || ast.bounds.width;
    const displayHeight = (0, css_1.scalePx)(ast.bounds.height, frameScale) || ast.bounds.height;
    const headlineNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'headline', 0.35));
    const subtextNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'subtext', 0.3));
    const eyebrowNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'eyebrow', 0.3));
    const ctaNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'cta', 0.35));
    const disclaimerNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'disclaimer', 0.3));
    const productListNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'product-list', 0.35));
    const productCardNodes = (0, index_1.findNodesByRole)(ast, 'product-card', 0.35);
    const summaryNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'summary', 0.35));
    const closeNode = (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(ast, 'close-button', 0.35));
    const mainBounds = combineBounds([eyebrowNode, headlineNode, subtextNode, ctaNode]);
    const productsBounds = productListNode ? productListNode.bounds : combineBounds(productCardNodes);
    const rightBounds = combineBounds([productListNode, summaryNode]);
    const hasSideRail = !!mainBounds && !!rightBounds && rightBounds.x > mainBounds.x + (mainBounds.width * 0.65);
    const topHero = !!mainBounds && !!productsBounds && productsBounds.y > mainBounds.y + (mainBounds.height * 0.65);
    const gridColumns = productsBounds && productCardNodes.length > 1
        ? Math.max(1, Math.min(productCardNodes.length, Math.round(productsBounds.width / Math.max(productCardNodes[0].bounds.width, 1))))
        : Math.max(1, Math.min(schema.products.length || 1, 3));
    const productGap = productCardNodes.length > 1
        ? Math.max(8, Math.round((productsBounds ? productsBounds.width : ast.bounds.width) * 0.03))
        : 12;
    const closeStyle = closeNode
        ? inlineStyleAttr({
            left: String(((closeNode.bounds.x - ast.bounds.x) / ast.bounds.width) * 100) + '%',
            top: String(((closeNode.bounds.y - ast.bounds.y) / ast.bounds.height) * 100) + '%',
            width: String((closeNode.bounds.width / ast.bounds.width) * 100) + '%',
            height: String((closeNode.bounds.height / ast.bounds.height) * 100) + '%',
        })
        : '';
    const productWrapperClass = schema.pattern === 'carousel'
        ? 'usi_products usi_products_carousel'
        : schema.products.length <= 1
            ? 'usi_products usi_products_single'
            : 'usi_products usi_products_grid';
    const layoutClass = hasSideRail ? 'usi_layout_split' : topHero ? 'usi_layout_stacked' : 'usi_layout_flow';
    const closeHtml = schema.closeButton ? '<button id="usi_close" class="usi_close_button" type="button" aria-label="Close"' + closeStyle + '>×</button>' : '';
    const eyebrowHtml = schema.eyebrow ? '<p class="usi_eyebrow">' + (0, string_1.escapeHtml)(schema.eyebrow) + '</p>' : '';
    const headlineHtml = schema.headline ? '<h1 class="usi_headline">' + (0, string_1.escapeHtml)(schema.headline) + '</h1>' : '';
    const subtextHtml = schema.subtext ? '<p class="usi_subtext">' + (0, string_1.escapeHtml)(schema.subtext) + '</p>' : '';
    const primaryCtaHtml = schema.primaryCta
        ? '<button id="usi_primary_cta" class="usi_primary_cta" type="button">' + (0, string_1.escapeHtml)(schema.primaryCta.label) + '</button>'
        : '';
    const disclaimerHtml = schema.disclaimer ? '<p class="usi_disclaimer">' + (0, string_1.escapeHtml)(schema.disclaimer) + '</p>' : '';
    const summaryHtml = renderSummary(schema.summary);
    const productsHtml = schema.products.length
        ? '<section class="' + productWrapperClass + '" aria-label="Products">' + schema.products.map(renderProductCard).join('') + '</section>'
        : '';
    const hasProducts = !!schema.products.length && !!productCardNodes.length;
    const hasSummary = !!schema.summary && !!summaryNode;
    const hasEmailInput = hasInsertedComponent(ast, 'email_input');
    const hasPhoneInput = hasInsertedComponent(ast, 'phone_input');
    const hasSurvey = hasInsertedComponent(ast, 'survey_block');
    const hasCoupon = hasInsertedComponent(ast, 'copy_coupon');
    const hasOptin = hasInsertedComponent(ast, 'optin_component');
    const hasCountdown = hasInsertedComponent(ast, 'countdown_timer');
    const hasProgress = hasInsertedComponent(ast, 'progress_bar');
    const hasSecondaryCta = hasInsertedComponent(ast, 'no_thanks_button');
    const excludedIds = [
        headlineNode ? headlineNode.id : '',
        subtextNode ? subtextNode.id : '',
        eyebrowNode ? eyebrowNode.id : '',
        ctaNode ? ctaNode.id : '',
        disclaimerNode ? disclaimerNode.id : '',
        summaryNode ? summaryNode.id : '',
        closeNode ? closeNode.id : '',
    ].concat(productCardNodes.map(function (node) { return node.id; })).filter(Boolean);
    const extraMainHtml = renderExtraRegionNodes(ast, 'main', excludedIds);
    const extraAsideHtml = renderExtraRegionNodes(ast, 'aside', excludedIds);
    const extraUtilityHtml = renderExtraRegionNodes(ast, 'utility', excludedIds);
    const extraCss = renderExtraRegionCss(ast, 'main', excludedIds) +
        renderExtraRegionCss(ast, 'aside', excludedIds) +
        renderExtraRegionCss(ast, 'utility', excludedIds);
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Semantic promo export</title><link rel="stylesheet" href="css/styles.css" /></head><body><div id="usi_container"><div id="usi_display" role="alertdialog" aria-label="' +
        (0, string_1.escapeHtml)(schema.headline || 'Modal') +
        '" aria-modal="true" class="usi_display usi_shadow usi_layout_' +
        schema.layout +
        ' usi_pattern_' +
        schema.pattern +
        '">' +
        closeHtml +
        '<div id="usi_content"><article class="usi_modal ' + layoutClass + '"' + semanticBoxInlineStyle(ast) + '><section class="usi_modal_inner"><section class="usi_main">' +
        eyebrowHtml +
        headlineHtml +
        subtextHtml +
        primaryCtaHtml +
        extraMainHtml +
        extraUtilityHtml +
        '</section>' +
        '<aside class="usi_aside">' + productsHtml + summaryHtml + extraAsideHtml + '</aside>' +
        '</section>' +
        disclaimerHtml +
        '</article></div></div></div></body></html>';
    const componentCss = semanticNodeRule('.usi_modal', ast, {}) +
        semanticNodeRule('.usi_eyebrow', eyebrowNode, { margin: 0 }) +
        semanticNodeRule('.usi_headline', headlineNode, { margin: 0 }) +
        semanticNodeRule('.usi_subtext', subtextNode, { margin: 0 }) +
        semanticNodeRule('.usi_aside', productListNode || summaryNode || ast, {}) +
        semanticNodeRule('.usi_summary', summaryNode, {}) +
        semanticNodeRule('.usi_primary_cta', ctaNode || ast, Object.assign({
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            cursor: 'pointer',
            border: (ctaNode || ast).style.borderColor ? String((ctaNode || ast).style.borderWidth || 1) + 'px solid ' + (ctaNode || ast).style.borderColor : undefined,
        }, buttonStyleDeclarations(ctaNode || ast))) +
        semanticNodeRule('.usi_disclaimer', disclaimerNode, { margin: '1rem 0 0' }) +
        extraCss +
        regionRule('.usi_main', ast, mainBounds) +
        regionRule('.usi_aside', ast, rightBounds || productsBounds) +
        productCardNodes.map(function (node, index) {
            return semanticNodeRule('.usi_product_card:nth-child(' + (index + 1) + ')', node, {});
        }).join('');
    const semanticComponentCss = [
        (schema.primaryCta || hasProducts || hasSecondaryCta || hasCoupon || hasSurvey)
            ? '.usi_primary_cta, .usi_product_cta, .usi_secondary_cta, .usi_coupon_button, .usi_survey_option {\n\tappearance: none;\n\tpadding: 14px 20px;\n\tborder-radius: 0;\n}\n'
            : '',
        schema.primaryCta ? '.usi_primary_cta {\n\twidth: fit-content;\n\tmargin-top: 8px;\n}\n' : '',
        hasProducts
            ? '.usi_products {\n\tdisplay: grid;\n\tgap: ' + productGap + 'px;\n\talign-items: start;\n}\n.usi_products_grid {\n\tgrid-template-columns: repeat(' + gridColumns + ', minmax(0, 1fr));\n}\n.usi_products_single {\n\tgrid-template-columns: minmax(0, 1fr);\n}\n.usi_products_carousel {\n\tgrid-auto-flow: column;\n\tgrid-auto-columns: minmax(220px, 1fr);\n\toverflow-x: auto;\n\tpadding-bottom: 4px;\n}\n.usi_product_card {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 10px;\n\tpadding: 14px;\n\tbackground: #f3f3f3;\n\tborder-radius: 16px;\n\tmin-width: 0;\n}\n.usi_product_image {\n\tdisplay: block;\n\twidth: 100%;\n\taspect-ratio: 1 / 1;\n\tobject-fit: cover;\n\tborder-radius: 12px;\n\tbackground: #dcdcdc;\n}\n.usi_product_image_placeholder {\n\tborder: 1px dashed #dddddd;\n}\n.usi_product_body {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 6px;\n}\n.usi_product_title {\n\tmargin: 0;\n\tfont-size: 1rem;\n}\n.usi_product_meta, .usi_product_price {\n\tmargin: 0;\n}\n.usi_product_price {\n\tfont-weight: 700;\n}\n'
            : '',
        hasSummary
            ? '.usi_summary {\n\tdisplay: flex;\n\tflex-direction: column;\n\tgap: 12px;\n\tpadding: 16px;\n\tborder: 1px solid #dddddd;\n\tborder-radius: 16px;\n\tbackground: rgba(255,255,255,0.8);\n}\n.usi_summary_title {\n\tmargin: 0;\n\tfont-size: 1rem;\n}\n.usi_summary_row {\n\tdisplay: grid;\n\tgrid-template-columns: 1fr auto;\n\tgap: 16px;\n\talign-items: start;\n}\n.usi_summary_row strong {\n\tfont-weight: 700;\n}\n'
            : '',
        hasEmailInput || hasPhoneInput ? '.usi_field {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:8px;\n}\n.usi_field_input {\n\twidth:100%;\n\tpadding:14px 16px;\n\tborder:1px solid #d0d0d0;\n\tbackground:#fff;\n\tcolor:#111;\n}\n' : '',
        hasSurvey ? '.usi_survey {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:12px;\n}\n.usi_survey_options {\n\tdisplay:flex;\n\tflex-direction:column;\n\tgap:8px;\n}\n' : '',
        hasCoupon ? '.usi_coupon {\n\tdisplay:flex;\n\tgap:12px;\n\talign-items:center;\n\tflex-wrap:wrap;\n}\n.usi_coupon_code {\n\tpadding:12px 16px;\n\tborder:1px solid #222;\n\tbackground:#fff;\n\tfont-weight:700;\n}\n' : '',
        hasOptin ? '.usi_optin {\n\tdisplay:flex;\n\tgap:10px;\n\talign-items:center;\n}\n' : '',
        hasCountdown ? '.usi_countdown {\n\tdisplay:inline-flex;\n\tpadding:10px 14px;\n\tbackground:#1f1f1f;\n\tcolor:#fff;\n\tfont-weight:700;\n}\n' : '',
        hasProgress ? '.usi_progress {\n\twidth:100%;\n\theight:12px;\n\tbackground:#ddd;\n\tborder-radius:999px;\n\toverflow:hidden;\n}\n.usi_progress_fill {\n\twidth:55%;\n\theight:100%;\n\tbackground:#222;\n}\n' : '',
        schema.disclaimer ? '.usi_disclaimer {\n\ttext-align: center;\n}\n' : '',
        (0, index_1.findNodesByRole)(ast, 'divider', 0).length ? '.usi_divider {\n\tdisplay:block;\n\twidth:100%;\n\theight:4px;\n\tborder:0;\n\tbackground:#1f1f1f;\n\tborder-radius:999px;\n}\n' : '',
        '@media (max-width: 720px) {\n\t.usi_display {\n\t\twidth: min(100vw, ' + displayWidth + 'px);\n\t\tleft: 0;\n\t\tmargin-left: 0;\n\t}\n' +
            (hasSideRail ? '\t.usi_layout_split .usi_modal_inner {\n\t\tgrid-template-columns: 1fr;\n\t}\n' : '') +
            (hasProducts ? '\t.usi_products_grid {\n\t\tgrid-template-columns: repeat(auto-fit, minmax(140px, 1fr));\n\t}\n' : '') +
            '}\n',
    ].join('');
    const css = '* { box-sizing: border-box; } body { margin: 0; background: #ececec; color: #111111; font-family: Helvetica, Arial, sans-serif; } #usi_container { width: 100%; } .usi_display { left:50%; margin-left:-' + String(displayWidth / 2) + 'px; top:0px; width:' + displayWidth + 'px; height:' + displayHeight + 'px; position: relative; display: block; font-size: 16px; } .usi_display * { padding:0; margin:0; color:inherit; text-decoration:none; line-height:1.2; box-shadow:none; outline:none; text-align:left; font-family: Helvetica, Arial, sans-serif; float:none; } .usi_shadow { box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.33); } #usi_close { position:absolute; z-index:2000000300; cursor:pointer; border:none; background:none; display:flex; align-items:center; justify-content:center; font-size:1.5rem; line-height:1; } #usi_content { position:absolute; left:0px; top:0px; width:100%; height:100%; z-index:2000000200; } .usi_modal { width: 100%; min-height: 100%; padding: clamp(16px, 3vw, 32px); position: relative; } .usi_modal_sidebar { max-width: 360px; margin-left: auto; } .usi_modal_bottom_bar { min-height: auto; } .usi_modal_inner { display: flex; flex-direction: column; gap: clamp(16px, 2.2vw, 28px); min-height: 100%; } .usi_layout_split .usi_modal_inner { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(20px, 3vw, 40px); align-items: start; } .usi_layout_stacked .usi_modal_inner { display: flex; flex-direction: column; } .usi_main { display: flex; flex-direction: column; gap: 12px; justify-content: flex-start; align-self: start; } .usi_aside { display: flex; flex-direction: column; gap: clamp(16px, 2vw, 24px); align-self: start; } .usi_layout_stacked .usi_main { align-items: center; text-align: center; } .usi_layout_stacked .usi_primary_cta { align-self: flex-start; } .usi_sr_only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; } ' + semanticComponentCss + componentCss;
    return { html: html, css: css };
}
function rawNodeTag(node) {
    if (node.detectedRole === 'headline')
        return 'h1';
    if (node.detectedRole === 'eyebrow')
        return 'p';
    if (node.detectedRole === 'subtext' || node.detectedRole === 'disclaimer')
        return 'p';
    if (node.detectedRole === 'cta')
        return 'button';
    if (node.type === 'TEXT')
        return 'p';
    if (node.children.length)
        return 'section';
    return 'div';
}
function rawNodeClasses(node) {
    const classes = ['usi_raw_node', 'usi_raw_node_' + String(node.type).toLowerCase()];
    if (node.detectedRole && node.detectedRole !== 'other')
        classes.push('usi_raw_node_' + node.detectedRole.replace(/-/g, '_'));
    if (node.layout.mode !== 'NONE')
        classes.push('usi_raw_node_autolayout');
    return classes.join(' ');
}
function rawNodeStyle(node) {
    return (0, css_1.cssDeclarations)({
        display: node.layout.mode === 'NONE' ? (node.children.length ? 'block' : undefined) : 'flex',
        'flex-direction': node.layout.mode === 'HORIZONTAL' ? 'row' : node.layout.mode === 'VERTICAL' ? 'column' : undefined,
        gap: node.layout.gap ? node.layout.gap + 'px' : undefined,
        padding: node.layout.padding.top || node.layout.padding.right || node.layout.padding.bottom || node.layout.padding.left
            ? node.layout.padding.top + 'px ' + node.layout.padding.right + 'px ' + node.layout.padding.bottom + 'px ' + node.layout.padding.left + 'px'
            : undefined,
        'background-color': node.style.background,
        color: node.style.color,
        'border-color': node.style.borderColor,
        'border-style': node.style.borderColor ? 'solid' : undefined,
        'border-width': node.style.borderWidth ? node.style.borderWidth + 'px' : undefined,
        'border-radius': node.style.borderRadius ? node.style.borderRadius + 'px' : undefined,
        opacity: node.style.opacity,
        'font-size': node.style.fontSize ? node.style.fontSize + 'px' : undefined,
        'font-weight': node.style.fontWeight,
        'line-height': node.style.lineHeight ? node.style.lineHeight + 'px' : undefined,
        'text-align': node.style.textAlign,
        'min-height': node.bounds.height ? Math.min(node.bounds.height, 240) + 'px' : undefined,
    });
}
function renderRawTree(node) {
    if (node.ignored || !node.visible)
        return '';
    const tag = rawNodeTag(node);
    const className = rawNodeClasses(node);
    const style = rawNodeStyle(node);
    if (node.type === 'TEXT' || (!node.children.length && node.text)) {
        return '<' + tag + ' class="' + className + '"' + (style ? ' style="' + (0, string_1.escapeHtml)(style) + '"' : '') + '>' + (0, string_1.escapeHtml)(node.text || (0, index_1.collectText)(node)) + '</' + tag + '>';
    }
    if ((node.detectedRole === 'image' || node.roleOverride === 'image') && !node.children.length) {
        return '<div class="' + className + '"' + (style ? ' style="' + (0, string_1.escapeHtml)(style) + '"' : '') + ' aria-hidden="true"></div>';
    }
    return '<' + tag + ' class="' + className + '"' + (style ? ' style="' + (0, string_1.escapeHtml)(style) + '"' : '') + '>' + node.children.map(renderRawTree).join('') + '</' + tag + '>';
}
function renderRawFallback(ast) {
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Raw structured fallback</title><link rel="stylesheet" href="css/fallback.css" /></head><body><main class="usi_raw_root">' + renderRawTree(ast) + '</main></body></html>';
    const css = '* { box-sizing: border-box; }body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f4f4f4; color: #222; }.usi_raw_root { max-width: 1080px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }.usi_raw_node { width: 100%; }.usi_raw_node_cta { width: fit-content; border: 0; background: #222; color: #fff; border-radius: 999px; padding: 12px 18px; cursor: pointer; }.usi_raw_node_headline { margin: 0; }.usi_raw_node_disclaimer { font-size: 12px; color: #666; }.usi_raw_node_image { background: #ddd; min-height: 140px; border-radius: 12px; }';
    return { html: html, css: css };
}
},
"utils/css": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cssDeclarations = cssDeclarations;
exports.toPercent = toPercent;
exports.lineHeightCss = lineHeightCss;
exports.getProductionScaleForFrame = getProductionScaleForFrame;
exports.pxToEm = pxToEm;
exports.scalePx = scalePx;
exports.textTransformFromCase = textTransformFromCase;
const constants_1 = require("../constants");
function cssDeclarations(style) {
    return Object.entries(style)
        .filter(function (_entry) {
        return _entry[1] != null && _entry[1] !== '';
    })
        .map(function (entry) {
        return entry[0] + ': ' + entry[1] + ';';
    })
        .join(' ');
}
function toPercent(value, total) {
    if (!total)
        return '0%';
    return ((value / total) * 100).toFixed(4).replace(/\.?0+$/, '') + '%';
}
function lineHeightCss(node) {
    if (node.style.lineHeight)
        return node.style.lineHeight + 'px';
    if (node.style.fontSize)
        return (node.style.fontSize * 1.2).toFixed(2).replace(/\.?0+$/, '') + 'px';
    return undefined;
}
function getProductionScaleForFrame(bounds) {
    return bounds.width >= constants_1.THREE_X_THRESHOLD || bounds.height >= constants_1.THREE_X_THRESHOLD
        ? constants_1.PRODUCTION_SCALE
        : 1;
}
function pxToEm(value, base = 16, scale = 1) {
    if (typeof value !== 'number')
        return undefined;
    return (value / scale / base).toFixed(4).replace(/\.?0+$/, '') + 'em';
}
function scalePx(value, scale = 1) {
    if (typeof value !== 'number')
        return undefined;
    return value / scale;
}
function textTransformFromCase(textCase) {
    if (textCase === 'upper')
        return 'uppercase';
    if (textCase === 'lower')
        return 'lowercase';
    if (textCase === 'title')
        return 'capitalize';
    return undefined;
}
},
"render/preview-pages": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPreviewIndex = renderPreviewIndex;
exports.renderMultiExportIndex = renderMultiExportIndex;
exports.renderMockupReviewIndex = renderMockupReviewIndex;
const string_1 = require("../utils/string");
function renderPreviewIndex(title, images, devMode) {
    const previews = [
        { name: 'Semantic', href: 'semantic.html' },
        { name: 'Flattened Live Text', href: 'flattened_live_text.html' },
        { name: 'Flattened Text Baked', href: 'flattened_text_baked.html' },
    ];
    const cssPlaceholder = '__USI_INDEX_DEV_CSS__';
    const jsPlaceholder = '__USI_INDEX_DEV_JS__';
    const galleryHtml = images.length
        ? '<section class="usi_preview_gallery"><h2>Images</h2><div class="usi_preview_gallery_grid">' +
            images
                .map(function (image) {
                return '<figure class="usi_preview_gallery_item"><a href="' + image.href + '" target="_blank" rel="noreferrer"><img src="' + image.href + '" alt="' + (0, string_1.escapeHtml)(image.name) + '" /></a><figcaption>' + (0, string_1.escapeHtml)(image.name) + '</figcaption></figure>';
            })
                .join('') +
            '</div></section>'
        : '';
    const shell = (0, string_1.formatHtml)('<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' +
        (0, string_1.escapeHtml)(title) +
        ' Preview</title><style>' +
        ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_surface_alt:#f8f8f8;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_link:#0b57d0;--usi_media:#f8f8f8;--usi_nav:#eef3fd;--usi_nav_active:#dce8ff;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_surface_alt:#121417;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_link:#8ab4f8;--usi_media:#0f1113;--usi_nav:#1d2633;--usi_nav_active:#27364a;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}.usi_preview_shell{display:flex;flex-direction:column;gap:24px;max-width:1400px;margin:0 auto;}.usi_preview_header,.usi_preview_panel,.usi_preview_gallery,.usi_preview_code_card{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px;}.usi_preview_header h1,.usi_preview_panel h2,.usi_preview_gallery h2,.usi_preview_code_card h2,.usi_preview_code_card h3{margin:0;}.usi_preview_header p,.usi_preview_code_card p{margin:0;color:var(--usi_muted);}.usi_preview_card_action a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border:1px solid var(--usi_border);border-radius:999px;background:var(--usi_nav);color:var(--usi_link);text-decoration:none;font-weight:700;transition:background-color .15s ease,border-color .15s ease;}.usi_preview_card_action a:hover{background:var(--usi_nav_active);border-color:var(--usi_link);}.usi_preview_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;}.usi_preview_frame{height:720px;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_surface_alt);overflow:auto;}.usi_preview_panel iframe{width:200%;height:1440px;border:0;background:#fff;transform:scale(.5);transform-origin:0 0;display:block;}.usi_preview_gallery_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;}.usi_preview_gallery_item{margin:0;display:flex;flex-direction:column;gap:8px;}.usi_preview_gallery_item a{display:block;border:1px solid var(--usi_border);border-radius:12px;overflow:hidden;background:var(--usi_surface);}.usi_preview_gallery_item img{display:block;width:100%;height:220px;object-fit:contain;background:var(--usi_media);}.usi_preview_gallery_item figcaption{font-size:13px;color:var(--usi_muted);word-break:break-word;}.usi_preview_code_grid{display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:20px;align-items:start;}.usi_preview_code_preview img{display:block;width:100%;height:auto;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_media);}.usi_preview_code_columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}.usi_preview_code_columns pre{margin:0;padding:16px;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_surface_alt);overflow:auto;white-space:pre;tab-size:2;}@media (max-width:1200px){.usi_preview_code_columns{grid-template-columns:1fr;}}@media (max-width:960px){.usi_preview_code_grid{grid-template-columns:1fr;}}</style></head><body><main class="usi_preview_shell"><section class="usi_preview_header"><h1>' +
        (0, string_1.escapeHtml)(title) +
        '</h1><p>Open the exported variants and review the generated flattened campaign code below.</p></section>' +
        galleryHtml +
        '<section class="usi_preview_grid">' +
        previews
            .map(function (preview) {
            return '<article class="usi_preview_panel"><div class="usi_preview_card_action"><a href="' + preview.href + '">' + (0, string_1.escapeHtml)(preview.name) + '</a></div><div class="usi_preview_frame"><iframe loading="lazy" src="' + preview.href + '" title="' + (0, string_1.escapeHtml)(preview.name) + '"></iframe></div></article>';
        })
            .join('') +
        '</section><section class="usi_preview_code_card"><h2>Flattened Campaign Code</h2><p>The preview image below uses the text baked background, alongside the exact CSS and JS generated for the flattened campaign output.</p><div class="usi_preview_code_grid"><article class="usi_preview_code_preview"><h3>Text Baked Background</h3><img src="' +
        (0, string_1.escapeHtml)(devMode.bakedImageHref) +
        '" alt="' +
        (0, string_1.escapeHtml)(title + ' baked background') +
        '" /></article><section class="usi_preview_code_columns"><article><h3>Flattened Campaign CSS</h3><pre><code>' +
        cssPlaceholder +
        '</code></pre></article><article><h3>Flattened usi_js</h3><pre><code>' +
        jsPlaceholder +
        '</code></pre></article></section></div></section>' +
        '</main></body></html>');
    return shell
        .replace(cssPlaceholder, (0, string_1.escapeHtml)(devMode.cssSource))
        .replace(jsPlaceholder, (0, string_1.escapeHtml)(devMode.jsSource));
}
function renderMultiExportIndex(entries) {
    return (0, string_1.formatHtml)('<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Export Index</title><style>' +
        ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_surface_alt:#f8f8f8;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_link:#0b57d0;--usi_media:#f8f8f8;--usi_nav:#eef3fd;--usi_nav_active:#dce8ff;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_surface_alt:#121417;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_link:#8ab4f8;--usi_media:#0f1113;--usi_nav:#1d2633;--usi_nav_active:#27364a;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}.usi_export_root{max-width:1440px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}.usi_export_header,.usi_export_card{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;}.usi_export_header h1,.usi_export_header p,.usi_export_card h2{margin:0 0 12px 0;}.usi_export_grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;}.usi_export_card a{color:var(--usi_link);text-decoration:none;font-weight:700;}.usi_export_open{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border:1px solid var(--usi_border);border-radius:999px;background:var(--usi_nav);transition:background-color .15s ease,border-color .15s ease;}.usi_export_open:hover{background:var(--usi_nav_active);border-color:var(--usi_link);} .usi_export_card_action{margin-bottom:12px;}.usi_export_frame{height:720px;border:1px solid var(--usi_border);border-radius:12px;background:var(--usi_surface_alt);overflow:auto;}.usi_export_card iframe{width:200%;height:1440px;border:0;background:#fff;transform:scale(.5);transform-origin:0 0;display:block;}.usi_export_gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;}.usi_export_gallery figure{margin:0;display:flex;flex-direction:column;gap:6px;}.usi_export_gallery a{display:block;border:1px solid var(--usi_border);border-radius:10px;overflow:hidden;background:var(--usi_surface);}.usi_export_gallery img{display:block;width:100%;height:120px;object-fit:contain;background:var(--usi_media);}.usi_export_gallery figcaption{font-size:12px;color:var(--usi_muted);word-break:break-word;}</style></head><body><main class="usi_export_root"><section class="usi_export_header"><h1>Export Index</h1><p>Preview each exported frame below.</p></section><section class="usi_export_grid">' +
        entries
            .map(function (entry) {
            const galleryHtml = entry.images.length
                ? '<div class="usi_export_gallery">' +
                    entry.images
                        .map(function (image) {
                        return '<figure><a href="' + image.href + '" target="_blank" rel="noreferrer"><img src="' + image.href + '" alt="' + (0, string_1.escapeHtml)(image.name) + '" /></a><figcaption>' + (0, string_1.escapeHtml)(image.name) + '</figcaption></figure>';
                    })
                        .join('') +
                    '</div>'
                : '';
            return '<article class="usi_export_card"><div class="usi_export_card_action"><a class="usi_export_open" href="' + entry.href + '">Open ' + (0, string_1.escapeHtml)(entry.name) + '</a></div><h2>' + (0, string_1.escapeHtml)(entry.name) + '</h2>' + galleryHtml + '<div class="usi_export_frame"><iframe loading="lazy" src="' + entry.href + '" title="' + (0, string_1.escapeHtml)(entry.name) + '"></iframe></div></article>';
        })
            .join('') +
        '</section></main></body></html>');
}
function renderMockupReviewIndex(entries) {
    return (0, string_1.formatHtml)('<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Mockup Review</title><style>' +
        ':root{color-scheme:light dark;--usi_bg:#f5f5f5;--usi_surface:#ffffff;--usi_border:#dddddd;--usi_text:#111111;--usi_muted:#555555;--usi_media:#f8f8f8;}@media (prefers-color-scheme: dark){:root{--usi_bg:#111315;--usi_surface:#1a1d21;--usi_border:#31353b;--usi_text:#f1f3f4;--usi_muted:#aab1b9;--usi_media:#0f1113;}}body{margin:0;padding:24px;font-family:Helvetica,Arial,sans-serif;background:var(--usi_bg);color:var(--usi_text);}*{box-sizing:border-box;}.usi_mockup_root{max-width:1480px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}.usi_mockup_header,.usi_mockup_section{background:var(--usi_surface);border:1px solid var(--usi_border);border-radius:16px;padding:20px;}.usi_mockup_header h1,.usi_mockup_header p,.usi_mockup_section h2{margin:0 0 12px 0;}.usi_mockup_gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;}.usi_mockup_card{margin:0;display:flex;flex-direction:column;gap:10px;}.usi_mockup_card a{display:block;border:1px solid var(--usi_border);border-radius:12px;overflow:hidden;background:var(--usi_surface);}.usi_mockup_card img{display:block;width:100%;height:360px;object-fit:contain;background:var(--usi_media);}.usi_mockup_card figcaption{font-size:14px;color:var(--usi_muted);word-break:break-word;}.usi_mockup_card strong{display:block;color:var(--usi_text);margin-bottom:4px;}</style></head><body><main class="usi_mockup_root"><section class="usi_mockup_header"><h1>Mockup Review</h1><p>Review all exported mockup images for client feedback.</p></section><section class="usi_mockup_section"><h2>Frames</h2><div class="usi_mockup_gallery">' +
        entries
            .map(function (entry) {
            return '<figure class="usi_mockup_card"><a href="' + entry.href + '" target="_blank" rel="noreferrer"><img src="' + entry.href + '" alt="' + (0, string_1.escapeHtml)(entry.name) + '" /></a><figcaption><strong>' + (0, string_1.escapeHtml)(entry.name) + '</strong>' + (0, string_1.escapeHtml)(entry.href) + '</figcaption></figure>';
        })
            .join('') +
        '</div></section></main></body></html>');
}
},
"render/devmode": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCampaignCss = extractCampaignCss;
const string_1 = require("../utils/string");
const DEVMODE_BASE_SELECTORS = {
    '*': true,
    html: true,
    body: true,
    '.usi_display': true,
    '.usi_display *': true,
    '.usi_quickide_css': true,
    '#usi_container': true,
    '#usi_display': true,
    '.usi_shadow': true,
    '#usi_content': true,
    '#usi_background': true,
    '#usi_background_img': true,
    '#usi_close': true,
    '#usi_close::before': true,
    'button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus': true,
    '.usi_flattened_semantic': true,
    '.usi_sr_only': true,
};
function normalizeSelector(selector) {
    return String(selector || '').replace(/\s+/g, ' ').trim();
}
function splitCssBlocks(source) {
    const input = String(source || '');
    const blocks = [];
    let cursor = 0;
    while (cursor < input.length) {
        const start = input.indexOf('{', cursor);
        if (start === -1)
            break;
        const selector = input.slice(cursor, start).trim();
        let depth = 1;
        let end = start + 1;
        while (end < input.length && depth > 0) {
            if (input.charAt(end) === '{')
                depth += 1;
            if (input.charAt(end) === '}')
                depth -= 1;
            end += 1;
        }
        const body = input.slice(start + 1, Math.max(start + 1, end - 1)).trim();
        if (selector && body) {
            blocks.push({ selector: selector, body: body });
        }
        cursor = end;
    }
    return blocks;
}
function extractCampaignCss(source) {
    const blocks = splitCssBlocks(source);
    const kept = blocks.filter(function (block) {
        const selector = normalizeSelector(block.selector);
        if (/^@media\b/i.test(selector))
            return true;
        return !DEVMODE_BASE_SELECTORS[selector];
    });
    return (0, string_1.formatCss)(kept
        .map(function (block) {
        return block.selector + ' {\n' + block.body + '\n}';
    })
        .join('\n\n'));
}
},
"render/flattened": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderFlattenedHtml = renderFlattenedHtml;
exports.buildUsiJsFile = buildUsiJsFile;
const string_1 = require("../utils/string");
const constants_1 = require("../constants");
const css_1 = require("../utils/css");
const index_1 = require("../analysis/index");
const PRODUCT_PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/EEE/31343C';
function hasInsertedComponent(root, componentId) {
    return (0, index_1.flattenTree)(root).some(function (node) {
        return !node.ignored && node.componentOverride === componentId;
    });
}
function buildPriceRuntimeSetup(includeSummary) {
    if (!includeSummary)
        return '';
    return ('try {\n' +
        '  const subtotal_raw = usi_cookies.get("usi_subtotal");\n' +
        '  const subtotal_num = Number(subtotal_raw);\n' +
        '  const discount = (subtotal_num * 0.15).toFixed(2);\n' +
        '  const new_price = (subtotal_num - Number(discount)).toFixed(2);\n' +
        '  if (isNaN(subtotal_num) || isNaN(Number(discount)) || isNaN(Number(new_price))) {\n' +
        '    throw new Error("Invalid price values");\n' +
        '  }\n' +
        '  usi_js.product = { subtotal: subtotal_raw, discount: discount, new_price: new_price };\n' +
        '} catch (err) {\n' +
        '  usi_commons.report_error(err);\n' +
        '  usi_js.launch.enabled = false;\n' +
        '  usi_js.launch.suppress = true;\n' +
        '}\n\n');
}
function componentDefinitionForNode(node) {
    if (node.componentOverride && constants_1.COMPONENT_BY_ID[node.componentOverride]) {
        return constants_1.COMPONENT_BY_ID[node.componentOverride];
    }
    return constants_1.COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || 'other'];
}
function componentText(node, definition) {
    const text = (0, index_1.collectText)(node) || node.text || node.name || '';
    if (text)
        return text;
    return definition && definition.render.fallbackText ? definition.render.fallbackText : '';
}
function shouldRenderInFlattened(definition, hideVisibleText) {
    if (!definition)
        return false;
    return hideVisibleText ? definition.render.flattened.textBaked : definition.render.flattened.liveText;
}
function shouldRenderAsFlattenedHtml(definition, hideVisibleText) {
    if (!definition)
        return false;
    return definition.role !== 'disclaimer' && shouldRenderInFlattened(definition, hideVisibleText);
}
function renderExplicitComponentNode(node) {
    const definition = componentDefinitionForNode(node);
    if (!definition)
        return '';
    const tag = definition.render.htmlTag;
    const className = definition.render.className;
    const text = componentText(node, definition);
    const kind = definition.render.kind;
    if (kind === 'input') {
        return '<label class="' + className + '"><span class="usi_field_label">' + (0, string_1.escapeHtml)(node.name || definition.label) + '</span><input class="usi_field_input" type="' + (0, string_1.escapeHtml)(definition.render.inputType || 'text') + '" placeholder="' + (0, string_1.escapeHtml)(text) + '" /></label>';
    }
    if (kind === 'survey') {
        const children = node.children.filter(function (child) { return !child.ignored && child.visible; });
        const prompt = children[0] ? componentText(children[0]) : text;
        const options = (children.length > 1 ? children.slice(1) : [])
            .map(function (child) {
            return '<button class="usi_survey_option" type="button">' + (0, string_1.escapeHtml)(componentText(child)) + '</button>';
        })
            .join('') || '<button class="usi_survey_option" type="button">Option 1</button><button class="usi_survey_option" type="button">Option 2</button>';
        return '<section class="' + className + '"><p class="usi_survey_prompt">' + (0, string_1.escapeHtml)(prompt) + '</p><div class="usi_survey_options">' + options + '</div></section>';
    }
    if (kind === 'coupon') {
        const childrenText = node.children.map(function (child) { return componentText(child); }).filter(Boolean);
        const code = childrenText[0] || text || definition.render.fallbackText || 'SAVE15';
        const label = childrenText[1] || definition.render.buttonText || 'Copy Code';
        return '<section class="' + className + '"><div class="usi_coupon_code">' + (0, string_1.escapeHtml)(code) + '</div><button class="usi_coupon_button" type="button">' + (0, string_1.escapeHtml)(label) + '</button></section>';
    }
    if (kind === 'optin') {
        return '<label class="' + className + '"><input class="usi_optin_input" type="checkbox" /><span class="usi_optin_label">' + (0, string_1.escapeHtml)(text) + '</span></label>';
    }
    if (kind === 'countdown')
        return '<div class="' + className + '">' + (0, string_1.escapeHtml)(text || '09:59') + '</div>';
    if (kind === 'progress')
        return '<div class="' + className + '"><div class="usi_progress_fill"></div></div>';
    if (kind === 'media') {
        if (tag === 'hr')
            return '<hr class="' + className + '" />';
        return '<div class="' + className + '" aria-hidden="true"></div>';
    }
    if (kind === 'button' || tag === 'button') {
        return '<button class="' + className + '" type="button">' + (0, string_1.escapeHtml)(text || definition.render.buttonText || definition.label) + '</button>';
    }
    return '<' + tag + ' class="' + className + '">' + (0, string_1.escapeHtml)(text) + '</' + tag + '>';
}
function renderExtraRegionNodes(root, region, excludedIds, hideVisibleText) {
    const rendered = [];
    (function walk(node) {
        if (node.ignored || excludedIds.indexOf(node.id) !== -1)
            return;
        const definition = componentDefinitionForNode(node);
        const shouldRenderNode = !!definition &&
            definition.render.region === region &&
            (hideVisibleText == null || shouldRenderAsFlattenedHtml(definition, hideVisibleText));
        if (shouldRenderNode) {
            rendered.push(renderExplicitComponentNode(node));
            return;
        }
        for (let index = 0; index < node.children.length; index += 1) {
            walk(node.children[index]);
        }
    })(root);
    return rendered.join('');
}
function combineBounds(nodes) {
    const filtered = nodes.filter(Boolean);
    if (!filtered.length)
        return undefined;
    let left = filtered[0].bounds.x;
    let top = filtered[0].bounds.y;
    let right = filtered[0].bounds.x + filtered[0].bounds.width;
    let bottom = filtered[0].bounds.y + filtered[0].bounds.height;
    for (let index = 1; index < filtered.length; index += 1) {
        left = Math.min(left, filtered[index].bounds.x);
        top = Math.min(top, filtered[index].bounds.y);
        right = Math.max(right, filtered[index].bounds.x + filtered[index].bounds.width);
        bottom = Math.max(bottom, filtered[index].bounds.y + filtered[index].bounds.height);
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
}
function flattenedTextDeclarations(node, frameScale, extra) {
    if (!node)
        return '';
    return (0, css_1.cssDeclarations)(Object.assign({
        color: node.style.color,
        opacity: node.style.opacity,
        'font-family': node.style.fontFamily ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif' : undefined,
        'font-style': node.style.fontStyle,
        'font-size': node.style.fontSize ? (0, css_1.pxToEm)(node.style.fontSize, 16, frameScale) : undefined,
        'font-weight': node.style.fontWeight,
        'line-height': node.style.lineHeight ? (0, css_1.pxToEm)(node.style.lineHeight, 16, frameScale) : undefined,
        'letter-spacing': node.style.letterSpacing ? (0, css_1.pxToEm)(node.style.letterSpacing, 16, frameScale) : undefined,
        'text-align': node.style.textAlign,
        'text-transform': (0, css_1.textTransformFromCase)(node.style.textCase),
    }, extra || {}));
}
function flattenedBoxDeclarations(node, frameScale, extra) {
    if (!node)
        return (0, css_1.cssDeclarations)(extra || {});
    return (0, css_1.cssDeclarations)(Object.assign({
        'background-color': node.style.background,
        color: node.style.color,
        border: node.style.borderColor ? String(node.style.borderWidth || 1) + 'px solid ' + node.style.borderColor : undefined,
        'border-radius': node.style.borderRadius != null ? String(node.style.borderRadius) + 'px' : undefined,
        opacity: node.style.opacity,
        'font-family': node.style.fontFamily ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif' : undefined,
        'font-style': node.style.fontStyle,
        'font-size': node.style.fontSize ? (0, css_1.pxToEm)(node.style.fontSize, 16, frameScale) : undefined,
        'font-weight': node.style.fontWeight,
        'line-height': node.style.lineHeight ? (0, css_1.pxToEm)(node.style.lineHeight, 16, frameScale) : undefined,
        'letter-spacing': node.style.letterSpacing ? (0, css_1.pxToEm)(node.style.letterSpacing, 16, frameScale) : undefined,
        'text-align': node.style.textAlign,
        'text-transform': (0, css_1.textTransformFromCase)(node.style.textCase),
    }, extra || {}));
}
function findDescendantRoleNode(root, role) {
    if (!root)
        return undefined;
    return (0, index_1.pickBestNode)((0, index_1.findNodesByRole)(root, role, 0.1));
}
function resolveSummaryTitle(summaryNode) {
    if (!summaryNode)
        return undefined;
    for (let index = 0; index < summaryNode.children.length; index += 1) {
        const child = summaryNode.children[index];
        const text = String(child.text || (0, index_1.collectText)(child) || '').trim();
        if (!text)
            continue;
        if (!/(subtotal|discount|total|\$)/i.test(text))
            return text;
    }
    const ownText = String(summaryNode.text || '').trim();
    if (ownText && !/(subtotal|discount|total|\$)/i.test(ownText))
        return ownText;
    return undefined;
}
function buildSyntheticBounds(nodes) {
    if (!nodes.length)
        return undefined;
    const left = Math.min.apply(null, nodes.map(function (node) { return node.bounds.x; }));
    const top = Math.min.apply(null, nodes.map(function (node) { return node.bounds.y; }));
    const right = Math.max.apply(null, nodes.map(function (node) { return node.bounds.x + node.bounds.width; }));
    const bottom = Math.max.apply(null, nodes.map(function (node) { return node.bounds.y + node.bounds.height; }));
    return { x: left, y: top, width: right - left, height: bottom - top };
}
function renderFlattenedHtml(root, analysis, imageFileName, hideVisibleText) {
    const frameScale = (0, css_1.getProductionScaleForFrame)(root.bounds);
    const scaledRootWidth = (0, css_1.scalePx)(root.bounds.width, frameScale) || root.bounds.width;
    const scaledRootHeight = (0, css_1.scalePx)(root.bounds.height, frameScale) || root.bounds.height;
    const headlineNode = (0, index_1.findNormalizedNodeById)(root, analysis.headlineNodeId);
    const subtextNode = (0, index_1.findNormalizedNodeById)(root, analysis.subtextNodeId);
    const eyebrowNode = (0, index_1.findNormalizedNodeById)(root, analysis.eyebrowNodeId);
    const ctaNode = (0, index_1.findNormalizedNodeById)(root, analysis.primaryCtaNodeId);
    const productContainerNode = (0, index_1.findNormalizedNodeById)(root, analysis.productContainerNodeId);
    const productCardNodes = analysis.productCardNodeIds.map(function (id) {
        return (0, index_1.findNormalizedNodeById)(root, id);
    }).filter(Boolean);
    const summaryNode = (0, index_1.findNormalizedNodeById)(root, analysis.summaryNodeId);
    const closeCandidates = (0, index_1.findNodesByRole)(root, 'close-button', 0.35);
    const closeNode = closeCandidates
        .slice()
        .sort(function (a, b) {
        if (Math.abs(a.bounds.x - b.bounds.x) > 2)
            return b.bounds.x - a.bounds.x;
        if (Math.abs(a.bounds.y - b.bounds.y) > 2)
            return a.bounds.y - b.bounds.y;
        return (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height);
    })[0];
    const closeVisualNode = closeNode
        ? (0, index_1.flattenTree)(closeNode)
            .filter(function (node) {
            return !!(0, index_1.collectText)(node).trim() || node.type === 'VECTOR' || node.type === 'ELLIPSE';
        })
            .sort(function (a, b) {
            if (Math.abs(a.bounds.x - b.bounds.x) > 2)
                return b.bounds.x - a.bounds.x;
            if (Math.abs(a.bounds.y - b.bounds.y) > 2)
                return a.bounds.y - b.bounds.y;
            return (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height);
        })[0] || closeNode
        : undefined;
    const firstProductCard = productCardNodes[0];
    const productImageNode = findDescendantRoleNode(firstProductCard, 'image') || findDescendantRoleNode(firstProductCard, 'product-image');
    const productTitleNode = findDescendantRoleNode(firstProductCard, 'product-title');
    const productPriceNode = findDescendantRoleNode(firstProductCard, 'product-price');
    const productButtonNode = findDescendantRoleNode(firstProductCard, 'product-cta') || findDescendantRoleNode(firstProductCard, 'cta');
    const summarySubtotalNode = findDescendantRoleNode(summaryNode, 'summary-subtotal');
    const summaryDiscountNode = findDescendantRoleNode(summaryNode, 'summary-discount');
    const summaryTotalNode = findDescendantRoleNode(summaryNode, 'summary-total');
    const productBounds = productContainerNode ? productContainerNode.bounds : buildSyntheticBounds(productCardNodes);
    const mainBounds = combineBounds([eyebrowNode, headlineNode, subtextNode, ctaNode]);
    const headlineText = analysis.schema.headline || (headlineNode ? (0, index_1.collectText)(headlineNode) : '');
    const eyebrowText = (() => {
        const value = analysis.schema.eyebrow || (eyebrowNode ? (0, index_1.collectText)(eyebrowNode) : '');
        if (!value)
            return '';
        if (/\$|subtotal|discount|total/i.test(value))
            return '';
        return value;
    })();
    const subtextText = analysis.schema.subtext || (subtextNode ? (0, index_1.collectText)(subtextNode) : '');
    const ctaLabel = analysis.schema.primaryCta && analysis.schema.primaryCta.label ? analysis.schema.primaryCta.label : ctaNode ? (0, index_1.collectText)(ctaNode) : 'Redeem Now';
    const eyebrowDefinition = eyebrowNode ? componentDefinitionForNode(eyebrowNode) : constants_1.COMPONENT_BY_ROLE.eyebrow;
    const headlineDefinition = headlineNode ? componentDefinitionForNode(headlineNode) : constants_1.COMPONENT_BY_ROLE.headline;
    const subtextDefinition = subtextNode ? componentDefinitionForNode(subtextNode) : constants_1.COMPONENT_BY_ROLE.subtext;
    const showEyebrowInVariant = hideVisibleText ? false : shouldRenderAsFlattenedHtml(eyebrowDefinition, hideVisibleText);
    const showHeadlineInVariant = hideVisibleText ? false : shouldRenderAsFlattenedHtml(headlineDefinition, hideVisibleText);
    const showSubtextInVariant = hideVisibleText ? false : shouldRenderAsFlattenedHtml(subtextDefinition, hideVisibleText);
    const eyebrowClass = showEyebrowInVariant ? 'usi_eyebrow' : 'usi_eyebrow usi_sr_only';
    const headlineClass = showHeadlineInVariant ? 'usi_headline' : 'usi_headline usi_sr_only';
    const subtextClass = showSubtextInVariant ? 'usi_subtext' : 'usi_subtext usi_sr_only';
    const ctaDefinition = ctaNode ? componentDefinitionForNode(ctaNode) : constants_1.COMPONENT_BY_ROLE.cta;
    const showCtaInVariant = !!(ctaNode || analysis.schema.primaryCta) && shouldRenderInFlattened(ctaDefinition, hideVisibleText);
    const ctaInnerHtml = showCtaInVariant ? (0, string_1.escapeHtml)(ctaLabel) : '';
    const summaryTitle = resolveSummaryTitle(summaryNode);
    const hasProducts = !!analysis.schema.products.length && !!productCardNodes.length && !!productBounds;
    const hasSummary = !!analysis.schema.summary && !!summaryNode;
    const hasEmailInput = hasInsertedComponent(root, 'email_input');
    const hasPhoneInput = hasInsertedComponent(root, 'phone_input');
    const hasSurvey = hasInsertedComponent(root, 'survey_block');
    const hasCoupon = hasInsertedComponent(root, 'copy_coupon');
    const hasOptin = hasInsertedComponent(root, 'optin_component') && shouldRenderInFlattened(constants_1.COMPONENT_BY_ID.optin_component, hideVisibleText);
    const hasCountdown = hasInsertedComponent(root, 'countdown_timer');
    const hasProgress = hasInsertedComponent(root, 'progress_bar');
    const hasMediaPanel = hasInsertedComponent(root, 'media_panel');
    const hasSecondaryCta = hasInsertedComponent(root, 'no_thanks_button');
    const productGap = productCardNodes.length > 1 && productBounds
        ? productCardNodes.slice(1).reduce(function (sum, card, index) {
            const previous = productCardNodes[index];
            return sum + Math.max(0, card.bounds.x - (previous.bounds.x + previous.bounds.width));
        }, 0) / (productCardNodes.length - 1)
        : 0;
    const gridColumns = Math.max(1, Math.min(productCardNodes.length || analysis.schema.products.length || 1, 3));
    const previewProductHtml = analysis.schema.products.length
        ? analysis.schema.products.map(function (product, index) {
            const fallbackTitle = (0, string_1.escapeHtml)(product.title || 'Product Name');
            const fallbackPrice = (0, string_1.escapeHtml)(product.price || '$XX.XX');
            const fallbackButton = (0, string_1.escapeHtml)(product.cta || 'View item');
            return ('<article class="usi_product_card usi_product usi_product' + (index + 1) + '">' +
                '<div class="usi_product_image"><img src="' + PRODUCT_PLACEHOLDER_IMAGE + '" alt="' + fallbackTitle + '" /></div>' +
                '<div class="usi_product_body"><h3 class="usi_product_title">' + fallbackTitle + '</h3><p class="usi_product_price">' + fallbackPrice + '</p><button class="usi_product_cta" type="button">' + fallbackButton + '</button></div>' +
                '</article>');
        }).join('')
        : '';
    const runtimeProductHtml = analysis.schema.products.length
        ? analysis.schema.products.map(function (product, index) {
            const fallbackTitle = (0, string_1.escapeHtml)(product.title || 'Product Name');
            const fallbackPrice = (0, string_1.escapeHtml)(product.price || '$XX.XX');
            const fallbackButton = (0, string_1.escapeHtml)(product.cta || 'View item');
            return ('<article class="usi_product_card usi_product usi_product' + (index + 1) + '">' +
                '<div class="usi_product_image"><img src="${usi_cookies.get(\'usi_prod_image_' + (index + 1) + '\') || \'' + PRODUCT_PLACEHOLDER_IMAGE + '\'}" alt="${usi_js.escape_quotes(usi_cookies.get(\'usi_prod_name_' + (index + 1) + '\') || \'' + fallbackTitle.replace(/'/g, '&#39;') + '\')}" /></div>' +
                '<div class="usi_product_body"><h3 class="usi_product_title">${usi_js.escape_quotes(usi_cookies.get(\'usi_prod_name_' + (index + 1) + '\') || \'' + fallbackTitle.replace(/'/g, '&#39;') + '\')}</h3><p class="usi_product_price">' + fallbackPrice + '</p><button class="usi_product_cta" type="button">' + fallbackButton + '</button></div>' +
                '</article>');
        }).join('')
        : '';
    const previewSummaryHtml = hasSummary
        ? '<section class="usi_summary" aria-label="Cart summary">' + (summaryTitle ? '<h2 class="usi_summary_title">' + (0, string_1.escapeHtml)(summaryTitle) + '</h2>' : '') + '<div class="usi_summary_row usi_price"><span class="usi_label">Subtotal:</span><strong class="usi_value">$XX.XX</strong></div><div class="usi_summary_row usi_discount"><span class="usi_label">Discount:</span><strong class="usi_value">- $XX.XX</strong></div><div class="usi_summary_row usi_new_price"><span class="usi_label">Total:</span><strong class="usi_value">$XX.XX</strong></div></section>'
        : '';
    const runtimeSummaryHtml = hasSummary
        ? '<section class="usi_summary" aria-label="Cart summary">' + (summaryTitle ? '<h2 class="usi_summary_title">' + (0, string_1.escapeHtml)(summaryTitle) + '</h2>' : '') + '<div class="usi_summary_row usi_price"><span class="usi_label">Subtotal:</span><strong class="usi_value">$${usi_js.product.subtotal}</strong></div><div class="usi_summary_row usi_discount"><span class="usi_label">Discount:</span><strong class="usi_value">- $${usi_js.product.discount}</strong></div><div class="usi_summary_row usi_new_price"><span class="usi_label">Total:</span><strong class="usi_value">$${usi_js.product.new_price}</strong></div></section>'
        : '';
    const flattenedExcludedIds = [analysis.eyebrowNodeId, analysis.headlineNodeId, analysis.subtextNodeId, analysis.primaryCtaNodeId, analysis.summaryNodeId].concat(analysis.productCardNodeIds).filter(Boolean);
    const flattenedExtraMainHtml = renderExtraRegionNodes(root, 'main', flattenedExcludedIds, hideVisibleText);
    const flattenedExtraAsideHtml = renderExtraRegionNodes(root, 'aside', flattenedExcludedIds, hideVisibleText);
    const flattenedExtraUtilityHtml = renderExtraRegionNodes(root, 'utility', flattenedExcludedIds, hideVisibleText);
    const previewContentHtml = (closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : '') + '<section class="usi_main">' + (eyebrowText ? '<p class="' + eyebrowClass + '">' + (0, string_1.escapeHtml)(eyebrowText) + '</p>' : '') + (headlineText ? '<h1 class="' + headlineClass + '">' + (0, string_1.escapeHtml)(headlineText) + '</h1>' : '') + (subtextText ? '<p class="' + subtextClass + '">' + (0, string_1.escapeHtml)(subtextText) + '</p>' : '') + (showCtaInVariant ? '<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="' + (0, string_1.escapeHtml)(ctaLabel) + '">' + ctaInnerHtml + '</button>' : '') + flattenedExtraMainHtml + flattenedExtraUtilityHtml + '</section>' + ((hasProducts || flattenedExtraAsideHtml) ? '<section class="usi_aside">' + (hasProducts ? '<section class="usi_products usi_products_grid">' + previewProductHtml + '</section>' : '') + flattenedExtraAsideHtml + '</section>' : '') + previewSummaryHtml;
    const runtimeContentHtml = (closeNode ? '<button type="button" id="usi_close" aria-label="Close">×</button>' : '') + '<section class="usi_main">' + (eyebrowText ? '<p class="' + eyebrowClass + '">' + (0, string_1.escapeHtml)(eyebrowText) + '</p>' : '') + (headlineText ? '<h1 class="' + headlineClass + '">' + (0, string_1.escapeHtml)(headlineText) + '</h1>' : '') + (subtextText ? '<p class="' + subtextClass + '">' + (0, string_1.escapeHtml)(subtextText) + '</p>' : '') + (showCtaInVariant ? '<button class="usi_primary_cta usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="' + (0, string_1.escapeHtml)(ctaLabel) + '">' + ctaInnerHtml + '</button>' : '') + flattenedExtraMainHtml + flattenedExtraUtilityHtml + '</section>' + ((hasProducts || flattenedExtraAsideHtml) ? '<section class="usi_aside">' + (hasProducts ? '<section class="usi_products usi_products_grid">' + runtimeProductHtml + '</section>' : '') + flattenedExtraAsideHtml + '</section>' : '') + runtimeSummaryHtml;
    const formattedPreviewContentHtml = (0, string_1.formatHtml)(previewContentHtml).trim();
    const formattedRuntimeContentHtml = (0, string_1.formatHtml)(runtimeContentHtml).trim();
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Legacy flattened export</title><link rel="stylesheet" href="css/' + (hideVisibleText ? 'flattened_text_baked.css' : 'flattened_live_text.css') + '" /></head><body><div id="usi_container"><div id="usi_display" role="alertdialog" aria-label="' + (0, string_1.escapeHtml)(headlineText || 'Preview') + '" aria-modal="true" class="usi_display usi_show_css usi_shadow" style="width:' + scaledRootWidth + 'px;height:' + scaledRootHeight + 'px;"><div id="usi_content">' + previewContentHtml + '</div><div id="usi_background"><img src="' + (0, string_1.escapeHtml)(imageFileName) + '" aria-hidden="true" alt="' + (0, string_1.escapeHtml)(headlineText || 'Preview') + '" id="usi_background_img" style="width:100%;height:100%;" /></div></div></div></body></html>';
    const productCardCss = productCardNodes.map(function (card, index) {
        const imageNode = (0, index_1.findNormalizedNodeById)(card, (0, index_1.findImageNodeId)(card));
        const imageRule = imageNode ? '.usi_product' + (index + 1) + ' .usi_product_image {\n  width: 100%;\n  height: ' + (0, css_1.toPercent)(imageNode.bounds.height, card.bounds.height) + ';\n  margin-left: 0;\n  margin-top: ' + (0, css_1.toPercent)(imageNode.bounds.y - card.bounds.y, card.bounds.height) + ';\n}\n' : '';
        return '.usi_product' + (index + 1) + ' {\n  width: 100%;\n  max-width: 100%;\n  min-width: 0;\n}\n' + imageRule;
    }).join('');
    const componentCss = [
        hasEmailInput ? '.usi_field {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n}\n.usi_field_input {\n  width: 100%;\n  padding: 0.875em 1em;\n  border: 1px solid #d0d0d0;\n  background: #fff;\n  color: #111;\n}\n' : '',
        hasPhoneInput ? '' : '',
        hasSurvey ? '.usi_survey {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75em;\n}\n.usi_survey_options {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n}\n.usi_survey_option {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n' : '',
        hasCoupon ? '.usi_coupon {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.75em;\n  align-items: center;\n}\n.usi_coupon_code {\n  padding: 0.75em 1em;\n  border: 1px solid #222;\n  background: #fff;\n  font-weight: 700;\n}\n.usi_coupon_button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n' : '',
        hasOptin ? '.usi_optin {\n  display: flex;\n  gap: 0.625em;\n  align-items: center;\n}\n.usi_optin_input {\n  appearance: none;\n  -webkit-appearance: none;\n  width: 1.125em;\n  height: 1.125em;\n  border: 1px solid currentColor;\n  background: #fff;\n  flex: 0 0 auto;\n}\n.usi_optin_label {\n  display: inline-block;\n}\n' : '',
        hasCountdown ? '.usi_countdown {\n  display: inline-flex;\n  padding: 0.625em 0.875em;\n  background: #1f1f1f;\n  color: #fff;\n  font-weight: 700;\n}\n' : '',
        hasProgress ? '.usi_progress {\n  width: 100%;\n  height: 0.75em;\n  background: #ddd;\n  border-radius: 999px;\n  overflow: hidden;\n}\n.usi_progress_fill {\n  width: 55%;\n  height: 100%;\n  background: #222;\n}\n' : '',
        hasMediaPanel ? '.usi_media_panel {\n  width: 100%;\n  min-height: 8em;\n  background: #d9d9d9;\n}\n' : '',
        hasSecondaryCta ? '.usi_secondary_cta {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  cursor: pointer;\n}\n' : '',
    ].join('');
    const textRegionCss = [
        headlineText && headlineNode && mainBounds ? '.usi_headline {\n  position: absolute;\n  left: ' + (0, css_1.toPercent)(headlineNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + (0, css_1.toPercent)(headlineNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + (0, css_1.toPercent)(headlineNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(headlineNode, frameScale, { 'white-space': 'pre-wrap' }) + ';\n}\n' : '',
        eyebrowText && eyebrowNode && mainBounds ? '.usi_eyebrow {\n  position: absolute;\n  left: ' + (0, css_1.toPercent)(eyebrowNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + (0, css_1.toPercent)(eyebrowNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + (0, css_1.toPercent)(eyebrowNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(eyebrowNode, frameScale, { 'white-space': 'pre-wrap' }) + ';\n}\n' : '',
        subtextText && subtextNode && mainBounds ? '.usi_subtext {\n  position: absolute;\n  left: ' + (0, css_1.toPercent)(subtextNode.bounds.x - mainBounds.x, mainBounds.width) + ';\n  top: ' + (0, css_1.toPercent)(subtextNode.bounds.y - mainBounds.y, mainBounds.height) + ';\n  width: ' + (0, css_1.toPercent)(subtextNode.bounds.width, mainBounds.width) + ';\n  white-space: pre-wrap;\n  ' + flattenedTextDeclarations(subtextNode, frameScale, { 'white-space': 'pre-wrap' }) + ';\n}\n' : '',
    ].join('');
    const css = '* { box-sizing: border-box; }\nhtml { font-size: 16px; }\nbody { margin: 0; background: #efefef; font-family: Inter, Arial, sans-serif; }\n' +
        '.usi_display { left:50%; margin-left:-' + String(scaledRootWidth / 2) + 'px; top:0px; width:' + scaledRootWidth + 'px; height:' + scaledRootHeight + 'px; }\n' +
        '.usi_display * { padding:0; margin:0; color:#000000; font-weight:normal; font-size:12pt; text-decoration:none; line-height:1.2; box-shadow:none; border:none; outline:none; text-align:left; font-family: Helvetica, Arial, sans-serif; float:none; }\n' +
        '.usi_quickide_css { display:none; visibility:hidden; }\n#usi_container {\n  width: 100%;\n}\n#usi_display {\n  position: relative;\n  display: block;\n  left: 50%;\n  margin-left: -' + String(scaledRootWidth / 2) + 'px;\n  top: 0px;\n  width: ' + scaledRootWidth + 'px;\n  height: ' + scaledRootHeight + 'px;\n  font-size: 16px;\n}\n.usi_shadow {\n  box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.33);\n}\n#usi_content {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  z-index: 2000000200;\n}\n#usi_background {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  z-index: 2000000100;\n}\n#usi_background_img {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n' +
        '#usi_close { position:absolute;left:' + (closeVisualNode ? (0, css_1.toPercent)(closeVisualNode.bounds.x - root.bounds.x, root.bounds.width) : '95%') + ';top:' + (closeVisualNode ? (0, css_1.toPercent)(closeVisualNode.bounds.y - root.bounds.y, root.bounds.height) : '2%') + ';width:' + (closeVisualNode ? (0, css_1.toPercent)(closeVisualNode.bounds.width, root.bounds.width) : '3%') + ';height:' + (closeVisualNode ? (0, css_1.toPercent)(closeVisualNode.bounds.height, root.bounds.height) : '3%') + ';z-index:2000000300;cursor:pointer;padding:0;margin:0;display:block;overflow:hidden;text-indent:-9999px;' + (flattenedBoxDeclarations(closeVisualNode || closeNode, frameScale, { background: 'none', border: 'none' }) || 'background:none;border:none;') + '; }\n' +
        '#usi_close::before { content:"×"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-indent:0; ' + (flattenedTextDeclarations(closeVisualNode || closeNode, frameScale, { background: 'transparent', border: 'none', 'text-align': 'center', 'line-height': '1' }) || 'background:transparent;border:none;text-align:center;line-height:1;') + '; }\n' +
        'button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus { cursor:pointer; }\n' +
        '.usi_main {\n  position: absolute;\n  left: ' + (hasProducts || hasSummary ? (mainBounds ? (0, css_1.toPercent)(mainBounds.x - root.bounds.x, root.bounds.width) : '0%') : '0%') + ';\n  top: ' + (hasProducts || hasSummary ? (mainBounds ? (0, css_1.toPercent)(mainBounds.y - root.bounds.y, root.bounds.height) : '0%') : '0%') + ';\n  width: ' + (hasProducts || hasSummary ? (mainBounds ? (0, css_1.toPercent)(mainBounds.width, root.bounds.width) : '100%') : '100%') + ';\n  height: ' + (!hasProducts && !hasSummary ? '100%' : (mainBounds ? (0, css_1.toPercent)(mainBounds.height, root.bounds.height) : '100%')) + ';\n}\n' +
        textRegionCss +
        (hasProducts ? '.usi_products {\n  position: absolute;\n  left: ' + (productBounds ? (0, css_1.toPercent)(productBounds.x - root.bounds.x, root.bounds.width) : '0%') + ';\n  top: ' + (productBounds ? (0, css_1.toPercent)(productBounds.y - root.bounds.y, root.bounds.height) : '0%') + ';\n  width: ' + (productBounds ? (0, css_1.toPercent)(productBounds.width, root.bounds.width) : '100%') + ';\n  min-height: ' + (productBounds ? (0, css_1.toPercent)(productBounds.height, root.bounds.height) : '0%') + ';\n  display: grid;\n  grid-template-columns: repeat(' + ((productBounds && productBounds.width < productBounds.height * 0.9) ? 1 : gridColumns) + ', minmax(0, 1fr));\n  gap: ' + (productBounds && productGap ? (0, css_1.toPercent)(productGap, productBounds.width) : '2%') + ';\n  align-items: start;\n}\n.usi_product {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0.75em;\n  padding: 0.9em;\n  min-width: 0;\n  ' + (flattenedBoxDeclarations(firstProductCard, frameScale, { width: '100%', 'max-width': '100%', 'min-width': '0' }) || 'width: 100%; max-width: 100%;') + ';\n}\n.usi_product_image {\n  position: relative;\n  display: block;\n  width: 100%;\n  overflow: hidden;\n  ' + (flattenedBoxDeclarations(productImageNode, frameScale, { width: '100%' }) || 'width: 100%;') + ';\n}\n.usi_product_image img {\n  display: block;\n  width: 100%;\n  height: 100%;\n  object-fit: contain;\n}\n.usi_product_body {\n  display: flex;\n  flex-direction: column;\n  gap: 0.35em;\n  min-width: 0;\n}\n.usi_product_title {\n  margin: 0;\n  white-space: pre-wrap;\n  ' + (flattenedTextDeclarations(productTitleNode, frameScale, { 'white-space': 'pre-wrap', 'background-color': 'transparent', border: 'none' }) || 'font-weight: 700;') + ';\n}\n.usi_product_price {\n  margin: 0;\n  ' + (flattenedTextDeclarations(productPriceNode, frameScale) || '') + ';\n}\n.usi_product_cta {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75em 1em;\n  ' + (flattenedBoxDeclarations(productButtonNode, frameScale, { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', color: '#ffffff' }) || 'border: 1px solid currentColor; background: transparent; color:#ffffff;') + ';\n}\n' + productCardCss : '') +
        (hasSummary ? '.usi_summary {\n  position: absolute;\n  left: ' + (summaryNode ? (0, css_1.toPercent)(summaryNode.bounds.x - root.bounds.x, root.bounds.width) : '12%') + ';\n  top: ' + (summaryNode ? (0, css_1.toPercent)(summaryNode.bounds.y - root.bounds.y, root.bounds.height) : '59%') + ';\n  width: ' + (summaryNode ? (0, css_1.toPercent)(summaryNode.bounds.width, root.bounds.width) : '76%') + ';\n  padding: 1em;\n  display: flex;\n  flex-direction: column;\n  gap: 0.5em;\n  ' + (flattenedBoxDeclarations(summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n.usi_summary_title {\n  margin: 0 0 0.5em;\n  white-space: pre-wrap;\n  ' + (flattenedTextDeclarations(summaryNode, frameScale, { 'font-size': '1em', 'font-weight': 700, 'white-space': 'pre-wrap' }) || 'font-weight: 700; font-size: 1em;') + ';\n}\n.usi_summary_row {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 1em;\n  align-items: start;\n  font-size: 1em;\n}\n.usi_price {\n  ' + (flattenedTextDeclarations(summarySubtotalNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n.usi_discount {\n  ' + (flattenedTextDeclarations(summaryDiscountNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n.usi_new_price {\n  ' + (flattenedTextDeclarations(summaryTotalNode || summaryNode, frameScale, { 'font-size': '1em' }) || 'font-size: 1em;') + ';\n}\n.usi_label, .usi_value {\n  font-size: 1em;\n}\n.usi_new_price .usi_value, .usi_discount .usi_value, .usi_new_price strong, .usi_discount strong {\n  font-weight: 700;\n}\n' : '') +
        componentCss +
        '.usi_submitbutton {\n  position: absolute;\n  left: ' + (ctaNode ? (0, css_1.toPercent)(ctaNode.bounds.x - root.bounds.x, root.bounds.width) : '12%') + ';\n  top: ' + (ctaNode ? (0, css_1.toPercent)(ctaNode.bounds.y - root.bounds.y, root.bounds.height) : '77%') + ';\n  width: ' + (ctaNode ? (0, css_1.toPercent)(ctaNode.bounds.width, root.bounds.width) : '76%') + ';\n  min-height: ' + (ctaNode ? (0, css_1.toPercent)(ctaNode.bounds.height, root.bounds.height) : '15.5%') + ';\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n' + (flattenedBoxDeclarations(ctaNode, frameScale, { display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'background-color': ctaNode && ctaNode.style.background ? ctaNode.style.background : '#1f1f1f', color: ctaNode && ctaNode.style.color ? ctaNode.style.color : '#ffffff', 'text-align': ctaNode && ctaNode.style.textAlign ? ctaNode.style.textAlign : 'center' })) + '}\n.usi_sr_only {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  padding: 0 !important;\n  margin: -1px !important;\n  overflow: hidden !important;\n  clip: rect(0, 0, 0, 0) !important;\n  white-space: nowrap !important;\n  border: 0 !important;\n}\n';
    const js = buildPriceRuntimeSetup(hasSummary) + 'usi_js.click_cta = () => {\n  try {\n    usi_js.deep_link();\n  } catch (err) {\n    usi_commons.report_error(err);\n  }\n};\n\nusi_js.display_vars.p1_html = `\n' + (0, string_1.escapeTemplateString)(formattedRuntimeContentHtml) + '\n`;\n';
    return {
        html: (0, string_1.formatHtml)(html),
        css: (0, string_1.formatCss)(css),
        imageFileName: imageFileName,
        js: js,
        contentHtml: formattedPreviewContentHtml,
        runtimeContentHtml: formattedRuntimeContentHtml,
    };
}
function buildUsiJsFile(pages) {
    const needsPriceRuntime = pages.some(function (page) {
        return !!page.analysis.schema.summary;
    });
    const assignments = pages
        .map(function (page) {
        return ('usi_js.display_vars.' +
            page.key +
            '_html = `\n' +
            (0, string_1.escapeTemplateString)(page.variant.runtimeContentHtml || page.variant.contentHtml) +
            '\n`;\n');
    })
        .join('\n');
    return (buildPriceRuntimeSetup(needsPriceRuntime) +
        'usi_js.click_cta = () => {\n' +
        '  try {\n' +
        '    usi_js.deep_link();\n' +
        '  } catch (err) {\n' +
        '    usi_commons.report_error(err);\n' +
        '  }\n' +
        '};\n\n' +
        assignments);
}
}
};
var cache = {};
function normalize(parts){
  var out=[];
  for(var i=0;i<parts.length;i+=1){
    var part=parts[i];
    if(!part||part==="."){continue;}
    if(part===".."){out.pop();}else{out.push(part);}
  }
  return out.join("/");
}
function dirname(id){
  var parts=id.split("/");
  parts.pop();
  return parts.join("/");
}
function resolve(fromId, request){
  if(request.slice(0,2)!=="./"&&request.slice(0,3)!=="../"){return request;}
  var fromDir=dirname(fromId);
  var joined=(fromDir?fromDir+"/":"")+request;
  var full=normalize(joined.split("/"));
  if(modules[full]){return full;}
  if(modules[full+"/index"]){return full+"/index";}
  if(modules[full.replace(/\.js$/,"")]){return full.replace(/\.js$/,"");}
  if(modules[full.replace(/\.js$/,"")+"/index"]){return full.replace(/\.js$/,"")+"/index";}
  return full;
}
function load(id){
  if(cache[id]){return cache[id].exports;}
  if(!modules[id]){throw new Error("Module not found: "+id);}
  var module={exports:{}};
  cache[id]=module;
  modules[id](function(request){return load(resolve(id, request));}, module, module.exports);
  return module.exports;
}
load("main");
})();
