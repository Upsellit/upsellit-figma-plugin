(function(){
var modules = {
"main": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const index_1 = require("./figma/index");
const packaging_1 = require("./render/packaging");
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
    if (msg.type === 'export-campaigns') {
        const roots = (0, index_1.getExportRoots)(figma.currentPage.selection, figma.currentPage);
        if (!roots.length) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Select one exportable node, or leave nothing selected to export all top-level frames on the current page.',
            });
            return;
        }
        try {
            const payload = await (0, packaging_1.buildExport)(roots);
            figma.ui.postMessage({
                type: 'package-ready',
                payload: payload,
            });
        }
        catch (error) {
            figma.ui.postMessage({
                type: 'error',
                message: error && error.message ? String(error.message) : 'Export failed.',
            });
        }
    }
};
},
"constants": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPONENT_BY_ROLE = exports.COMPONENT_BY_ID = exports.COMPONENT_ROLE_MAP = exports.COMMON_COMPONENTS = exports.MOBILE_WIDTH_THRESHOLD = void 0;
exports.MOBILE_WIDTH_THRESHOLD = 560;
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
        fallbackText: "We use your information in accordance with our <a href=\"#\">Privacy Policy</a>."
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
__exportStar(require("./analyze"), exports);
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
exports.ASSET_VARIABLE_COLLECTION_NAME = exports.ASSET_LIBRARY_PAGE_NAME = void 0;
exports.ensureAssetThemeVariables = ensureAssetThemeVariables;
exports.getAssetThemeSnapshot = getAssetThemeSnapshot;
exports.applyThemeSnapshot = applyThemeSnapshot;
exports.bindColorVariable = bindColorVariable;
exports.bindUniformRadius = bindUniformRadius;
exports.applyThemeFont = applyThemeFont;
exports.applyThemeText = applyThemeText;
exports.ASSET_LIBRARY_PAGE_NAME = 'Upsellit Asset Source';
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
                frame.resize(320, 800);
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
            node = await createTextLayer('Disclaimer', 'We use your information in accordance with our<a href="#">Privacy Policy</a>.', 10, 320);
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
async function findAssetLibraryPage() {
    await figma.loadAllPagesAsync();
    for (let index = 0; index < figma.root.children.length; index += 1) {
        const child = figma.root.children[index];
        if ((0, shared_1.isPageNode)(child) && child.name === theme_2.ASSET_LIBRARY_PAGE_NAME)
            return child;
    }
    return undefined;
}
async function findAssetSourceComponentNode(componentId) {
    const page = await findAssetLibraryPage();
    if (!page)
        return undefined;
    await page.loadAsync();
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
    const sourceNode = await findAssetSourceComponentNode(componentId);
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
"figma/analyze": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRole = normalizeRole;
exports.normalizeComponent = normalizeComponent;
exports.normalizeNode = normalizeNode;
exports.analyzeSelection = analyzeSelection;
const constants_1 = require("../constants");
const constants_2 = require("../constants");
const export_1 = require("./export");
const tree_1 = require("../utils/tree");
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
    const meta = (0, export_1.getPluginMeta)(node);
    const ignored = /^(1|true|yes)$/i.test(meta.exportIgnore || '');
    const componentOverride = normalizeComponent(meta.exportComponent);
    const roleOverride = normalizeRole(meta.exportRole) || (componentOverride ? constants_2.COMPONENT_ROLE_MAP[componentOverride] : undefined);
    const children = (0, export_1.getNodeChildren)(node)
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
        text: (0, export_1.extractNodeText)(node),
        bounds: (0, export_1.getBounds)(node),
        layout: {
            mode: node.layoutMode || 'NONE',
            wrap: !!node.layoutWrap && node.layoutWrap !== 'NO_WRAP',
            gap: typeof node.itemSpacing === 'number' ? node.itemSpacing : 0,
            padding: {
                top: (0, export_1.getPaddingValue)(node, 'paddingTop'),
                right: (0, export_1.getPaddingValue)(node, 'paddingRight'),
                bottom: (0, export_1.getPaddingValue)(node, 'paddingBottom'),
                left: (0, export_1.getPaddingValue)(node, 'paddingLeft'),
            },
            primaryAlign: String(node.primaryAxisAlignItems || 'MIN'),
            counterAlign: String(node.counterAxisAlignItems || 'MIN'),
            widthMode: (0, export_1.getSizingMode)(node, 'horizontal'),
            heightMode: (0, export_1.getSizingMode)(node, 'vertical'),
        },
        style: (0, export_1.extractNodeStyle)(node),
        children: children,
        detectedRole: roleOverride || 'other',
        roleConfidence: roleOverride ? 1 : 0,
        metadata: meta,
    };
}
function firstNodeText(root, role) {
    const node = (0, tree_1.findNodesByRole)(root, role, 0)[0];
    return node ? (0, tree_1.collectText)(node) || node.text : undefined;
}
function findProductListContainer(root) {
    const explicitCollection = (0, tree_1.flattenTree)(root).find(function (node) {
        return !node.ignored && String(node.collection || '').toLowerCase() === 'products';
    });
    if (explicitCollection)
        return explicitCollection;
    return (0, tree_1.findNodesByRole)(root, 'product-list', 0)[0];
}
function findProductCards(root, container) {
    if (container) {
        return (0, tree_1.sortByPosition)((0, tree_1.flattenTree)(container).filter(function (node) {
            return !node.ignored && node.detectedRole === 'product-card';
        }));
    }
    return (0, tree_1.findNodesByRole)(root, 'product-card', 0);
}
function collectDynamicNodeIds(root) {
    return (0, tree_1.uniqueIds)((0, tree_1.flattenTree)(root)
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
    const rowNodes = (0, tree_1.sortByPosition)((0, tree_1.flattenTree)(node).filter(function (child) {
        return (child.detectedRole === 'summary-subtotal' ||
            child.detectedRole === 'summary-discount' ||
            child.detectedRole === 'summary-total');
    }));
    for (let index = 0; index < rowNodes.length; index += 1) {
        const rowNode = rowNodes[index];
        const role = rowNode.detectedRole;
        const text = (0, tree_1.collectText)(rowNode);
        const valueMatch = text.match(/-?\$[\d,.Xx]+/);
        if (role === 'summary-subtotal')
            rows.push({ label: 'subtotal', value: valueMatch ? valueMatch[0] : text });
        if (role === 'summary-discount')
            rows.push({ label: 'discount', value: valueMatch ? valueMatch[0] : text });
        if (role === 'summary-total')
            rows.push({ label: 'total', value: valueMatch ? valueMatch[0] : text });
    }
    if (!rows.length) {
        const text = (0, tree_1.collectText)(node);
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
    return (0, tree_1.findNodesByRole)(root, 'summary', 0)[0];
}
function buildSummary(root) {
    const summaryNode = findSummaryNode(root);
    return summaryNode ? parseSummaryText(summaryNode) : undefined;
}
function findPrimaryCtaNode(root, productContainer) {
    return (0, tree_1.findNodesByRole)(root, 'cta', 0).find(function (node) {
        if (!productContainer)
            return true;
        return !(0, tree_1.flattenTree)(productContainer).some(function (child) {
            return child.id === node.id;
        });
    });
}
function buildPrimaryCta(root, productContainer) {
    const node = findPrimaryCtaNode(root, productContainer);
    if (!node)
        return undefined;
    return {
        label: (0, tree_1.collectText)(node) || node.text || 'Continue',
    };
}
function findDisclaimerText(root) {
    return firstNodeText(root, 'disclaimer');
}
function findDisclaimerNode(root) {
    return (0, tree_1.findNodesByRole)(root, 'disclaimer', 0)[0];
}
function resolvePattern(root, productCount, hasSummary) {
    const hasWideProducts = !!(0, tree_1.findNodesByRole)(root, 'product-list', 0)[0];
    if (hasSummary && productCount > 0)
        return 'cart_recovery_split';
    if (productCount > 1 && hasWideProducts)
        return 'grid';
    return productCount > 1 ? 'carousel' : 'single';
}
function collectWarnings() {
    const warnings = [];
    return warnings;
}
function buildProduct(card) {
    const descendants = (0, tree_1.flattenTree)(card);
    const titleNode = descendants.find(function (node) {
        return node.detectedRole === 'product-title';
    });
    const subtitleNode = descendants.find(function (node) {
        return node.detectedRole === 'product-subtitle';
    });
    const priceNode = descendants.find(function (node) {
        return node.detectedRole === 'product-price';
    });
    const ctaNode = descendants.find(function (node) {
        return node.detectedRole === 'product-cta';
    });
    return {
        title: titleNode ? (0, tree_1.collectText)(titleNode) : undefined,
        subtitle: subtitleNode ? (0, tree_1.collectText)(subtitleNode) : undefined,
        price: priceNode ? (0, tree_1.collectText)(priceNode) : undefined,
        cta: ctaNode ? (0, tree_1.collectText)(ctaNode) : undefined,
        imageAlt: titleNode ? (0, tree_1.collectText)(titleNode) : 'Product image',
        _imageNodeId: (0, tree_1.findImageNodeId)(card),
    };
}
function analyzeSelection(rootNode) {
    const ast = normalizeNode(rootNode);
    const roleMap = {};
    const nodes = (0, tree_1.flattenTree)(ast);
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
    const headlineNode = (0, tree_1.findNodesByRole)(ast, 'headline', 0)[0];
    const subtextNode = (0, tree_1.findNodesByRole)(ast, 'subtext', 0)[0];
    const eyebrowNode = (0, tree_1.findNodesByRole)(ast, 'eyebrow', 0)[0];
    const products = productCards.map(buildProduct);
    const summary = buildSummary(ast);
    const schema = {
        pattern: resolvePattern(ast, products.length, !!summary),
        layout: ast.bounds.width < constants_1.MOBILE_WIDTH_THRESHOLD ? 'mobile' : 'desktop',
        headline: headlineNode ? (0, tree_1.collectText)(headlineNode) : undefined,
        subtext: subtextNode ? (0, tree_1.collectText)(subtextNode) : undefined,
        eyebrow: eyebrowNode ? (0, tree_1.collectText)(eyebrowNode) : undefined,
        closeButton: !!(0, tree_1.findNodesByRole)(ast, 'close-button', 0)[0],
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
            warnings: collectWarnings(),
        },
        roleMap: roleMap,
        dynamicNodeIds: collectDynamicNodeIds(ast),
        headlineNodeId: headlineNode ? headlineNode.id : undefined,
        subtextNodeId: subtextNode ? subtextNode.id : undefined,
        eyebrowNodeId: eyebrowNode ? eyebrowNode.id : undefined,
        summaryNodeId: summaryNode ? summaryNode.id : undefined,
        productContainerNodeId: productContainer ? productContainer.id : undefined,
        productCardNodeIds: productCards.map(function (card) {
            return card.id;
        }),
        primaryCtaNodeId: primaryCtaNode ? primaryCtaNode.id : undefined,
        disclaimerNodeId: disclaimerNode ? disclaimerNode.id : undefined,
    };
}
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
const tree_1 = require("../utils/tree");
const analyze_1 = require("./analyze");
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
    const disclaimerIds = new Set();
    const inputIds = new Set();
    const normalizedRoot = (0, analyze_1.normalizeNode)(rootNode);
    (0, tree_1.flattenTree)(normalizedRoot).forEach(function (node) {
        if (node.componentOverride === 'disclaimer_text') {
            disclaimerIds.add(node.id);
        }
        if (node.componentOverride === 'email_input' || node.componentOverride === 'phone_input') {
            inputIds.add(node.id);
        }
    });
    const hidePaths = uniqueIds(dynamicNodeIds.concat(alwaysHiddenNodeIds).concat(Array.from(disclaimerIds)))
        .map(function (id) {
        return pathMaps.idToPath.get(id) || '';
    })
        .filter(Boolean);
    try {
        const cloneMaps = buildPathMaps(clone);
        for (const path of hidePaths) {
            const node = cloneMaps.pathToNode.get(path);
            if (!node)
                continue;
            if ('opacity' in node && typeof node.opacity === 'number') {
                node.opacity = 0;
            }
            else {
                node.visible = false;
            }
        }
        if (removeAllText) {
            walkScenePaths(clone, function (node) {
                if (node.type !== 'TEXT')
                    return;
                if ('opacity' in node && typeof node.opacity === 'number') {
                    node.opacity = 0;
                }
                else {
                    node.visible = false;
                }
            });
            // Hide all subcomponents for background-only export
            function hideChildren(node) {
                if ('children' in node && Array.isArray(node.children)) {
                    for (const child of node.children) {
                        if (child.type === 'TEXT')
                            continue; // Skip text nodes to keep them visible
                        if (inputIds.has(child.id))
                            continue; // Keep input backgrounds visible
                        if ('opacity' in child && typeof child.opacity === 'number') {
                            child.opacity = 0;
                        }
                        else {
                            child.visible = false;
                        }
                        hideChildren(child);
                    }
                }
            }
            hideChildren(clone);
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
    let inTemplate = false;
    let templateBuffer = [];
    function flushTemplateBuffer() {
        if (!templateBuffer.length)
            return;
        while (templateBuffer.length && !templateBuffer[0].trim()) {
            templateBuffer.shift();
        }
        while (templateBuffer.length && !templateBuffer[templateBuffer.length - 1].trim()) {
            templateBuffer.pop();
        }
        let minIndent = null;
        for (let index = 0; index < templateBuffer.length; index += 1) {
            const line = templateBuffer[index];
            if (!line.trim())
                continue;
            const match = line.match(/^[\t ]*/);
            const indentText = match ? match[0] : '';
            if (minIndent === null || indentText.length < minIndent) {
                minIndent = indentText.length;
            }
        }
        const stripCount = minIndent || 0;
        for (let index = 0; index < templateBuffer.length; index += 1) {
            const line = templateBuffer[index];
            out.push(stripCount > 0 ? line.slice(stripCount) : line);
        }
        templateBuffer = [];
    }
    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index].replace(/\s+$/g, '');
        const trimmed = rawLine.trim();
        if (inTemplate) {
            if (trimmed === '`' || trimmed === '`;') {
                flushTemplateBuffer();
                out.push(new Array(depth + 1).join('\t') + trimmed);
                inTemplate = false;
                continue;
            }
            templateBuffer.push(rawLine);
            continue;
        }
        if (!trimmed) {
            if (out.length && out[out.length - 1] !== '')
                out.push('');
            continue;
        }
        if (/^[}\])]/.test(trimmed) || /^}\s*catch\b/.test(trimmed) || /^}\s*else\b/.test(trimmed)) {
            depth = Math.max(0, depth - 1);
        }
        out.push(new Array(depth + 1).join('\t') + trimmed);
        const backtickCount = (trimmed.match(/`/g) || []).length;
        const opensTemplate = backtickCount % 2 === 1 && /`\s*$/.test(trimmed);
        if (opensTemplate) {
            inTemplate = true;
            continue;
        }
        const openCount = (trimmed.match(/\{/g) || []).length;
        const closeCount = (trimmed.match(/\}/g) || []).length;
        if (openCount > closeCount && !/^}/.test(trimmed)) {
            depth += openCount - closeCount;
        }
    }
    flushTemplateBuffer();
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
    return text.trim();
}
},
"utils/tree": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenTree = flattenTree;
exports.collectText = collectText;
exports.sortByPosition = sortByPosition;
exports.pickBestNode = pickBestNode;
exports.findNodesByRole = findNodesByRole;
exports.findNormalizedNodeById = findNormalizedNodeById;
exports.findImageNodeId = findImageNodeId;
exports.uniqueIds = uniqueIds;
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
function findImageNodeId(card) {
    const imageNode = flattenTree(card).find(function (node) {
        return node.detectedRole === 'product-image' || node.detectedRole === 'image';
    });
    return imageNode ? imageNode.id : undefined;
}
function uniqueIds(ids) {
    return Array.from(new Set(ids.filter(Boolean)));
}
},
"render/packaging": function(require, module, exports) {
"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExport = buildExport;
const analyze_1 = require("../figma/analyze");
const tree_1 = require("../utils/tree");
const index_1 = require("../figma/index");
const index_2 = require("./index");
const string_1 = require("../utils/string");
async function buildExportFilesForNode(rootNode, filePrefix) {
    const exportBaseName = (0, index_1.buildExportBaseName)(rootNode);
    const mockupRootFolder = 'mockups';
    const liveTextRootFolder = 'live_text_images';
    const textBakedRootFolder = 'text_baked_images';
    const nodeIndex = (0, index_1.buildNodeIndex)(rootNode);
    const analysis = (0, analyze_1.analyzeSelection)(rootNode);
    const sourceFrameName = rootNode && rootNode.name ? String(rootNode.name) : exportBaseName;
    const pageNodes = (0, index_1.getExportPageNodes)(rootNode);
    const assetTheme = await (0, index_1.getAssetThemeSnapshot)();
    const mockupAsset = await (0, index_1.exportMockupPng)(rootNode, exportBaseName + '_mockup_1x.png');
    const assets = await (0, index_1.attachProductAssets)(analysis.schema.products, nodeIndex, exportBaseName);
    const flattenedTextAssetName = exportBaseName + '.png';
    const flattenedLiveAssetName = exportBaseName + '.png';
    const flattenedTextAsset = await (0, index_1.exportFlattenedBackgroundVariant)(rootNode, (0, tree_1.uniqueIds)(analysis.dynamicNodeIds), [], false, flattenedTextAssetName, tree_1.uniqueIds);
    const flattenedLiveAsset = await (0, index_1.exportFlattenedBackgroundVariant)(rootNode, (0, tree_1.uniqueIds)(analysis.dynamicNodeIds), [], true, flattenedLiveAssetName, tree_1.uniqueIds);
    const flattenedTextVariant = (0, index_2.renderFlattenedHtml)(analysis.ast, analysis, '../' + textBakedRootFolder + '/' + flattenedTextAssetName, true);
    const flattenedLiveVariant = (0, index_2.renderFlattenedHtml)(analysis.ast, analysis, '../' + liveTextRootFolder + '/' + flattenedLiveAssetName, false);
    const pageVariants = [];
    for (let index = 0; index < pageNodes.length; index += 1) {
        const pageAnalysis = (0, analyze_1.analyzeSelection)(pageNodes[index].node);
        const pageVariant = (0, index_2.renderFlattenedHtml)(pageAnalysis.ast, pageAnalysis, '', false);
        pageVariants.push({
            key: pageNodes[index].key,
            variant: pageVariant,
            analysis: pageAnalysis,
        });
    }
    const usiJsFile = (0, index_2.buildUsiJsFile)(pageVariants);
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
    const formattedDevCss = (0, string_1.formatFileText)('devmode.css', flattenedTextVariant.css);
    const formattedDevJs = (0, string_1.formatFileText)('devmode.js', flattenedTextVariant.js);
    const previewHtml = (0, index_2.renderPreviewIndex)(previewTitle, images, {
        bakedImageHref: '../' + textBakedRootFolder + '/' + flattenedTextAssetName,
        cssSource: formattedDevCss,
        jsSource: formattedDevJs
    });
    console.log(previewHtml);
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
                productAssets: assets.map(function (asset) { return asset.name; }),
                previewPages: ['index.html', 'flattened_live_text.html', 'flattened_text_baked.html'],
                cssFiles: ['css/styles.css', 'css/flattened_live_text.css', 'css/flattened_text_baked.css'],
                jsFiles: ['js/usi_js.js', 'js/flattened_text_baked.js'],
            },
        },
    };
    console.log(result);
    return result;
}
async function buildExport(rootNodes) {
    const nodes = Array.isArray(rootNodes) ? rootNodes.filter(Boolean) : rootNodes ? [rootNodes] : [];
    if (!nodes.length) {
        throw new Error('No exportable frames found on the current page.');
    }
    if (nodes.length === 1) {
        const exportBaseName = (0, index_1.buildExportBaseName)(nodes[0]);
        const single = await buildExportFilesForNode(nodes[0], exportBaseName);
        return {
            packageFileName: (0, index_1.buildExportPackageName)(nodes),
            files: [
                {
                    name: 'index.html',
                    text: (0, string_1.formatFileText)('index.html', (0, index_2.renderMultiExportIndex)([
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
        const exportBaseName = (0, index_1.buildExportBaseName)(node);
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
        text: (0, string_1.formatFileText)('index.html', (0, index_2.renderMultiExportIndex)(exportEntries)),
    });
    if (mockupEntries.length) {
        allFiles.unshift({
            name: 'mockup_review.html',
            text: (0, string_1.formatFileText)('mockup_review.html', (0, index_2.renderMockupReviewIndex)(mockupEntries)),
        });
    }
    return {
        packageFileName: (0, index_1.buildExportPackageName)(nodes),
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
                    folder: (0, index_1.buildExportBaseName)(node),
                };
            }),
        },
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
exports.renderFlattenedHtml = exports.buildUsiJsFile = void 0;
exports.renderMultiExportIndex = renderMultiExportIndex;
exports.renderMockupReviewIndex = renderMockupReviewIndex;
__exportStar(require("./preview-pages"), exports);
const string_1 = require("../utils/string");
var flattened_1 = require("./flattened");
Object.defineProperty(exports, "buildUsiJsFile", { enumerable: true, get: function () { return flattened_1.buildUsiJsFile; } });
Object.defineProperty(exports, "renderFlattenedHtml", { enumerable: true, get: function () { return flattened_1.renderFlattenedHtml; } });
function renderMultiExportIndex(entries) {
    return (0, string_1.formatHtml)(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Export Index</title>
  <style>
    :root {
      color-scheme: light dark;
      --usi_bg:#f5f5f5;
      --usi_surface:#ffffff;
      --usi_surface_alt:#f8f8f8;
      --usi_border:#dddddd;
      --usi_text:#111111;
      --usi_muted:#555555;
      --usi_link:#0b57d0;
      --usi_media:#f8f8f8;
      --usi_nav:#eef3fd;
      --usi_nav_active:#dce8ff;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --usi_bg:#111315;
        --usi_surface:#1a1d21;
        --usi_surface_alt:#121417;
        --usi_border:#31353b;
        --usi_text:#f1f3f4;
        --usi_muted:#aab1b9;
        --usi_link:#8ab4f8;
        --usi_media:#0f1113;
        --usi_nav:#1d2633;
        --usi_nav_active:#27364a;
      }
    }

    body {
      margin:0;
      padding:24px;
      font-family:Helvetica,Arial,sans-serif;
      background:var(--usi_bg);
      color:var(--usi_text);
    }

    * { box-sizing:border-box; }
    img { max-width: 100%; }
    iframe { width: 100%; height: 600px;}
    code { white-space: pre-wrap; }


    * { box-sizing: border-box; }
    html { font-size: 16px; }
    body {
      margin: 0;
      background: rgba(0, 0, 0, 0.9);
      font-family: Inter, Arial, sans-serif;
      tab-size: 2;
    }

    .usi_export_root {
      max-width:1440px;
      margin:0 auto;
      display:flex;
      flex-direction:column;
      gap:20px;
    }

    .usi_export_header,
    .usi_export_card {
      background:var(--usi_surface);
      border:1px solid var(--usi_border);
      border-radius:16px;
      padding:20px;
    }

    .usi_export_header h1,
    .usi_export_header p,
    .usi_export_card h2 {
      margin:0 0 12px 0;
    }

    .usi_export_grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(420px,1fr));
      gap:20px;
    }

    .usi_export_card a {
      color:var(--usi_link);
      text-decoration:none;
      font-weight:700;
    }

    .usi_export_open {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:40px;
      padding:0 14px;
      border:1px solid var(--usi_border);
      border-radius:999px;
      background:var(--usi_nav);
      transition:background-color .15s ease,border-color .15s ease;
    }

    .usi_export_open:hover {
      background:var(--usi_nav_active);
      border-color:var(--usi_link);
    }

    .usi_export_card_action {
      margin-bottom:12px;
    }

    .usi_export_frame {
      height:720px;
      border:1px solid var(--usi_border);
      border-radius:12px;
      background:var(--usi_surface_alt);
      overflow:auto;
    }

    .usi_export_card iframe {
      width:100%;
      height:700px;
      border:0;
      background:#fff;
      transform-origin:0 0;
      display:block;
    }

    .usi_export_gallery {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
      gap:12px;
      margin-bottom:16px;
    }

    .usi_export_gallery figure {
      margin:0;
      display:flex;
      flex-direction:column;
      gap:6px;
    }

    .usi_export_gallery a {
      display:block;
      border:1px solid var(--usi_border);
      border-radius:10px;
      overflow:hidden;
      background:var(--usi_surface);
    }

    .usi_export_gallery img {
      display:block;
      width:100%;
      height:120px;
      object-fit:contain;
      background:var(--usi_media);
    }

    .usi_export_gallery figcaption {
      font-size:12px;
      color:var(--usi_muted);
      word-break:break-word;
    }
  </style>
</head>
<body>
  <main class="usi_export_root">
    <section class="usi_export_header">
      <h1>Export Index</h1>
      <p>Preview each exported frame below.</p>
    </section>

    <section class="usi_export_grid">
      ${entries
        .map((entry) => {
        const galleryHtml = entry.images.length
            ? `
              <div class="usi_export_gallery">
                ${entry.images
                .map((image) => `
                    <figure>
                      <a href="${image.href}" target="_blank" rel="noreferrer">
                        <img src="${image.href}" alt="${(0, string_1.escapeHtml)(image.name)}" />
                      </a>
                      <figcaption>${(0, string_1.escapeHtml)(image.name)}</figcaption>
                    </figure>
                  `)
                .join('')}
              </div>
            `
            : '';
        return `
            <article class="usi_export_card">
              <div class="usi_export_card_action">
                <a class="usi_export_open" href="${entry.href}">
                  Open ${(0, string_1.escapeHtml)(entry.name)}
                </a>
              </div>

              <h2>${(0, string_1.escapeHtml)(entry.name)}</h2>

              ${galleryHtml}

              <div class="usi_export_frame">
                <iframe
                  loading="lazy"
                  src="${entry.href}"
                  title="${(0, string_1.escapeHtml)(entry.name)}"
                ></iframe>
              </div>
            </article>
          `;
    })
        .join('')}
    </section>
  </main>
</body>
</html>
`);
}
function renderMockupReviewIndex(entries) {
    return (0, string_1.formatHtml)(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mockups</title>
  <style>
    :root {
      color-scheme: light dark;
      --usi_bg:#f5f5f5;
      --usi_surface:#ffffff;
      --usi_border:#dddddd;
      --usi_text:#111111;
      --usi_muted:#555555;
      --usi_media:#f8f8f8;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --usi_bg:#111315;
        --usi_surface:#1a1d21;
        --usi_border:#31353b;
        --usi_text:#f1f3f4;
        --usi_muted:#aab1b9;
        --usi_media:#0f1113;
      }
    }

    body {
      margin:0;
      padding:24px;
      font-family:Helvetica,Arial,sans-serif;
      background:var(--usi_bg);
      color:var(--usi_text);
    }

    * { box-sizing:border-box; }

    .usi_mockup_root {
      max-width:1480px;
      margin:0 auto;
      display:flex;
      flex-direction:column;
      gap:20px;
    }

    .usi_mockup_header,
    .usi_mockup_section {
      background:var(--usi_surface);
      border:1px solid var(--usi_border);
      border-radius:16px;
      padding:20px;
    }

    .usi_mockup_header h1,
    .usi_mockup_header p,
    .usi_mockup_section h2 {
      margin:0 0 12px 0;
    }

    .usi_mockup_gallery {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
      gap:20px;
    }

    .usi_mockup_card {
      margin:0;
      margin-bottom:3em;
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .usi_mockup_card a {
      position:relative;
      display:block;
      border:10px solid var(--usi_muted);
      border-radius:12px;
      overflow:hidden;
      background:var(--usi_surface);
      border-bottom:40px solid var(--usi_muted);
      border-top:40px solid var(--usi_muted);
      height:600px;
    }

    .usi_mockup_card img {
      display:block;
      width:100%;
      object-fit:contain;
      position:absolute;
      bottom:0;
      max-height:100%;
      object-position:right;
    }

    .usi_mockup_card figcaption {
      font-size:14px;
      color:var(--usi_muted);
      word-break:break-word;
    }

    .usi_mockup_card strong {
      display:block;
      color:var(--usi_text);
      margin-bottom:4px;
    }
  </style>
</head>
<body>
  <main class="usi_mockup_root">
    <section class="usi_mockup_header">
      <h1>Mockups</h1>
    </section>

    <section class="usi_mockup_section">
      <div class="usi_mockup_gallery">
        ${entries
        .map((entry) => `
            <figure class="usi_mockup_card">
              <a href="${entry.href}" target="_blank" rel="noreferrer">
                <img src="${entry.href}" alt="${(0, string_1.escapeHtml)(entry.name)}" />
              </a>
              <figcaption>
                <strong>${(0, string_1.escapeHtml)(entry.name)}</strong>
              </figcaption>
            </figure>
          `)
        .join('')}
      </div>
    </section>
  </main>
</body>
</html>
`);
}
},
"render/preview-pages": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPreviewIndex = renderPreviewIndex;
const string_1 = require("../utils/string");
function renderPreviewIndex(title, images, devMode) {
    const previews = [
        { name: 'Flattened Live Text', href: 'flattened_live_text.html' },
        { name: 'Flattened Text Baked', href: 'flattened_text_baked.html' },
    ];
    const cssPlaceholder = '__USI_INDEX_DEV_CSS__';
    const jsPlaceholder = '__USI_INDEX_DEV_JS__';
    const galleryHtml = images.length
        ? `
      <section class="usi_preview_gallery">
        <h2>Images</h2>
        <div class="usi_preview_gallery_grid">
          ${images
            .map((image) => `
              <figure class="usi_preview_gallery_item">
                <a href="${image.href}" target="_blank" rel="noreferrer">
                  <img src="${image.href}" alt="${(0, string_1.escapeHtml)(image.name)}" />
                </a>
                <figcaption>${(0, string_1.escapeHtml)(image.name)}</figcaption>
              </figure>
            `)
            .join('')}
        </div>
      </section>
    `
        : '';
    const shell = (0, string_1.formatHtml)(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${(0, string_1.escapeHtml)(title)} Preview</title>
  <style>
    :root {
      color-scheme: light dark;
      --usi_bg: #f5f5f5;
      --usi_surface: #ffffff;
      --usi_surface_alt: #f8f8f8;
      --usi_border: #dddddd;
      --usi_text: #111111;
      --usi_muted: #555555;
      --usi_link: #0b57d0;
      --usi_media: #f8f8f8;
      --usi_nav: #eef3fd;
      --usi_nav_active: #dce8ff;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --usi_bg: #111315;
        --usi_surface: #1a1d21;
        --usi_surface_alt: #121417;
        --usi_border: #31353b;
        --usi_text: #f1f3f4;
        --usi_muted: #aab1b9;
        --usi_link: #8ab4f8;
        --usi_media: #0f1113;
        --usi_nav: #1d2633;
        --usi_nav_active: #27364a;
      }
    }

    * {
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
    }

    body {
      margin: 0;
      padding: 24px;
      background: var(--usi_bg);
      color: var(--usi_text);
      font-family: Inter, Helvetica, Arial, sans-serif;
      tab-size: 2;
    }

    img {
      display: block;
      max-width: 100%;
    }

    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }

    textarea {
      width: 100%;
      min-height: 300px;
      padding: 12px;
      border: 1px solid var(--usi_border);
      border-radius: 8px;
      background: var(--usi_surface_alt);
      color: var(--usi_text);
      font-family: monospace;
      white-space: pre-wrap;
      resize: vertical;
    }

    .usi_preview_shell {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .usi_preview_header,
    .usi_preview_gallery,
    .usi_preview_code_card,
    .usi_preview_card {
      background: var(--usi_surface);
      border: 1px solid var(--usi_border);
      border-radius: 16px;
      padding: 20px;
    }

    .usi_preview_header h1,
    .usi_preview_header p,
    .usi_preview_gallery h2,
    .usi_preview_code_card h2,
    .usi_preview_code_card p,
    .usi_preview_card h3 {
      margin-top: 0;
    }

    .usi_preview_grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 20px;
    }

    .usi_preview_card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .usi_preview_card_action a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid var(--usi_border);
      border-radius: 999px;
      background: var(--usi_nav);
      color: var(--usi_link);
      text-decoration: none;
      font-weight: 700;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .usi_preview_card_action a:hover {
      background: var(--usi_nav_active);
      border-color: var(--usi_link);
    }

    .usi_preview_frame {
      height: 720px;
      border: 1px solid var(--usi_border);
      border-radius: 12px;
      background: var(--usi_surface_alt);
      overflow: hidden;
    }

    .usi_preview_gallery_grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .usi_preview_gallery_item {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .usi_preview_gallery_item a {
      display: block;
      border: 1px solid var(--usi_border);
      border-radius: 10px;
      overflow: hidden;
      background: var(--usi_surface);
    }

    .usi_preview_gallery_item img {
      width: 100%;
      height: 120px;
      object-fit: contain;
      background: var(--usi_media);
    }

    .usi_preview_gallery_item figcaption {
      font-size: 12px;
      color: var(--usi_muted);
      word-break: break-word;
    }

    .usi_preview_code_grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    .usi_preview_code_grid article {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .usi_preview_code_grid h3 {
      margin: 0;
    }
  </style>
</head>
<body>
  <main class="usi_preview_shell">
    <h1>${(0, string_1.escapeHtml)(title)}</h1>

    ${galleryHtml}

    <section class="usi_preview_grid">
      ${previews
        .map((preview) => `
          <article class="usi_preview_card">
            <div class="usi_preview_card_action">
              <a href="${preview.href}" target="_blank" rel="noreferrer">
                ${(0, string_1.escapeHtml)(preview.name)}
              </a>
            </div>
            <div class="usi_preview_frame">
              <iframe
                loading="lazy"
                src="${preview.href}"
                title="${(0, string_1.escapeHtml)(preview.name)}"
              ></iframe>
            </div>
          </article>
        `)
        .join('')}
    </section>

    <section class="usi_preview_code_card">
      <h2>Flattened Campaign Code</h2>
      <p>CSS and JS generated for the flattened campaign output.</p>

      <div class="usi_preview_code_grid">
        <article>
          <h3>usi_js</h3>
          <textarea>${jsPlaceholder}</textarea>
        </article>

        <article>
          <h3>CSS</h3>
          <textarea>${cssPlaceholder}</textarea>
        </article>
      </div>
    </section>
  </main>
</body>
</html>
`);
    return shell
        .replace(cssPlaceholder, (0, string_1.escapeHtml)(devMode.cssSource))
        .replace(jsPlaceholder, (0, string_1.escapeHtml)(devMode.jsSource));
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
const tree_1 = require("../utils/tree");
const PRODUCT_PLACEHOLDER_IMAGE = "https://placehold.co/600x400/EEE/31343C";
const COMPONENT_RENDERERS = {
    container: {
        renderHtml: (_node, definition) => {
            if (!definition)
                return "";
            const tag = definition.render.htmlTag;
            const className = definition.render.className;
            return `<${tag} class="${className}"></${tag}>`;
        },
        renderCss: () => "",
        shouldRender: () => true
    },
    text: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            const tag = definition.render.htmlTag;
            const className = definition.render.className;
            return `<${tag} class="${className}">${(0, string_1.escapeHtml)(text)}</${tag}>`;
        },
        renderCss: () => "",
        shouldRender: () => true
    },
    button: {
        renderHtml: (node, definition) => {
            if (!definition)
                return "";
            const text = node ? componentText(node, definition) : "";
            const className = definition.render.className;
            return `<button class="${className}" type="button">${(0, string_1.escapeHtml)(text || definition.render.buttonText || definition.label)}</button>`;
        },
        renderCss: () => "",
        shouldRender: () => true
    },
    media: {
        renderHtml: (_node, definition) => {
            if (!definition)
                return "";
            const tag = definition.render.htmlTag;
            const className = definition.render.className;
            if (tag === "hr") {
                return `<hr class="${className}" />`;
            }
            return `<div class="${className}" aria-hidden="true"></div>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	margin: 0;
	${flattenedBoxDeclarations(node, frameScale)}
}
`;
            })
                .join("");
        },
        shouldRender: () => true
    },
    input: {
        renderHtml: (node, definition, hideVisibleText) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            const placeholder = hideVisibleText ? "" : (0, string_1.escapeHtml)(text);
            return `
			<label class="${definition.render.className}">
				<span class="usi_field_label usi_sr_only">${(0, string_1.escapeHtml)(node.name || definition.label)}</span>
				<input class="usi_field_input" type="${(0, string_1.escapeHtml)(definition.render.inputType || "text")}" placeholder="${placeholder}" />
			</label>
		`.trim();
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                const className = definition.render.className;
                return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_field_input {
	width: 100%;
	padding: 0.875em 1em;
	border: 1px solid #d0d0d0;
	background: #fff;
	color: #111;
	${node.style.borderRadius != null ? "border-radius: " + String(node.style.borderRadius) + "px;" : ""}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => hasInsertedComponent(root, "email_input") || hasInsertedComponent(root, "phone_input")
    },
    survey: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const children = node.children.filter(function (child) {
                return !child.ignored && child.visible;
            });
            const prompt = children[0] ? componentText(children[0]) : componentText(node, definition);
            const options = (children.length > 1 ? children.slice(1) : [])
                .map(function (child) {
                return `<button class="usi_survey_option" type="button">${(0, string_1.escapeHtml)(componentText(child))}</button>`;
            })
                .join("") ||
                `<button class="usi_survey_option" type="button">Option 1</button><button class="usi_survey_option" type="button">Option 2</button>`;
            return `
				<section class="${definition.render.className}">
					<p class="usi_survey_prompt">${(0, string_1.escapeHtml)(prompt)}</p>
					<div class="usi_survey_options">${options}</div>
				</section>
			`.trim();
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                const className = definition ? definition.render.className : "usi_survey";
                return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-direction: column;
	gap: 0.75em;
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_survey_options {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	align-items: flex-start;
}

${htmlToCssClassName(className)} .usi_survey_option {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
}
`;
            })
                .join("");
        },
        shouldRender: (root) => hasInsertedComponent(root, "survey_block")
    },
    coupon: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const childrenText = node.children
                .map(function (child) {
                return componentText(child);
            })
                .filter(Boolean);
            const code = childrenText[0] || componentText(node, definition) || definition.render.fallbackText || "SAVE15";
            const label = childrenText[1] || definition.render.buttonText || "Copy Code";
            return `
				<section class="${definition.render.className}">
					<div class="usi_coupon_code">${(0, string_1.escapeHtml)(code)}</div>
					<button class="usi_coupon_button" type="button">${(0, string_1.escapeHtml)(label)}</button>
				</section>
			`.trim();
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                const className = definition ? definition.render.className : "usi_coupon";
                const buttonNode = node.children[1];
                return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	display: flex;
	flex-wrap: wrap;
	gap: 0.75em;
	align-items: center;
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_coupon_code {
	padding: 0.75em 1em;
	border: 1px solid #222;
	background: #fff;
	font-weight: 700;
}

