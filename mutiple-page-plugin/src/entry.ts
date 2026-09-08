import { glob } from 'glob';
import path from 'path';
import { ENTRY_PATTERNS } from './constants';
import { formatPageName } from './utils';
import type { EntryConfig } from './types';

export interface EntryPoint {
  pageName: string;
  entryPath: string;
  htmlPath: string;
  directory: string;
}

/**
 * Finds all entry points in the project
 */
export async function findEntryPoints(
  ignorePatterns: string[],
  config?: EntryConfig
): Promise<EntryPoint[]> {
  const patterns = config?.patterns || ENTRY_PATTERNS;
  const entryFiles = await glob(`**/{${patterns.join(',')}}`, {
    ignore: ignorePatterns
  });

  return entryFiles.map(file => {
    const directory = path.dirname(file);
    const pageName = formatPageName(directory);
    const entryPath = config?.transform ? config.transform(file) : file;
    
    return {
      pageName,
      entryPath,
      htmlPath: path.resolve(pageName + '.html'),
      directory
    };
  });
}