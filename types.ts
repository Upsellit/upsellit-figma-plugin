/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnyNode = any;

export type ComponentTemplateId =
  | 'modal_shell'
  | 'sidebar_shell'
  | 'bottom_bar_shell'
  | 'content_stack'
  | 'headline_block'
  | 'subtext_block'
  | 'eyebrow_block'
  | 'divider'
  | 'primary_button'
  | 'thank_you_button'
  | 'no_thanks_button'
  | 'product_grid'
  | 'product_card'
  | 'product_image'
  | 'product_title'
  | 'product_subtitle'
  | 'product_price'
  | 'product_button'
  | 'price_table'
  | 'price_subtotal'
  | 'price_discount'
  | 'price_total'
  | 'email_input'
  | 'phone_input'
  | 'survey_block'
  | 'copy_coupon'
  | 'optin_component'
  | 'countdown_timer'
  | 'progress_bar'
  | 'close_control'
  | 'disclaimer_text'
  | 'media_panel';

export type ExportRole =
  | 'modal-root'
  | 'content'
  | 'headline'
  | 'subtext'
  | 'eyebrow'
  | 'divider'
  | 'cta'
  | 'secondary-cta'
  | 'product-card'
  | 'product-list'
  | 'product-image'
  | 'product-title'
  | 'product-subtitle'
  | 'product-price'
  | 'product-cta'
  | 'summary'
  | 'summary-subtotal'
  | 'summary-discount'
  | 'summary-total'
  | 'email-input'
  | 'phone-input'
  | 'survey'
  | 'copy-coupon'
  | 'optin'
  | 'countdown'
  | 'progress'
  | 'disclaimer'
  | 'close-button'
  | 'image'
  | 'background'
  | 'ignore'
  | 'other';

export type LayoutKind = 'NONE' | 'HORIZONTAL' | 'VERTICAL';
export type SizingMode = 'FIXED' | 'HUG' | 'FILL' | 'AUTO';
export type PromoPattern = 'cart_recovery_split' | 'grid' | 'carousel' | 'single';
export type PromoLayout = 'mobile' | 'desktop';

export type NodeLayout = {
  mode: LayoutKind;
  wrap: boolean;
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  primaryAlign: string;
  counterAlign: string;
  widthMode: SizingMode;
  heightMode: SizingMode;
};

export type NodeStyle = {
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  textAlign?: string;
  letterSpacing?: number;
  textCase?: string;
};

export type ThemeVariableSnapshot = {
  collectionName: string;
  name: string;
  resolvedType: 'STRING' | 'FLOAT' | 'COLOR';
  value: string | number | { r: number; g: number; b: number; a?: number };
};

export type NodeBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NormalizedNode = {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  ignored: boolean;
  roleOverride?: ExportRole;
  componentOverride?: ComponentTemplateId;
  collection?: string;
  text?: string;
  bounds: NodeBounds;
  layout: NodeLayout;
  style: NodeStyle;
  children: NormalizedNode[];
  detectedRole?: ExportRole;
  roleConfidence?: number;
  metadata: {
    exportRole?: string;
    exportComponent?: string;
    exportCollection?: string;
    exportIgnore?: string;
  };
};

export type Product = {
  title?: string;
  subtitle?: string;
  price?: string;
  cta?: string;
  imageAlt?: string;
  imageAsset?: string;
  _imageNodeId?: string;
};

export type SummaryRow = {
  label: string;
  value?: string;
};

export type Summary = {
  subtotal?: string;
  discount?: string;
  total?: string;
  rows: SummaryRow[];
};

export type CTA = {
  label: string;
};

export type PromoExport = {
  pattern: PromoPattern;
  layout: PromoLayout;
  headline?: string;
  subtext?: string;
  eyebrow?: string;
  closeButton: boolean;
  products: Product[];
  summary?: Summary;
  primaryCta?: CTA;
  disclaimer?: string;
};

export type PatternReport = {
  pattern: string;
  warnings: string[];
};

export type AnalysisResult = {
  ast: NormalizedNode;
  schema: PromoExport;
  report: PatternReport;
  roleMap: Record<string, { role: ExportRole; confidence: number }>;
  dynamicNodeIds: string[];
  headlineNodeId?: string;
  subtextNodeId?: string;
  eyebrowNodeId?: string;
  summaryNodeId?: string;
  productContainerNodeId?: string;
  productCardNodeIds: string[];
  primaryCtaNodeId?: string;
  disclaimerNodeId?: string;
};

export type ExportFile =
  | { name: string; text: string }
  | { name: string; base64: string; mime: string };

export type FlattenedVariant = {
  html: string;
  css: string;
  imageFileName: string;
  js: string;
  contentHTML: string;
};

export type CommonComponentDefinition = {
  id: ComponentTemplateId;
  label: string;
  role: ExportRole;
  description: string;
  category: 'shell' | 'layout' | 'content' | 'product' | 'summary' | 'form' | 'action' | 'utility';
  render: {
    // Keep export behavior close to the component definition so new
    // components can usually be added without touching multiple render maps.
    htmlTag: string;
    className: string;
    region: 'shell' | 'main' | 'aside' | 'product' | 'summary' | 'utility';
    kind:
      | 'container'
      | 'text'
      | 'button'
      | 'input'
      | 'survey'
      | 'coupon'
      | 'optin'
      | 'countdown'
      | 'progress'
      | 'media';
    fallbackText?: string;
    inputType?: 'email' | 'tel' | 'text';
    buttonText?: string;
    flattened: {
      liveText: boolean;
      textBaked: boolean;
    };
  };
};



export interface ComponentRenderer {
	renderHtml(
		node: NormalizedNode | undefined,
		definition: CommonComponentDefinition | undefined,
		hideVisibleText: boolean,
		context?: Record<string, unknown>
	): string;
	renderCss(
		nodes: NormalizedNode[],
		root: NormalizedNode,
		frameScale: number,
		context?: Record<string, unknown>
	): string;
	shouldRender(root: NormalizedNode): boolean;
}