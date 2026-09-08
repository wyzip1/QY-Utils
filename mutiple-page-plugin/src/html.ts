import { HTML_DEFAULTS } from './constants';
import type { HtmlTemplateOptions } from './types';

/**
 * Default HTML template generator
 */
export function defaultTemplate({
  title,
  scriptPath,
  lang = HTML_DEFAULTS.LANG,
  viewport = HTML_DEFAULTS.VIEWPORT,
  rootId = HTML_DEFAULTS.ROOT_ID,
  head = [],
  body = []
}: HtmlTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="${viewport}" />
    <title>${title}</title>
    ${head.join('\n    ')}
  </head>
  <body>
    <div id="${rootId}"></div>
    ${body.join('\n    ')}
    <script type="module" src="/${scriptPath}"></script>
  </body>
</html>`};