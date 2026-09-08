export interface EntryConfig {
  /**
   * Custom entry file patterns (e.g., ['app.ts', 'index.ts'])
   * Defaults to ['main.ts', 'main.tsx']
   */
  patterns?: string[];

  /**
   * Transform the entry path before it's used
   * Useful for custom entry file handling
   */
  transform?: (entryPath: string) => string;
}

export interface HTMLConfig {
  /**
   * customize the title of each page
   */
  title?: string;
  /**
   * Additional head tags to inject
   * Array of HTML strings to insert in <head>
   */
  head?: string[];
  
  /**
   * Additional body tags to inject before the entry script
   * Array of HTML strings to insert in <body>
   */
  body?: string[];

  /**
   * Custom template function to generate HTML
   * Complete control over the HTML structure
   */
  template?: (options: HtmlTemplateOptions) => string;
}

export interface HtmlTemplateOptions {
  title: string;
  scriptPath: string;
  lang?: string;
  viewport?: string;
  rootId?: string;
  head?: string[];
  body?: string[];
}

export type MultiPageAutoOptions = HTMLConfig & {
  /**
   * Custom ignore patterns for file globbing
   */
  ignore?: string[];

  /**
   * Entry file configuration
   */
  entry?: EntryConfig;

  pageConfig?: Record<string, HTMLConfig>
}