${htmlToCssClassName(className)} .usi_coupon_button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${buttonNode ? flattenedBoxDeclarations(buttonNode, frameScale, { display: "inline-flex", "align-items": "center", "justify-content": "center" }) : ""}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => hasInsertedComponent(root, "copy_coupon")
    },
    optin: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            return `
				<label class="${definition.render.className}">
					<input class="usi_optin_input" type="checkbox" />
					<span class="usi_optin_label">${(0, string_1.escapeHtml)(text)}</span>
				</label>
			`.trim();
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                const className = definition ? definition.render.className : "usi_optin";
                return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	display: flex;
	gap: 0.625em;
	align-items: center;
	${flattenedBoxDeclarations(node, frameScale)}
}

${htmlToCssClassName(className)} .usi_optin_input {
	appearance: none;
	-webkit-appearance: none;
	width: 1.125em;
	height: 1.125em;
	border: 1px solid currentColor;
	background: #fff;
	flex: 0 0 auto;
}

${htmlToCssClassName(className)} .usi_optin_label {
	display: inline-block;
}
`;
            })
                .join("");
        },
        shouldRender: (root) => hasInsertedComponent(root, "optin_component")
    },
    countdown: {
        renderHtml: (_node, definition) => {
            if (!definition)
                return "";
            return `<div class="${definition.render.className}"><span id="usi_minutes">5</span>:<span id="usi_seconds">00</span></div>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                const className = definition ? definition.render.className : "usi_countdown";
                return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	padding: 0.625em 0.875em;
	${flattenedBoxDeclarations(node, frameScale)}
	font-weight: 700;
}
`;
            })
                .join("");
        },
        shouldRender: (root) => hasInsertedComponent(root, "countdown_timer")
    },
    progress: {
        renderHtml: (_node, definition) => {
            if (!definition)
                return "";
            return `
				<div class="${definition.render.className}">
					<div class="usi_progress_fill"></div>
				</div>
			`.trim();
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                const className = definition ? definition.render.className : "usi_progress";
                return `
