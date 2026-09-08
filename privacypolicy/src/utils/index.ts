import { FormState } from "@/components/type";

export const request = (api: string, data: any) => {
  return window.ipcRenderer.invoke("api", { api, data: JSON.stringify(data) });
};

export function getTokenParams(data: FormState) {
  return {
    client_id: data.client_id,
    client_secret: data.client_secret,
    grant_id: data.grant_id,
  };
}
