import path from "path";

export function getPathSplitter(dir: string): "/" | "\\" | string {
  return dir.includes('/') ? "/" : "\\";
}

export function covertSrc(path: string): string {
  return path.replace(/\//g, getPathSplitter(path));
}

/**
 * Formats the page name from the directory path
 */
export function formatPageName(dir: string): string {
  return dir === "src" ? "index" : path.basename(dir);
}

/**
 * Generates HTML content for a page
 */
export function generateHtml(pageTitle: string, mainPath: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>${pageTitle}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/${mainPath}"></script>
  </body>
</html>`;
}