${htmlToCssClassName(className)} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	height: 0.75em;
	${flattenedBoxDeclarations(node, frameScale)}
	border-radius: 999px;
	overflow: hidden;
}

${htmlToCssClassName(className)} .usi_progress_fill {
	width: 55%;
	height: 100%;
	background: #222;
}
`;
            })
                .join("");
        },
        shouldRender: (root) => hasInsertedComponent(root, "progress_bar")
    },
    product_title: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            const tag = definition.render.htmlTag || "h3";
            const className = definition.render.className;
            return `<${tag} class="${className}">${(0, string_1.escapeHtml)(text)}</${tag}>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	margin: 0;
	white-space: pre-wrap;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "product-title", 0.35).length > 0
    },
    product_subtitle: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            const tag = definition.render.htmlTag || "p";
            const className = definition.render.className;
            return `<${tag} class="${className}">${(0, string_1.escapeHtml)(text)}</${tag}>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	margin: 0;
	font-size: 0.9em;
	${flattenedTextDeclarations(node, frameScale, { color: "#666" })}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "product-subtitle", 0.35).length > 0
    },
    product_price: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            const tag = definition.render.htmlTag || "p";
            const className = definition.render.className;
            return `<${tag} class="${className}">${(0, string_1.escapeHtml)(text)}</${tag}>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	margin: 0;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "product-price", 0.35).length > 0
    },
    product_button: {
        renderHtml: (node, definition) => {
            if (!definition)
                return "";
            const text = node ? componentText(node, definition) : "";
            const className = definition.render.className;
            return `<button class="${className}" type="button">${(0, string_1.escapeHtml)(text || definition.render.buttonText || "View item")}</button>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	${flattenedBoxDeclarations(node, frameScale, {
                    display: "inline-flex",
                    "align-items": "center",
                    "justify-content": "center",
                    color: "#ffffff"
                })}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "product-cta", 0.35).length > 0
    },
    product_image: {
        renderHtml: (_node, definition, hideVisibleText) => {
            if (!definition || hideVisibleText)
                return "";
            const className = definition.render.className;
            return `<div class="${className}"><img src="${PRODUCT_PLACEHOLDER_IMAGE}" alt="Product" /></div>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	height: ${(0, css_1.toPercent)(node.bounds.height, root.bounds.height)};
	display: block;
	overflow: hidden;
	${flattenedBoxDeclarations(node, frameScale)}
}
.${definition.render.className} img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
}
`;
            })
                .join("");
        },
        shouldRender: () => false
    },
    price_subtotal: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            return `<div class="${definition.render.className}">${(0, string_1.escapeHtml)(text)}</div>`;
        },
        renderCss: (nodes, _root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	${flattenedTextDeclarations(node, frameScale)}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "summary-subtotal", 0.35).length > 0
    },
    price_discount: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            return `<div class="${definition.render.className}">${(0, string_1.escapeHtml)(text)}</div>`;
        },
        renderCss: (nodes, _root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	font-weight: 700;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "summary-discount", 0.35).length > 0
    },
    price_total: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            return `<div class="${definition.render.className}">${(0, string_1.escapeHtml)(text)}</div>`;
        },
        renderCss: (nodes, _root, frameScale) => {
            if (!nodes.length)
                return "";
            return nodes
                .map(function (node) {
                const definition = componentDefinitionForNode(node);
                if (!definition)
                    return "";
                return `
