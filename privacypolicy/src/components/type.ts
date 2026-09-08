export interface FormState {
  client_id: string;
  client_secret: string;
  grant_id: string;
  ag_prod_name: string;
  description?: string;
  version?: string;
  biz_type: string;
}

export interface WangEditorInstance {
  valueHtml?: string;
  isEmpty: () => boolean;
  setHtml: (html: string) => void;
}
