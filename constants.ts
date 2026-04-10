import { CommonComponentDefinition, ComponentTemplateId, ExportRole } from './types';

export const MOBILE_WIDTH_THRESHOLD = 560;

function component(
  id: ComponentTemplateId,
  label: string,
  role: ExportRole,
  description: string,
  category: CommonComponentDefinition['category'],
  render: Omit<CommonComponentDefinition['render'], 'flattened'> & {
    flattened?: Partial<CommonComponentDefinition['render']['flattened']>;
  }
): CommonComponentDefinition {
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
export const COMMON_COMPONENTS: CommonComponentDefinition[] = [
	component("modal_shell", "Modal Shell", "modal-root", "Standard centered modal shell.", "shell", {
		htmlTag: "article",
		className: "usi_modal",
		region: "shell",
		kind: "container",
		flattened: { liveText: false, textBaked: true }
	}),
	component("sidebar_shell", "Sidebar Shell", "modal-root", "Tall narrow modal shell for sidebar layouts.", "shell", {
		htmlTag: "article",
		className: "usi_modal usi_modal_sidebar",
		region: "shell",
		kind: "container",
		flattened: { liveText: false, textBaked: true }
	}),
	component("bottom_bar_shell", "Bottom Bar Shell", "modal-root", "Wide low shell for bottom-bar layouts.", "shell", {
		htmlTag: "article",
		className: "usi_modal usi_modal_bottom_bar",
		region: "shell",
		kind: "container",
		flattened: { liveText: false, textBaked: true }
	}),
	component("content_stack", "Content Stack", "content", "Primary content wrapper inside the shell.", "layout", {
		htmlTag: "section",
		className: "usi_modal_inner",
		region: "main",
		kind: "container",
		flattened: { liveText: false, textBaked: true }
	}),
	component("headline_block", "Headline", "headline", "Primary title copy.", "content", {
		htmlTag: "h1",
		className: "usi_headline",
		region: "main",
		kind: "text",
		fallbackText: "Please Input Headline Here.",
		flattened: { liveText: false, textBaked: true }
	}),
	component("subtext_block", "Subtext", "subtext", "Supporting body copy.", "content", {
		htmlTag: "p",
		className: "usi_subtext",
		region: "main",
		kind: "text",
		fallbackText: "Subtext copy here.",
		flattened: { liveText: false, textBaked: true }
	}),
	component("eyebrow_block", "Eyebrow", "eyebrow", "Small label above the headline.", "content", {
		htmlTag: "p",
		className: "usi_eyebrow",
		region: "main",
		kind: "text",
		fallbackText: "FROM YOUR CART",
		flattened: { liveText: false, textBaked: true }
	}),
	component("divider", "Divider", "divider", "Simple horizontal separator between sections.", "content", {
		htmlTag: "hr",
		className: "usi_divider",
		region: "main",
		kind: "media",
		flattened: { liveText: false, textBaked: true }
	}),
	component("primary_button", "Primary CTA", "cta", "Primary action button.", "action", {
		htmlTag: "button",
		className: "usi_primary_cta",
		region: "main",
		kind: "button",
		buttonText: "Redeem Now",
		flattened: { liveText: false, textBaked: false }
	}),
	component(
		"thank_you_button",
		"Thank You Button",
		"cta",
		"Primary thank-you action for follow-up pages.",
		"action",
		{
			htmlTag: "button",
			className: "usi_primary_cta usi_thank_you_button",
			region: "main",
			kind: "button",
			buttonText: "Thank You",
			flattened: { liveText: false, textBaked: false }
		}
	),
	component("no_thanks_button", "No Thanks Button", "secondary-cta", "Secondary dismissal action.", "action", {
		htmlTag: "button",
		className: "usi_secondary_cta usi_no_thanks",
		region: "main",
		kind: "button",
		buttonText: "No Thanks",
		flattened: { liveText: false, textBaked: false }
	}),
	component("product_grid", "Product Grid", "product-list", "Repeated products container.", "product", {
		htmlTag: "section",
		className: "usi_products",
		region: "aside",
		kind: "container",
		flattened: { liveText: false, textBaked: false }
	}),
	component("recommendation_grid", "Recommendation Grid", "product-list", "Recommendation-focused repeated products container.", "product", {
		htmlTag: "section",
		className: "usi_products usi_recommendation_grid",
		region: "aside",
		kind: "container",
		flattened: { liveText: false, textBaked: false }
	}),
	component("page_left", "Page Left", "content", "Left-side page container.", "layout", {
		htmlTag: "button",
		className: "usi_page_left",
		region: "main",
		kind: "button",
		buttonText: "‹",
		flattened: { liveText: false, textBaked: false }
	}),
	component("page_right", "Page Right", "content", "Right-side page container.", "layout", {
		htmlTag: "button",
		className: "usi_page_right",
		region: "aside",
		kind: "button",
		buttonText: "›",
		flattened: { liveText: false, textBaked: false }
	}),
	component("product_card", "Product Card", "product-card", "Single product tile.", "product", {
		htmlTag: "article",
		className: "usi_product_card",
		region: "product",
		kind: "container",
		flattened: { liveText: false, textBaked: false }
	}),
	component("product_image", "Product Image", "product-image", "Product image slot.", "product", {
		htmlTag: "div",
		className: "usi_product_image",
		region: "product",
		kind: "media",
		flattened: { liveText: false, textBaked: false }
	}),
	component("product_title", "Product Title", "product-title", "Product title text.", "product", {
		htmlTag: "h3",
		className: "usi_product_title",
		region: "product",
		kind: "text",
		fallbackText: "Product Name",
		flattened: { liveText: false, textBaked: false }
	}),
	component("product_subtitle", "Product Subtitle", "product-subtitle", "Secondary product text.", "product", {
		htmlTag: "p",
		className: "usi_product_meta",
		region: "product",
		kind: "text",
		fallbackText: "Product details",
		flattened: { liveText: false, textBaked: false }
	}),
	component("product_price", "Product Price", "product-price", "Displayed product price.", "product", {
		htmlTag: "p",
		className: "usi_product_price",
		region: "product",
		kind: "text",
		fallbackText: "$XX.XX",
		flattened: { liveText: false, textBaked: false }
	}),
	component("product_button", "Product Button", "product-cta", "CTA within a product card.", "action", {
		htmlTag: "button",
		className: "usi_product_cta",
		region: "product",
		kind: "button",
		buttonText: "View Item",
		flattened: { liveText: false, textBaked: false }
	}),
	component("price_table", "Price Table", "summary", "Summary pricing block.", "summary", {
		htmlTag: "section",
		className: "usi_summary",
		region: "summary",
		kind: "container",
		flattened: { liveText: false, textBaked: false }
	}),
	component("price_subtotal", "Subtotal Row", "summary-subtotal", "Subtotal row.", "summary", {
		htmlTag: "div",
		className: "usi_price usi_summary_row",
		region: "summary",
		kind: "text",
		fallbackText: "Subtotal: $XX.XX",
		flattened: { liveText: false, textBaked: false }
	}),
	component("price_discount", "Discount Row", "summary-discount", "Discount row.", "summary", {
		htmlTag: "div",
		className: "usi_discount usi_summary_row",
		region: "summary",
		kind: "text",
		fallbackText: "Discount: -$XX.XX",
		flattened: { liveText: false, textBaked: false }
	}),
	component("price_total", "Total Row", "summary-total", "Total row.", "summary", {
		htmlTag: "div",
		className: "usi_new_price usi_summary_row",
		region: "summary",
		kind: "text",
		fallbackText: "Total: $XX.XX",
		flattened: { liveText: false, textBaked: false }
	}),
	component("email_input", "Email Input", "email-input", "Email capture field for lead forms.", "form", {
		htmlTag: "label",
		className: "usi_field usi_email_field",
		region: "main",
		kind: "input",
		inputType: "email",
		fallbackText: "Enter your email",
		flattened: { liveText: false, textBaked: false }
	}),
	component("phone_input", "Phone Input", "phone-input", "Phone capture field.", "form", {
		htmlTag: "label",
		className: "usi_field usi_phone_field",
		region: "main",
		kind: "input",
		inputType: "tel",
		fallbackText: "Enter your phone number",
		flattened: { liveText: false, textBaked: false }
	}),
	component("survey_block", "Survey Block", "survey", "Survey prompt with answer options.", "form", {
		htmlTag: "section",
		className: "usi_survey",
		region: "main",
		kind: "survey",
		fallbackText: "How likely are you to purchase today?",
		flattened: { liveText: false, textBaked: false }
	}),
	component("copy_coupon", "Copy Coupon", "copy-coupon", "Coupon code block with copy action.", "utility", {
		htmlTag: "section",
		className: "usi_coupon",
		region: "main",
		kind: "coupon",
		fallbackText: "SAVE15",
		buttonText: "Copy Code",
		flattened: { liveText: false, textBaked: false }
	}),
	component("optin_component", "Opt-In", "optin", "Checkbox or opt-in consent row.", "form", {
		htmlTag: "label",
		className: "usi_optin",
		region: "main",
		kind: "optin",
		fallbackText: "Yes, send me updates and offers.",
		flattened: { liveText: false, textBaked: false }
	}),
	component("countdown_timer", "Countdown Timer", "countdown", "Urgency timer display.", "utility", {
		htmlTag: "div",
		className: "usi_countdown",
		region: "main",
		kind: "countdown",
		fallbackText: "09:59",
		flattened: { liveText: false, textBaked: false }
	}),
	component("progress_bar", "Progress Bar", "progress", "Visual progress indicator.", "utility", {
		htmlTag: "div",
		className: "usi_progress",
		region: "main",
		kind: "progress",
		flattened: { liveText: false, textBaked: false }
	}),
	component("close_control", "Close Button", "close-button", "Dismiss control.", "action", {
		htmlTag: "button",
		className: "usi_close_button",
		region: "shell",
		kind: "button",
		buttonText: "×",
		flattened: { liveText: false, textBaked: true }
	}),
	component("disclaimer_text", "Disclaimer", "disclaimer", "Legal or privacy copy.", "content", {
		htmlTag: "p",
		className: "usi_disclaimer",
		region: "main",
		kind: "text",
		fallbackText: "We use your information in accordance with our <a href=\"#\">Privacy Policy</a>.",
		flattened: { liveText: false, textBaked: false }
	}),
	component("media_panel", "Media Panel", "image", "Decorative or supporting media region.", "content", {
		htmlTag: "div",
		className: "usi_media_panel",
		region: "aside",
		kind: "media",
		flattened: { liveText: false, textBaked: true }
	})
];

export const COMPONENT_ROLE_MAP: Record<ComponentTemplateId, ExportRole> = COMMON_COMPONENTS.reduce(function (
  map,
  item
) {
  map[item.id] = item.role;
  return map;
}, {} as Record<ComponentTemplateId, ExportRole>);

export const COMPONENT_BY_ID: Record<ComponentTemplateId, CommonComponentDefinition> = COMMON_COMPONENTS.reduce(function (
  map,
  item
) {
  map[item.id] = item;
  return map;
}, {} as Record<ComponentTemplateId, CommonComponentDefinition>);

export const COMPONENT_BY_ROLE: Partial<Record<ExportRole, CommonComponentDefinition>> = COMMON_COMPONENTS.reduce(function (
  map,
  item
) {
  if (!map[item.role]) map[item.role] = item;
  return map;
}, {} as Partial<Record<ExportRole, CommonComponentDefinition>>);