.${definition.render.className} {
	font-weight: 700;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
            })
                .join("");
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "summary-total", 0.35).length > 0
    },
    product_grid: {
        renderHtml: (_node, _definition, _hideVisibleText, context) => {
            const productHtml = String((context && context.productHtml) || "");
            if (!productHtml)
                return "";
            return `<section class="usi_products usi_products_grid">${productHtml}</section>`;
        },
        renderCss: (nodes, root, frameScale, context) => {
            if (!nodes.length)
                return "";
            const firstProductCard = context ? context.firstProductCard : undefined;
            const productImageNode = context ? context.productImageNode : undefined;
            const productTitleNode = context ? context.productTitleNode : undefined;
            const productPriceNode = context ? context.productPriceNode : undefined;
            const productButtonNode = context ? context.productButtonNode : undefined;
            const productSubtitleNodes = context
                ? context.productSubtitleNodes
                : undefined;
            const productGap = context ? context.productGap : undefined;
            const gridColumns = context ? context.gridColumns : undefined;
            const productBounds = context ? context.productBounds : undefined;
            const firstCardWidth = firstProductCard && productBounds ? firstProductCard.bounds.width : undefined;
            const imageAspectRatio = productImageNode
                ? `${productImageNode.bounds.width} / ${productImageNode.bounds.height}`
                : undefined;
            const productCardCss = nodes
                .filter(function (card) {
                return card.children && card.children.length > 0;
            })
                .map(function (card, index) {
                const imageNode = (0, tree_1.findNormalizedNodeById)(card, (0, tree_1.findImageNodeId)(card));
                const imageRule = imageNode
                    ? `
.usi_product${index + 1} .usi_product_image {
	width: 100%;
	height: ${(0, css_1.toPercent)(imageNode.bounds.height, card.bounds.height)};
	margin-left: 0;
	margin-top: ${(0, css_1.toPercent)(imageNode.bounds.y - card.bounds.y, card.bounds.height)};
}
`
                    : "";
                return `
.usi_product${index + 1} {
	width: 100%;
	max-width: 100%;
	min-width: 0;
}
${imageRule}
`;
            })
                .join("");
            return `
.usi_products {
	position: absolute;
	left: ${productBounds ? (0, css_1.toPercent)(productBounds.x - root.bounds.x, root.bounds.width) : "12%"};
	top: ${productBounds ? (0, css_1.toPercent)(productBounds.y - root.bounds.y, root.bounds.height) : "59%"};
	width: ${productBounds ? (0, css_1.toPercent)(productBounds.width, root.bounds.width) : "76%"};
	min-height: ${productBounds ? (0, css_1.toPercent)(productBounds.height, root.bounds.height) : "0%"};
	display: grid;
	grid-template-columns: repeat(${productBounds && productBounds.width < productBounds.height * 0.9 ? 1 : gridColumns || 1}, minmax(0, 1fr));
	gap: ${productBounds && productGap != null ? (0, css_1.toPercent)(productGap, productBounds.width) : "2%"};
	justify-items: center;
	justify-content: center;
	align-content: start;
	align-items: start;
	box-sizing: border-box;
}

.usi_product {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 0.75em;
	padding: 0.9em;
	width: ${firstCardWidth && productBounds && gridColumns && gridColumns > 1
                ? (0, css_1.toPercent)(firstCardWidth, productBounds.width)
                : "100%"};
	max-width: 100%;
	min-width: 0;
	min-height: 0;
	margin: 0 auto;
	box-sizing: border-box;
 	${flattenedBoxDeclarations(firstProductCard, frameScale, {
                width: firstCardWidth && productBounds && gridColumns && gridColumns > 1
                    ? (0, css_1.toPercent)(firstCardWidth, productBounds.width)
                    : "100%",
                "max-width": "100%",
                "min-width": "0"
            }) || "width: 100%; max-width: 100%; min-width: 0;"}

.usi_product_image {
	position: relative;
	display: block;
	width: 100%;
	min-width: 0;
	overflow: hidden;
	${imageAspectRatio ? `aspect-ratio: ${imageAspectRatio};` : ""}
	${flattenedBoxDeclarations(productImageNode, frameScale, {
                width: "100%",
                position: "relative",
                left: undefined,
                top: undefined
            }) || "width: 100%; position: relative;"}
}

.usi_product_image img {
	display: block;
	width: 100%;
	height: 100%;
	max-width: 100%;
	object-fit: contain;
}

.usi_product_body {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 0.35em;
	min-width: 0;
	width: 100%;
	box-sizing: border-box;
}

.usi_product_title,
.usi_product_subtitle,
.usi_product_price {
	position: static;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.usi_product_title {
	margin: 0;
	white-space: normal;
	word-break: break-word;
	${flattenedTextDeclarations(productTitleNode, frameScale, {
                "white-space": "normal",
                "background-color": "transparent",
                border: "none"
            }) || "font-weight: 700;"}
}

.usi_product_subtitle {
	margin: 0;
	word-break: break-word;
	${productSubtitleNodes && productSubtitleNodes[0] ? flattenedTextDeclarations(productSubtitleNodes[0], frameScale) : "color: #666;"}
}

.usi_product_price {
	margin: 0;
	word-break: break-word;
	${flattenedTextDeclarations(productPriceNode, frameScale) || ""}
}

.usi_product_cta {
	position: static;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	max-width: 100%;
	align-self: flex-start;
	width: auto;
	max-width: 100%;
	padding: 0.75em 1em;
	${flattenedBoxDeclarations(productButtonNode, frameScale, {
                display: "inline-flex",
                "align-items": "center",
                "justify-content": "center",
                color: "#ffffff"
            }) || "border: 1px solid currentColor; background: transparent; color:#ffffff;"}
}

${productCardCss}
`;
        },
        shouldRender: () => false
    },
    price_table: {
        renderHtml: (_node, _definition, _hideVisibleText, context) => {
            return String((context && context.summaryHtml) || "");
        },
        renderCss: (nodes, root, frameScale, context) => {
            if (!nodes.length)
                return "";
            const summaryNode = context ? context.summaryNode : undefined;
            const summarySubtotalNode = context
                ? context.summarySubtotalNode
                : undefined;
            const summaryDiscountNode = context
                ? context.summaryDiscountNode
                : undefined;
            const summaryTotalNode = context ? context.summaryTotalNode : undefined;
            return `
.usi_summary {
	position: absolute;
	left: ${summaryNode ? (0, css_1.toPercent)(summaryNode.bounds.x - root.bounds.x, root.bounds.width) : "12%"};
	top: ${summaryNode ? (0, css_1.toPercent)(summaryNode.bounds.y - root.bounds.y, root.bounds.height) : "59%"};
	width: ${summaryNode ? (0, css_1.toPercent)(summaryNode.bounds.width, root.bounds.width) : "76%"};
	padding: 1em;
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	${flattenedBoxDeclarations(summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_summary_title {
	margin: 0 0 0.5em;
	white-space: pre-wrap;
	${flattenedTextDeclarations(summaryNode, frameScale, {
                "font-size": "1em",
                "font-weight": 700,
                "white-space": "pre-wrap"
            }) || "font-weight: 700; font-size: 1em;"}
}

.usi_summary_row {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 1em;
	align-items: start;
	font-size: 1em;
}

.usi_price {
	${flattenedTextDeclarations(summarySubtotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_discount {
	${flattenedTextDeclarations(summaryDiscountNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_new_price {
	${flattenedTextDeclarations(summaryTotalNode || summaryNode, frameScale, { "font-size": "1em" }) || "font-size: 1em;"}
}

.usi_label,
.usi_value {
	font-size: 1em;
}

.usi_new_price .usi_value,
.usi_discount .usi_value,
.usi_new_price strong,
.usi_discount strong {
	font-weight: 700;
}
`;
        },
        shouldRender: () => false
    },
    no_thanks_button: {
        renderHtml: (node, definition) => {
            if (!definition)
                return "";
            const text = node ? componentText(node, definition) : "";
            const className = definition.render.className;
            return `<button class="${className}" type="button">${(0, string_1.escapeHtml)(text || "No Thanks")}</button>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            const node = nodes[0];
            return `
.usi_secondary_cta {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75em 1em;
	cursor: pointer;
	${flattenedBoxDeclarations(node, frameScale)}
}
`;
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "secondary-cta", 0.35).length > 0
    },
    disclaimer_text: {
        renderHtml: (node, definition) => {
            if (!node || !definition)
                return "";
            const text = componentText(node, definition);
            const className = definition.render.className;
            return `<p class="${className}">${(0, string_1.escapeHtml)(text)}</p>`;
        },
        renderCss: (nodes, root, frameScale) => {
            if (!nodes.length)
                return "";
            const node = nodes[0];
            return `
.usi_disclaimer {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, root.bounds.width)};
	margin: 0;
	font-size: 0.875em;
	line-height: 1.4;
	${flattenedTextDeclarations(node, frameScale)}
}
`;
        },
        shouldRender: (root) => (0, tree_1.findNodesByRole)(root, "disclaimer", 0.35).length > 0
    },
    headline: {
        renderHtml: (node, definition, _hideVisibleText, context) => {
            const text = String((context && context.text) || (node && definition ? componentText(node, definition) : ""));
            const className = String((context && context.className) || "usi_headline");
            return text ? `<h1 class="${className}">${(0, string_1.escapeHtml)(text)}</h1>` : "";
        },
        renderCss: (nodes, _root, frameScale, context) => {
            if (!nodes.length)
                return "";
            const mainBounds = context ? context.mainBounds : undefined;
            const node = nodes[0];
            if (!mainBounds)
                return "";
            return `
