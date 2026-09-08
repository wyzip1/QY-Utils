export interface DataMark {
  file: string;
  src: string;
  isEntry?: boolean;
  css?: string[];
  assets?: string[];
  imports?: string[];
}
export interface ManifestJSON {
  [filename: string]: DataMark;
}

export interface BuildFTLProps {
  ftlDir: string;
  entryDir?: string;
}
