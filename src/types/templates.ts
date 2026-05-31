export type TemplateStyle =
  | "modern"
  | "classic"
  | "minimal"
  | "executive"
  | "technical"
  | "compact";

export type TemplateCategory =
  | "professional"
  | "classic"
  | "technical"
  | "compact";

export type FontFamily = "inter" | "serif" | "system";

export type DocumentDensity = "compact" | "comfortable";

export type DesignSettings = {
  template: TemplateStyle;
  accentColor?: string;
  fontFamily?: FontFamily;
  density?: DocumentDensity;
  showPhoto?: boolean;
};

export type TemplateDefinition = {
  id: TemplateStyle;
  name: string;
  description: string;
  category: TemplateCategory;
  bestFor: string;
};