.usi_headline {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap" })}
}
`;
        },
        shouldRender: () => false
    },
    eyebrow: {
        renderHtml: (node, definition, _hideVisibleText, context) => {
            const text = String((context && context.text) || (node && definition ? componentText(node, definition) : ""));
            const className = String((context && context.className) || "usi_eyebrow");
            return text ? `<p class="${className}">${(0, string_1.escapeHtml)(text)}</p>` : "";
        },
        renderCss: (nodes, _root, frameScale, context) => {
            if (!nodes.length)
                return "";
            const mainBounds = context ? context.mainBounds : undefined;
            const node = nodes[0];
            if (!mainBounds)
                return "";
            return `
.usi_eyebrow {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap" })}
}
`;
        },
        shouldRender: () => false
    },
    subtext: {
        renderHtml: (node, definition, _hideVisibleText, context) => {
            const text = String((context && context.text) || (node && definition ? componentText(node, definition) : ""));
            const className = String((context && context.className) || "usi_subtext");
            return text ? `<p class="${className}">${(0, string_1.escapeHtml)(text)}</p>` : "";
        },
        renderCss: (nodes, _root, frameScale, context) => {
            if (!nodes.length)
                return "";
            const mainBounds = context ? context.mainBounds : undefined;
            const node = nodes[0];
            if (!mainBounds)
                return "";
            return `
.usi_subtext {
	position: absolute;
	left: ${(0, css_1.toPercent)(node.bounds.x - mainBounds.x, mainBounds.width)};
	top: ${(0, css_1.toPercent)(node.bounds.y - mainBounds.y, mainBounds.height)};
	width: ${(0, css_1.toPercent)(node.bounds.width, mainBounds.width)};
	${flattenedTextDeclarations(node, frameScale, { "white-space": "pre-wrap" })}
}
`;
        },
        shouldRender: () => false
    },
    primary_button: {
        renderHtml: (node, definition, _hideVisibleText, context) => {
            const ctaLabel = String((context && context.ctaLabel) ||
                (definition ? definition.render.buttonText || definition.label : "Redeem Now"));
            const ctaInnerHtml = String((context && context.ctaInnerHtml) || (0, string_1.escapeHtml)(ctaLabel));
            const showCtaInVariant = !!(context && context.showCtaInVariant);
            if (!showCtaInVariant)
                return "";
            const className = definition ? definition.render.className : "usi_primary_cta";
            const ariaLabel = (0, string_1.escapeHtml)(ctaLabel);
            return `<button class="${className} usi_submitbutton" onclick="usi_js.click_cta();" type="button" aria-label="${ariaLabel}">${ctaInnerHtml}</button>`;
        },
        renderCss: (nodes, root, frameScale) => {
            const node = nodes[0];
            return `
.usi_submitbutton {
	position: absolute;
	left: ${node ? (0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width) : "12%"};
	top: ${node ? (0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height) : "77%"};
	width: ${node ? (0, css_1.toPercent)(node.bounds.width, root.bounds.width) : "76%"};
	min-height: ${node ? (0, css_1.toPercent)(node.bounds.height, root.bounds.height) : "15.5%"};
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	${flattenedBoxDeclarations(node, frameScale, {
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                "background-color": node && node.style.background ? node.style.background : "#1f1f1f",
                color: node && node.style.color ? node.style.color : "#ffffff",
                "text-align": node && node.style.textAlign ? node.style.textAlign : "center"
            })}
}
`;
        },
        shouldRender: () => true
    },
    close_control: {
        renderHtml: () => `<button type="button" id="usi_close" aria-label="Close">×</button>`,
        renderCss: (_nodes, root, frameScale, context) => {
            const closeVisualNode = context ? context.closeVisualNode : undefined;
            const closeNode = context ? context.closeNode : undefined;
            const node = closeVisualNode || closeNode;
            return `
#usi_close {
	position: absolute;
	left: ${node ? (0, css_1.toPercent)(node.bounds.x - root.bounds.x, root.bounds.width) : "95%"};
	top: ${node ? (0, css_1.toPercent)(node.bounds.y - root.bounds.y, root.bounds.height) : "2%"};
	width: ${node ? (0, css_1.toPercent)(node.bounds.width, root.bounds.width) : "3%"};
	height: ${node ? (0, css_1.toPercent)(node.bounds.height, root.bounds.height) : "3%"};
	z-index: 2000000300;
	cursor: pointer;
	padding: 0;
	margin: 0;
	display: block;
	overflow: hidden;
	text-indent: -9999px;
	${flattenedBoxDeclarations(node, frameScale, { background: "none", border: "none" }) || "background:none;border:none;"}
}

#usi_close::before {
	content: "×";
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	text-indent: 0;
	${flattenedTextDeclarations(node, frameScale, {
                background: "transparent",
                border: "none",
                "text-align": "center",
                "line-height": "1"
            }) || "background:transparent;border:none;text-align:center;line-height:1;"}
}

button#usi_close,
button#usi_close:hover,
button#usi_close:active,
button#usi_close:focus {
	cursor: pointer;
}
`;
        },
        shouldRender: () => true
    },
    screen: {
        renderHtml: (_node, _definition, _hideVisibleText, context) => {
            const contentHtml = String((context && context.contentHtml) || "");
            const imageFileName = String((context && context.imageFileName) || "");
            const headlineText = String((context && context.headlineText) || "Preview");
            const scaledRootWidth = context ? context.scaledRootWidth : undefined;
            const scaledRootHeight = context ? context.scaledRootHeight : undefined;
            return `
		<div id="usi_container">
			<div
				id="usi_display"
				role="alertdialog"
				aria-label="${(0, string_1.escapeHtml)(headlineText || "Preview")}"
				aria-modal="true"
				class="usi_display usi_show_css usi_shadow"
				style="width:${scaledRootWidth}px;height:${scaledRootHeight}px;"
			>
				<div id="usi_content">${contentHtml}</div>
				<div id="usi_background">
					<img
						src="${(0, string_1.escapeHtml)(imageFileName)}"
						aria-hidden="true"
						alt="${(0, string_1.escapeHtml)(headlineText || "Preview")}"
						id="usi_background_img"
						style="width:100%;height:100%;"
					/>
				</div>
			</div>
		</div>
			`.trim();
        },
        renderCss: (_nodes, root, _frameScale, context) => {
            const scaledRootWidth = context ? context.scaledRootWidth : undefined;
            const scaledRootHeight = context ? context.scaledRootHeight : undefined;
            return `
.usi_display * {
	font-size: 1em;
	line-height: 1.2;
	box-sizing: border-box;
	color: inherit;
	font-family: inherit;
}

#usi_display {
	position: relative;
	display: block;
	left: 50%;
	margin-left: -${String((scaledRootWidth || 0) / 2)}px;
	top: 0px;
	width: ${scaledRootWidth}px;
	height: ${scaledRootHeight}px;
	font-size: 16px;
	color: #000;
	font-family: inherit;
	${root.layout && root.layout.padding ? "padding: " + root.layout.padding.top + "px " + root.layout.padding.right + "px " + root.layout.padding.bottom + "px " + root.layout.padding.left + "px;" : ""}
	${root.style.borderRadius != null ? "border-radius: " + String(root.style.borderRadius) + "px;" : ""}
}
`;
        },
        shouldRender: () => true
    },
    content_layout: {
        renderHtml: (_node, _definition, _hideVisibleText, context) => {
            const eyebrowHtml = String((context && context.eyebrowHtml) || "");
            const headlineHtml = String((context && context.headlineHtml) || "");
            const subtextHtml = String((context && context.subtextHtml) || "");
            const ctaHtml = String((context && context.ctaHtml) || "");
            const flattenedExtraMainHtml = String((context && context.flattenedExtraMainHtml) || "");
            const flattenedExtraUtilityHtml = String((context && context.flattenedExtraUtilityHtml) || "");
            const extraComponentsHtml = String((context && context.extraComponentsHtml) || "");
            return `
<section class="usi_main">
	${eyebrowHtml}
	${headlineHtml}
	${subtextHtml}
	${ctaHtml}
	${flattenedExtraMainHtml}
	${flattenedExtraUtilityHtml}
	${extraComponentsHtml}
</section>
			`.trim();
        },
        renderCss: (_nodes, root, _frameScale, context) => {
            const hasProducts = !!(context && context.hasProducts);
            const hasSummary = !!(context && context.hasSummary);
            const mainBounds = context ? context.mainBounds : undefined;
            const left = hasProducts || hasSummary
                ? mainBounds
                    ? (0, css_1.toPercent)(mainBounds.x - root.bounds.x, root.bounds.width)
                    : "0%"
                : "0%";
            const top = hasProducts || hasSummary
                ? mainBounds
                    ? (0, css_1.toPercent)(mainBounds.y - root.bounds.y, root.bounds.height)
                    : "0%"
                : "0%";
            const width = hasProducts || hasSummary
                ? mainBounds
                    ? (0, css_1.toPercent)(mainBounds.width, root.bounds.width)
                    : "100%"
                : "100%";
            const height = !hasProducts && !hasSummary
                ? "100%"
                : mainBounds
                    ? (0, css_1.toPercent)(mainBounds.height, root.bounds.height)
                    : "100%";
            return `
.usi_main {	
    position: relative;
    height: 100%;
	/*position: absolute;*/
	/*left: ${left};*/
	/*top: ${top};*/
	/*width: ${width};*/
	/*height: ${height};*/
	min-width: 0;
	box-sizing: border-box;
	display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}
`;
        },
        shouldRender: () => true
    },
    aside_layout: {
        renderHtml: (_node, _definition, _hideVisibleText, context) => {
            const hasProducts = !!(context && context.hasProducts);
            const flattenedExtraAsideHtml = String((context && context.flattenedExtraAsideHtml) || "");
            const productHtml = String((context && context.productHtml) || "");
            if (!hasProducts && !flattenedExtraAsideHtml)
                return "";
            return `
	${hasProducts ? productHtml : ""}
	${flattenedExtraAsideHtml}
			`.trim();
        },
        renderCss: () => "",
        shouldRender: () => true
    }
};
function generateProductGridHtml(products, hideVisibleText) {
    if (!products.length)
        return "";
    return products
        .map(function (product, index) {
        const fallbackTitle = (0, string_1.escapeHtml)(product.title || "");
        const fallbackSubtitle = (0, string_1.escapeHtml)(product.subtitle || "");
        const fallbackPrice = (0, string_1.escapeHtml)(product.price || "");
        const fallbackButton = (0, string_1.escapeHtml)(product.cta || "");
        const hasMeaningfulContent = !!fallbackSubtitle || !!fallbackPrice || !!fallbackButton;
        if (!hasMeaningfulContent)
            return "";
        return `
				<article class="usi_product_card usi_product usi_product${index + 1}">
					${!hideVisibleText
            ? `<div class="usi_product_image">
								<img
									src="\${usi_cookies.get('usi_prod_image_${index + 1}') || '${PRODUCT_PLACEHOLDER_IMAGE}'}"
									alt="\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitle || "Product"}')}"
								/>
							</div>`
            : ""}
					<div class="usi_product_body">
						<h3 class="usi_product_title">\${usi_js.escape_quotes(usi_cookies.get('usi_prod_name_${index + 1}') || '${fallbackTitle}')}</h3>
						${fallbackSubtitle ? `<p class="usi_product_subtitle">${fallbackSubtitle}</p>` : ""}
						${fallbackPrice ? `<p class="usi_product_price">${fallbackPrice}</p>` : ""}
						${fallbackButton ? `<button class="usi_product_cta" type="button">${fallbackButton}</button>` : ""}
					</div>
				</article>
			`.trim();
    })
        .filter(Boolean)
        .join("");
}
function generateSummaryHtml(hasSummary, summaryTitle, isRuntime) {
    if (!hasSummary)
        return "";
    if (isRuntime) {
        return `
			<section class="usi_summary" aria-label="Cart summary">
				${summaryTitle ? `<h2 class="usi_summary_title">${(0, string_1.escapeHtml)(summaryTitle)}</h2>` : ""}
				<div class="usi_summary_row usi_price">
					<span class="usi_label">Subtotal:</span>
					<strong class="usi_value">$\${usi_js.product.subtotal}</strong>
				</div>
				<div class="usi_summary_row usi_discount">
					<span class="usi_label">Discount:</span>
					<strong class="usi_value">- $\${usi_js.product.discount}</strong>
				</div>
				<div class="usi_summary_row usi_new_price">
					<span class="usi_label">Total:</span>
					<strong class="usi_value">$\${usi_js.product.new_price}</strong>
				</div>
			</section>
		`.trim();
    }
    return `
		<section class="usi_summary" aria-label="Cart summary">
			${summaryTitle ? `<h2 class="usi_summary_title">${(0, string_1.escapeHtml)(summaryTitle)}</h2>` : ""}
			<div class="usi_summary_row usi_price">
				<span class="usi_label">Subtotal:</span>
				<strong class="usi_value">$XX.XX</strong>
			</div>
			<div class="usi_summary_row usi_discount">
				<span class="usi_label">Discount:</span>
				<strong class="usi_value">- $XX.XX</strong>
			</div>
			<div class="usi_summary_row usi_new_price">
				<span class="usi_label">Total:</span>
				<strong class="usi_value">$XX.XX</strong>
			</div>
		</section>
	`.trim();
}
function groupNodesByRenderer(nodes) {
    return nodes.reduce(function (acc, node) {
        const definition = componentDefinitionForNode(node);
        if (!definition)
            return acc;
        const rendererKey = COMPONENT_RENDERERS[definition.id] ? definition.id : definition.render.kind;
        if (!acc[rendererKey])
            acc[rendererKey] = [];
        acc[rendererKey].push(node);
        return acc;
    }, {});
}
function renderComponentByKey(rendererKey, node, definition, hideVisibleText, context) {
    const renderer = COMPONENT_RENDERERS[rendererKey];
    if (!renderer)
        return "";
    return renderer.renderHtml(node, definition, hideVisibleText, context);
}
function renderExplicitComponentNode(node, hideVisibleText) {
    const definition = componentDefinitionForNode(node);
    if (!definition)
        return "";
    const idRenderer = COMPONENT_RENDERERS[definition.id];
    if (idRenderer) {
        return idRenderer.renderHtml(node, definition, hideVisibleText);
    }
    const kind = definition.render.kind;
    const renderer = COMPONENT_RENDERERS[kind];
    if (renderer) {
        return renderer.renderHtml(node, definition, hideVisibleText);
    }
    const tag = definition.render.htmlTag;
    const className = definition.render.className;
    const text = componentText(node, definition);
    return `<${tag} class="${className}">${(0, string_1.escapeHtml)(text)}</${tag}>`;
}
function hasInsertedComponent(root, componentId) {
    return (0, tree_1.flattenTree)(root).some(function (node) {
        return !node.ignored && node.componentOverride === componentId;
    });
}
function htmlToCssClassName(cn) {
    return cn
        .split(" ")
        .map((s) => "." + s)
        .join("");
}
function buildPriceRuntimeSetup(includeSummary) {
    if (!includeSummary)
        return "";
    return `try {
	const subtotal_raw = usi_cookies.get("usi_subtotal");
	const subtotal_num = Number(subtotal_raw);
	const discount = (subtotal_num * 0.15).toFixed(2);
	const new_price = (subtotal_num - Number(discount)).toFixed(2);

	if (isNaN(subtotal_num) || isNaN(Number(discount)) || isNaN(Number(new_price))) {
		throw new Error("Invalid price values");
	}

	usi_js.product = { subtotal: subtotal_raw, discount: discount, new_price: new_price };
} catch (err) {
	usi_commons.report_error(err);
	usi_js.launch.enabled = false;
	usi_js.launch.suppress = true;
}

`;
}
function componentDefinitionForNode(node) {
    if (node.componentOverride && constants_1.COMPONENT_BY_ID[node.componentOverride]) {
        return constants_1.COMPONENT_BY_ID[node.componentOverride];
    }
    return constants_1.COMPONENT_BY_ROLE[node.detectedRole || node.roleOverride || "other"];
}
function componentText(node, definition) {
    const text = (0, tree_1.collectText)(node) || node.text || node.name || "";
    if (text)
        return text;
    return definition && definition.render.fallbackText ? definition.render.fallbackText : "";
}
function renderExtraRegionNodes(root, region, excludedIds, hideVisibleText) {
    const rendered = [];
    (function walk(node) {
        if (node.ignored || excludedIds.indexOf(node.id) !== -1)
            return;
        const definition = componentDefinitionForNode(node);
        if (definition && definition.id === "content_stack")
            return;
        const shouldRenderNode = !!definition && definition.render.region === region;
        if (shouldRenderNode) {
            rendered.push(renderExplicitComponentNode(node, hideVisibleText || false));
            return;
        }
        for (let index = 0; index < node.children.length; index += 1) {
            walk(node.children[index]);
        }
    })(root);
    return rendered.join("");
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
function nodeContains(parent, child) {
    for (let index = 0; index < parent.children.length; index += 1) {
        const current = parent.children[index];
        if (current === child)
            return true;
        if (nodeContains(current, child))
            return true;
    }
    return false;
}
function topLevelNodes(nodes, _root) {
    return nodes.filter(function (node) {
        return !nodes.some(function (other) {
            return other !== node && nodeContains(other, node);
        });
    });
}
function flattenedTextDeclarations(node, frameScale, extra) {
    if (!node)
        return "";
    return (0, css_1.cssDeclarations)(Object.assign({
        color: node.style.color,
        opacity: node.style.opacity,
        "font-family": node.style.fontFamily
            ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif'
            : undefined,
        "font-style": node.style.fontStyle,
        "font-size": node.style.fontSize ? (0, css_1.pxToEm)(node.style.fontSize, 16, frameScale) : undefined,
        "font-weight": node.style.fontWeight,
        "line-height": node.style.lineHeight ? (0, css_1.pxToEm)(node.style.lineHeight, 16, frameScale) : undefined,
        "letter-spacing": node.style.letterSpacing
            ? (0, css_1.pxToEm)(node.style.letterSpacing, 16, frameScale)
            : undefined,
        "text-align": node.style.textAlign,
        "text-transform": (0, css_1.textTransformFromCase)(node.style.textCase)
    }, extra || {}));
}
function flattenedBoxDeclarations(node, frameScale, extra) {
    if (!node)
        return (0, css_1.cssDeclarations)(extra || {});
    return (0, css_1.cssDeclarations)(Object.assign({
        "background-color": node.style.background,
        color: node.style.color,
        border: node.style.borderColor
            ? String(node.style.borderWidth || 1) + "px solid " + node.style.borderColor
            : undefined,
        "border-radius": node.style.borderRadius != null ? String(node.style.borderRadius) + "px" : undefined,
        opacity: node.style.opacity,
        "font-family": node.style.fontFamily
            ? '"' + node.style.fontFamily + '", Helvetica, Arial, sans-serif'
            : undefined,
        "font-style": node.style.fontStyle,
        "font-size": node.style.fontSize ? (0, css_1.pxToEm)(node.style.fontSize, 16, frameScale) : undefined,
        "font-weight": node.style.fontWeight,
        "line-height": node.style.lineHeight ? (0, css_1.pxToEm)(node.style.lineHeight, 16, frameScale) : undefined,
        "letter-spacing": node.style.letterSpacing
            ? (0, css_1.pxToEm)(node.style.letterSpacing, 16, frameScale)
            : undefined,
        "text-align": node.style.textAlign,
        "text-transform": (0, css_1.textTransformFromCase)(node.style.textCase)
    }, extra || {}));
}
function findDescendantRoleNode(root, role) {
    if (!root)
        return undefined;
    return (0, tree_1.pickBestNode)((0, tree_1.findNodesByRole)(root, role, 0.1));
}
// --- Standalone role detection helpers ---
function findStandaloneRoleNode(root, role, excludedAncestorIds = []) {
    return (0, tree_1.pickBestNode)((0, tree_1.findNodesByRole)(root, role, 0.35).filter(function (node) {
        return !excludedAncestorIds.some(function (ancestorId) {
            const ancestor = (0, tree_1.findNormalizedNodeById)(root, ancestorId);
            return ancestor ? nodeContains(ancestor, node) : false;
        });
    }));
}
function syntheticNodeFromBounds(id, bounds) {
    if (!bounds)
        return undefined;
    return {
        id: id,
        name: id,
        type: "FRAME",
        text: "",
        visible: true,
        ignored: false,
        children: [],
        bounds: bounds,
        style: {},
        layout: {},
        metadata: {}
    };
}
function resolveSummaryTitle(summaryNode) {
    if (!summaryNode)
        return undefined;
    for (let index = 0; index < summaryNode.children.length; index += 1) {
        const child = summaryNode.children[index];
        const text = String(child.text || (0, tree_1.collectText)(child) || "").trim();
        if (!text)
            continue;
        if (!/(subtotal|discount|total|\$)/i.test(text))
            return text;
    }
    const ownText = String(summaryNode.text || "").trim();
    if (ownText && !/(subtotal|discount|total|\$)/i.test(ownText))
        return ownText;
    return undefined;
}
function buildSyntheticBounds(nodes) {
    if (!nodes.length)
        return undefined;
    const left = Math.min.apply(null, nodes.map(function (node) {
        return node.bounds.x;
    }));
    const top = Math.min.apply(null, nodes.map(function (node) {
        return node.bounds.y;
    }));
    const right = Math.max.apply(null, nodes.map(function (node) {
        return node.bounds.x + node.bounds.width;
    }));
    const bottom = Math.max.apply(null, nodes.map(function (node) {
        return node.bounds.y + node.bounds.height;
    }));
    return { x: left, y: top, width: right - left, height: bottom - top };
}
function formatFlattenedHtml(html) {
    if (!html)
        return "";
    return (0, string_1.formatHtml)(html)
        .split("\n")
        .map(function (line) {
        return line ? "\t" + line : line;
    })
        .join("\n");
}
function renderFlattenedHtml(root, analysis, imageFileName, hideVisibleText) {
    const frameScale = 1;
    const scaledRootWidth = (0, css_1.scalePx)(root.bounds.width, frameScale) || root.bounds.width;
    const scaledRootHeight = (0, css_1.scalePx)(root.bounds.height, frameScale) || root.bounds.height;
    const headlineNode = (0, tree_1.findNormalizedNodeById)(root, analysis.headlineNodeId);
    const subtextNode = (0, tree_1.findNormalizedNodeById)(root, analysis.subtextNodeId);
    const eyebrowNode = (0, tree_1.findNormalizedNodeById)(root, analysis.eyebrowNodeId);
    const ctaNode = (0, tree_1.findNormalizedNodeById)(root, analysis.primaryCtaNodeId);
    const productContainerNode = (0, tree_1.findNormalizedNodeById)(root, analysis.productContainerNodeId);
    const productCardNodes = analysis.productCardNodeIds
        .map(function (id) {
        return (0, tree_1.findNormalizedNodeById)(root, id);
    })
        .filter(Boolean);
    const summaryNode = (0, tree_1.findNormalizedNodeById)(root, analysis.summaryNodeId);
    const closeCandidates = (0, tree_1.findNodesByRole)(root, "close-button", 0.35);
    const closeNode = closeCandidates.slice().sort(function (a, b) {
        if (Math.abs(a.bounds.x - b.bounds.x) > 2)
            return b.bounds.x - a.bounds.x;
        if (Math.abs(a.bounds.y - b.bounds.y) > 2)
            return a.bounds.y - b.bounds.y;
        return a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height;
    })[0];
    const closeVisualNode = closeNode
        ? (0, tree_1.flattenTree)(closeNode)
            .filter(function (node) {
            return !!(0, tree_1.collectText)(node).trim() || node.type === "VECTOR" || node.type === "ELLIPSE";
        })
            .sort(function (a, b) {
            if (Math.abs(a.bounds.x - b.bounds.x) > 2)
                return b.bounds.x - a.bounds.x;
            if (Math.abs(a.bounds.y - b.bounds.y) > 2)
                return a.bounds.y - b.bounds.y;
            return a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height;
        })[0] || closeNode
        : undefined;
    // Step 3: Detect standalone product nodes
    const firstProductCard = productCardNodes[0];
    const cardProductImageNode = findDescendantRoleNode(firstProductCard, "image") || findDescendantRoleNode(firstProductCard, "product-image");
    const cardProductTitleNode = findDescendantRoleNode(firstProductCard, "product-title");
    const cardProductPriceNode = findDescendantRoleNode(firstProductCard, "product-price");
    const cardProductButtonNode = findDescendantRoleNode(firstProductCard, "product-cta");
    const standaloneProductImageNode = findStandaloneRoleNode(root, "product-image", analysis.productCardNodeIds) ||
        findStandaloneRoleNode(root, "image", analysis.productCardNodeIds);
    const standaloneProductTitleNode = findStandaloneRoleNode(root, "product-title", analysis.productCardNodeIds);
    const standaloneProductSubtitleNode = findStandaloneRoleNode(root, "product-subtitle", analysis.productCardNodeIds);
    const standaloneProductPriceNode = findStandaloneRoleNode(root, "product-price", analysis.productCardNodeIds);
    const standaloneProductButtonNode = findStandaloneRoleNode(root, "product-cta", analysis.productCardNodeIds);
    const productImageNode = cardProductImageNode || standaloneProductImageNode;
    const productTitleNode = cardProductTitleNode || standaloneProductTitleNode;
    const productPriceNode = cardProductPriceNode || standaloneProductPriceNode;
    const productButtonNode = cardProductButtonNode || standaloneProductButtonNode;
    const summarySubtotalNode = findDescendantRoleNode(summaryNode, "summary-subtotal") ||
        findStandaloneRoleNode(root, "summary-subtotal", analysis.summaryNodeId ? [analysis.summaryNodeId] : []);
    const summaryDiscountNode = findDescendantRoleNode(summaryNode, "summary-discount") ||
        findStandaloneRoleNode(root, "summary-discount", analysis.summaryNodeId ? [analysis.summaryNodeId] : []);
    const summaryTotalNode = findDescendantRoleNode(summaryNode, "summary-total") ||
        findStandaloneRoleNode(root, "summary-total", analysis.summaryNodeId ? [analysis.summaryNodeId] : []);
    const standaloneProductBounds = combineBounds([
        standaloneProductImageNode,
        standaloneProductTitleNode,
        standaloneProductSubtitleNode,
        standaloneProductPriceNode,
        standaloneProductButtonNode
    ]);
    const productBounds = (productContainerNode && productContainerNode.bounds) ||
        buildSyntheticBounds(productCardNodes) ||
        standaloneProductBounds;
    const mainBounds = combineBounds([eyebrowNode, headlineNode, subtextNode, ctaNode]);
    const headlineText = analysis.schema.headline || (headlineNode ? (0, tree_1.collectText)(headlineNode) : "");
    const eyebrowText = (() => {
        const value = analysis.schema.eyebrow || (eyebrowNode ? (0, tree_1.collectText)(eyebrowNode) : "");
        if (!value)
            return "";
        if (/\$|subtotal|discount|total/i.test(value))
            return "";
        return value;
    })();
    const subtextText = analysis.schema.subtext || (subtextNode ? (0, tree_1.collectText)(subtextNode) : "");
    const ctaLabel = analysis.schema.primaryCta && analysis.schema.primaryCta.label
        ? analysis.schema.primaryCta.label
        : ctaNode
            ? (0, tree_1.collectText)(ctaNode)
            : "Redeem Now";
    const showEyebrowInVariant = hideVisibleText ? false : !!eyebrowText;
    const showHeadlineInVariant = hideVisibleText ? false : !!headlineText;
    const showSubtextInVariant = hideVisibleText ? false : !!subtextText;
    const eyebrowClass = showEyebrowInVariant ? "usi_eyebrow" : "usi_eyebrow usi_sr_only";
    const headlineClass = showHeadlineInVariant ? "usi_headline" : "usi_headline usi_sr_only";
    const subtextClass = showSubtextInVariant ? "usi_subtext" : "usi_subtext usi_sr_only";
    const showCtaInVariant = !!(ctaNode || analysis.schema.primaryCta);
    const ctaInnerHtml = showCtaInVariant ? (0, string_1.escapeHtml)(ctaLabel) : "";
    // Step 6: Relax hasProducts and hasSummary
    const syntheticSummaryBounds = combineBounds([summarySubtotalNode, summaryDiscountNode, summaryTotalNode]);
    const effectiveSummaryNode = summaryNode || syntheticNodeFromBounds("synthetic-summary", syntheticSummaryBounds);
    const summaryTitle = resolveSummaryTitle(summaryNode);
    const hasStandaloneProduct = !!(standaloneProductImageNode ||
        standaloneProductTitleNode ||
        standaloneProductSubtitleNode ||
        standaloneProductPriceNode ||
        standaloneProductButtonNode);
    const hasProducts = (!!productCardNodes.length && !!productBounds) || (!!hasStandaloneProduct && !!productBounds);
    const hasSummary = !!effectiveSummaryNode && !!(summarySubtotalNode || summaryDiscountNode || summaryTotalNode);
    const flattenedExcludedIds = [
        analysis.eyebrowNodeId,
        analysis.headlineNodeId,
        analysis.subtextNodeId,
        analysis.primaryCtaNodeId,
        analysis.summaryNodeId
    ]
        .concat(analysis.productCardNodeIds)
        .filter(Boolean);
    const flattenedExtraMainHtml = renderExtraRegionNodes(root, "main", flattenedExcludedIds, hideVisibleText);
    const flattenedExtraAsideHtml = renderExtraRegionNodes(root, "aside", flattenedExcludedIds, hideVisibleText);
    const flattenedExtraUtilityHtml = renderExtraRegionNodes(root, "utility", flattenedExcludedIds, hideVisibleText);
    const progressBarNodes = (0, tree_1.findNodesByRole)(root, "progress", 0.35);
    const countdownNodes = (0, tree_1.findNodesByRole)(root, "countdown", 0.35);
    const surveyNodes = topLevelNodes((0, tree_1.findNodesByRole)(root, "survey", 0.35), root);
    const emailInputNodes = (0, tree_1.findNodesByRole)(root, "email-input", 0.35);
    const phoneInputNodes = (0, tree_1.findNodesByRole)(root, "phone-input", 0.35);
    const copyCouponNodes = topLevelNodes((0, tree_1.findNodesByRole)(root, "copy-coupon", 0.35), root);
    const noThanksNodes = (0, tree_1.findNodesByRole)(root, "secondary-cta", 0.35);
    const optinNodes = topLevelNodes((0, tree_1.findNodesByRole)(root, "optin", 0.35), root);
    const mediaPanelNodes = (0, tree_1.findNodesByRole)(root, "image", 0.35);
    const disclaimerNodes = (0, tree_1.findNodesByRole)(root, "disclaimer", 0.35);
    const dividerNodes = (0, tree_1.findNodesByRole)(root, "divider", 0.35);
    // Step 11: Extra headline nodes
    const extraHeadlineNodes = topLevelNodes((0, tree_1.findNodesByRole)(root, "headline", 0.35).filter(function (node) {
        return node.id !== analysis.headlineNodeId;
    }), root);
    // Step 4: Detect standalone subtitle nodes
    const productSubtitleNodes = (function () {
        const subtitles = [];
        productCardNodes.forEach(function (card) {
            const subtitle = findDescendantRoleNode(card, "product-subtitle");
            if (subtitle)
                subtitles.push(subtitle);
        });
        if (!subtitles.length && standaloneProductSubtitleNode) {
            subtitles.push(standaloneProductSubtitleNode);
        }
        return subtitles;
    })();
    // Step 5: Detect standalone product images
    const productImageNodes = productCardNodes.length > 0
        ? productCardNodes
            .map(function (card) {
            return findDescendantRoleNode(card, "product-image") || findDescendantRoleNode(card, "image");
        })
            .filter(Boolean)
        : standaloneProductImageNode
            ? [standaloneProductImageNode]
            : [];
    const summarySubtotalNodes = summaryNode ? (0, tree_1.findNodesByRole)(summaryNode, "summary-subtotal", 0.35) : [];
    const summaryDiscountNodes = summaryNode ? (0, tree_1.findNodesByRole)(summaryNode, "summary-discount", 0.35) : [];
    const summaryTotalNodes = summaryNode ? (0, tree_1.findNodesByRole)(summaryNode, "summary-total", 0.35) : [];
    // Step 7: Generate product HTML for standalone product layouts
    const standaloneProductData = hasStandaloneProduct
        ? [
            {
                title: productTitleNode ? componentText(productTitleNode) : "",
                subtitle: productSubtitleNodes[0] ? componentText(productSubtitleNodes[0]) : "",
                price: productPriceNode ? componentText(productPriceNode) : "",
                cta: productButtonNode ? componentText(productButtonNode) : ""
            }
        ]
        : [];
    const runtimeProducts = analysis.schema.products.length > 0 ? analysis.schema.products : standaloneProductData;
    const productGap = productCardNodes.length > 1 && productBounds
        ? productCardNodes.slice(1).reduce(function (sum, card, index) {
            const previous = productCardNodes[index];
            return sum + Math.max(0, card.bounds.x - (previous.bounds.x + previous.bounds.width));
        }, 0) /
            (productCardNodes.length - 1)
        : 0;
    const gridColumns = Math.max(1, Math.min(productCardNodes.length || runtimeProducts.length || 1, 3));
    const runtimeProductHtmlRaw = generateProductGridHtml(runtimeProducts, hideVisibleText);
    const runtimeSummaryHtml = generateSummaryHtml(hasSummary, summaryTitle, true);
    // Step 9: Keep standalone product nodes out of extra rendering duplication
    const extraComponentExcludedIds = [
        analysis.summaryNodeId,
        ...analysis.productCardNodeIds,
        productImageNode ? productImageNode.id : "",
        productTitleNode ? productTitleNode.id : "",
        productPriceNode ? productPriceNode.id : "",
        productButtonNode ? productButtonNode.id : "",
        ...productImageNodes.map(function (n) {
            return n.id;
        }),
        ...productSubtitleNodes.map(function (n) {
            return n.id;
        }),
        summarySubtotalNode ? summarySubtotalNode.id : "",
        summaryDiscountNode ? summaryDiscountNode.id : "",
        summaryTotalNode ? summaryTotalNode.id : "",
        ...summarySubtotalNodes.map(function (n) {
            return n.id;
        }),
        ...summaryDiscountNodes.map(function (n) {
            return n.id;
        }),
        ...summaryTotalNodes.map(function (n) {
            return n.id;
        })
    ].filter(Boolean);
    const realMediaPanelNodes = mediaPanelNodes.filter(function (node) {
        return !productImageNodes.some(function (pImg) {
            return pImg.id === node.id;
        });
    });
    // Step 11: Include extra headline nodes in allExtraComponentNodes
    const allExtraComponentNodes = [
        ...extraHeadlineNodes,
        ...progressBarNodes,
        ...countdownNodes,
        ...surveyNodes,
        ...emailInputNodes,
        ...phoneInputNodes,
        ...copyCouponNodes,
        ...optinNodes,
        ...noThanksNodes,
        ...realMediaPanelNodes,
        ...disclaimerNodes,
        ...dividerNodes
    ].filter(function (node) {
        return !extraComponentExcludedIds.includes(node.id);
    });
    const extraRenderableNodes = allExtraComponentNodes.filter(function (node) {
        const definition = componentDefinitionForNode(node);
        if (hideVisibleText && definition && definition.render && definition.render.kind === "media") {
            const tag = definition.render.htmlTag;
            if (tag !== "hr")
                return false;
        }
        return true;
    });
    const extraComponentsHtml = extraRenderableNodes
        .map(function (node) {
        return renderExplicitComponentNode(node, hideVisibleText);
    })
        .join("");
    const eyebrowHtml = eyebrowText
        ? renderComponentByKey("eyebrow", eyebrowNode, constants_1.COMPONENT_BY_ID.eyebrow_block, hideVisibleText, {
            text: eyebrowText,
            className: eyebrowClass
        })
        : "";
    const headlineHtml = headlineText
        ? renderComponentByKey("headline", headlineNode, constants_1.COMPONENT_BY_ID.headline_block, hideVisibleText, {
            text: headlineText,
            className: headlineClass
        })
        : "";
    const subtextHtml = subtextText
        ? renderComponentByKey("subtext", subtextNode, constants_1.COMPONENT_BY_ID.subtext_block, hideVisibleText, {
            text: subtextText,
            className: subtextClass
        })
        : "";
    const ctaHtml = renderComponentByKey("primary_button", ctaNode, constants_1.COMPONENT_BY_ID.primary_button, hideVisibleText, {
        showCtaInVariant,
        ctaLabel,
        ctaInnerHtml
    });
    const mainSectionHtml = renderComponentByKey("content_layout", undefined, undefined, hideVisibleText, {
        eyebrowHtml,
        headlineHtml,
        subtextHtml,
        ctaHtml,
        flattenedExtraMainHtml,
        flattenedExtraUtilityHtml,
        extraComponentsHtml
    });
    const runtimeProductsSectionHtml = hasProducts
        ? renderComponentByKey("product_grid", productContainerNode || firstProductCard, constants_1.COMPONENT_BY_ID.product_grid, hideVisibleText, { productHtml: runtimeProductHtmlRaw })
        : "";
    const runtimeAsideHtml = renderComponentByKey("aside_layout", undefined, undefined, hideVisibleText, {
        hasProducts,
        flattenedExtraAsideHtml,
        productHtml: runtimeProductsSectionHtml
    });
    // Step 8: Use effectiveSummaryNode
    const runtimeSummarySectionHtml = hasSummary && effectiveSummaryNode
        ? renderComponentByKey("price_table", effectiveSummaryNode, constants_1.COMPONENT_BY_ID.price_table, hideVisibleText, {
            summaryHtml: runtimeSummaryHtml
        })
        : "";
    const contentHTML = `
		${closeNode ? renderComponentByKey("close_control", closeNode, constants_1.COMPONENT_BY_ID.close_control, hideVisibleText) : ""}
		${mainSectionHtml}
		${runtimeAsideHtml.trim() ? runtimeAsideHtml : ""}
		${runtimeSummarySectionHtml}
	`.trim();
    const htmlDocumentBody = renderComponentByKey("screen", root, undefined, hideVisibleText, {
        contentHtml: contentHTML,
        imageFileName,
        headlineText,
        scaledRootWidth,
        scaledRootHeight
    });
    const textRegionCss = [
        headlineText && headlineNode && mainBounds
            ? COMPONENT_RENDERERS.headline.renderCss([headlineNode], root, frameScale, { mainBounds })
            : "",
        eyebrowText && eyebrowNode && mainBounds
            ? COMPONENT_RENDERERS.eyebrow.renderCss([eyebrowNode], root, frameScale, { mainBounds })
            : "",
        subtextText && subtextNode && mainBounds
            ? COMPONENT_RENDERERS.subtext.renderCss([subtextNode], root, frameScale, { mainBounds })
            : ""
    ].join("");
    const rendererNodeMap = {
        input: [...emailInputNodes, ...phoneInputNodes],
        survey: surveyNodes,
        coupon: copyCouponNodes,
        optin: optinNodes,
        countdown: countdownNodes,
        progress: progressBarNodes,
        media: [...dividerNodes, ...realMediaPanelNodes],
        product_title: hasProducts ? [] : productTitleNode ? [productTitleNode] : [],
        product_subtitle: hasProducts ? [] : productSubtitleNodes,
        product_price: hasProducts ? [] : productPriceNode ? [productPriceNode] : [],
        product_button: hasProducts ? [] : productButtonNode ? [productButtonNode] : [],
        product_image: hasProducts ? [] : productImageNode ? [productImageNode] : [],
        price_subtotal: summarySubtotalNode ? [summarySubtotalNode] : [],
        price_discount: summaryDiscountNode ? [summaryDiscountNode] : [],
        price_total: summaryTotalNode ? [summaryTotalNode] : [],
        disclaimer_text: disclaimerNodes,
        no_thanks_button: noThanksNodes
    };
    if (hasProducts) {
        const syntheticProductGridNode = productCardNodes.length === 0 && productBounds
            ? syntheticNodeFromBounds("synthetic-product-grid", productBounds)
            : undefined;
        rendererNodeMap.product_grid = productCardNodes.length
            ? productCardNodes
            : syntheticProductGridNode
                ? [syntheticProductGridNode]
                : [];
    }
    // Step 8: Use effectiveSummaryNode
    if (hasSummary && effectiveSummaryNode) {
        rendererNodeMap.price_table = [effectiveSummaryNode];
    }
    const groupedExtraComponentNodes = groupNodesByRenderer(extraRenderableNodes);
    Object.keys(groupedExtraComponentNodes).forEach(function (key) {
        if (!rendererNodeMap[key])
            rendererNodeMap[key] = [];
        const seen = new Set(rendererNodeMap[key].map(function (node) {
            return node.id;
        }));
        groupedExtraComponentNodes[key].forEach(function (node) {
            if (!seen.has(node.id)) {
                rendererNodeMap[key].push(node);
            }
        });
    });
    const componentCss = Object.keys(rendererNodeMap)
        .map(function (key) {
        const renderer = COMPONENT_RENDERERS[key];
        const nodes = rendererNodeMap[key];
        if (!renderer || !nodes.length)
            return "";
        if (key === "product_grid") {
            return renderer.renderCss(nodes, root, frameScale, {
                firstProductCard,
                productImageNode,
                productTitleNode,
                productPriceNode,
                productButtonNode,
                productSubtitleNodes,
                productGap,
                gridColumns,
                productBounds
            });
        }
        // Step 8: Use effectiveSummaryNode in price_table CSS context
        if (key === "price_table") {
            return renderer.renderCss(nodes, root, frameScale, {
                summaryNode: effectiveSummaryNode,
                summarySubtotalNode,
                summaryDiscountNode,
                summaryTotalNode
            });
        }
        return renderer.renderCss(nodes, root, frameScale);
    })
        .join("");
    const baseCss = [
        COMPONENT_RENDERERS.screen.renderCss([], root, frameScale, {
            scaledRootWidth,
            scaledRootHeight
        }),
        COMPONENT_RENDERERS.close_control.renderCss([], root, frameScale, {
            closeVisualNode,
            closeNode
        }),
        COMPONENT_RENDERERS.content_layout.renderCss([], root, frameScale, {
            hasProducts,
            hasSummary,
            mainBounds
        }),
        showCtaInVariant ? COMPONENT_RENDERERS.primary_button.renderCss(ctaNode ? [ctaNode] : [], root, frameScale) : ""
    ].join("");
    const css = `
${baseCss}
${textRegionCss}
${componentCss}
`.trim();
    const js = `${buildPriceRuntimeSetup(hasSummary)}usi_js.click_cta = () => {
	try {
		usi_js.deep_link();
	} catch (err) {
		usi_commons.report_error(err);
	}
};

usi_js.display_vars.p1_html = \`
${(0, string_1.escapeTemplateString)(formatFlattenedHtml(contentHTML))}
\`;
`;
    const html = `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Preview</title>
		<style>
		.usi_display {left:50%;margin-left:-320px;top:0px;width:640px;height:636px;}.usi_display * {padding:0 0 0 0;margin:0 0 0 0;color:#000000;font-weight:normal;font-size:12pt;text-decoration:none;line-height:12pt;box-shadow: none;border: none; outline: none;text-align: left;font-family: Helvetica, Arial, sans-serif;float:none;} .usi_quickide_css {display:none;visibility:hidden;}#usi_close { position:absolute;left:85%;top:0px;width:15%;height:15%;z-index:2000000300;cursor:pointer;border:none;background:none;margin:0;padding:0; }
button#usi_close, button#usi_close:hover, button#usi_close:active, button#usi_close:focus { background:none;border:none;cursor:pointer; } #usi_content { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000200; } #usi_background { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000100; } #usi_page { position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:2000000150; } .usi_sr_only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
		${css}
		</style>
	</head>
	<body>
		${htmlDocumentBody}
	</body>
</html>
`.trim();
    return {
        html: html,
        css: css,
        imageFileName: imageFileName,
        js: js,
        contentHTML: contentHTML
    };
}
function buildUsiJsFile(pages) {
    const needsPriceRuntime = pages.some(function (page) {
        return !!page.analysis.schema.summary;
    });
    const assignments = pages
        .map(function (page) {
        return `usi_js.display_vars.${page.key}_html = \`
${(0, string_1.escapeTemplateString)(formatFlattenedHtml(page.variant.contentHTML))}
\`;
`;
    })
        .join("\n");
    return `${buildPriceRuntimeSetup(needsPriceRuntime)}usi_js.click_cta = () => {
	try {
		usi_js.deep_link();
	} catch (err) {
		usi_commons.report_error(err);
	}
};

${assignments}`;
}
},
"utils/css": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cssDeclarations = cssDeclarations;
exports.toPercent = toPercent;
exports.lineHeightCss = lineHeightCss;
exports.pxToEm = pxToEm;
exports.scalePx = scalePx;
exports.textTransformFromCase = textTransformFromCase;
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
