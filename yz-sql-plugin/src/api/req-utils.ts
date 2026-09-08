import { AxiosProgressEvent, AxiosRequestConfig, CancelToken } from "axios";
import request, {
  RequestArraybufferResponse,
  RequestResponse,
} from "./request";
import { formatMutipleNum } from "@/utils";

interface CreateRequest {
  <T, R>(
    getReqConfig: (params: T) => AxiosRequestConfig,
  ): (params: T, cancelToken?: CancelToken) => Promise<RequestResponse<R>>;

  <R>(
    getReqConfig: () => AxiosRequestConfig,
  ): (
    params?: unknown,
    cancelToken?: CancelToken,
  ) => Promise<RequestResponse<R>>;
}
export const createRequest: CreateRequest = (
  requestCallback: (params: unknown) => AxiosRequestConfig,
) => {
  return (params: unknown, cancelToken?: CancelToken) =>
    request({ cancelToken, ...requestCallback(params) });
};

export const downloadFile = async (
  config: AxiosRequestConfig,
): Promise<void> => {
  const res = (await request({
    responseType: "arraybuffer",
    ...config,
  })) as unknown as RequestArraybufferResponse;

  const blob = new Blob([res.value], { type: res.type });
  const url = URL.createObjectURL(blob);
  // window.open(url); ??
  const link = document.createElement("a");
  link.download = decodeURIComponent(res.filename);
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

export interface UploadOptions {
  sliceSize: number;
  onInit?: () => unknown | Promise<unknown>;
  onUpload: (
    slice: Blob,
    info: { index: number; bytes: [number, number] },
    onProgress?: (progressEvent: AxiosProgressEvent) => unknown,
  ) => unknown | Promise<unknown>;
  onTotalProgress?: (percent: number, loaded: number) => unknown;
  onEnd?: () => unknown | Promise<unknown>;
}

const uploadQueue: (unknown | Promise<unknown>)[] = [];
const uploadedDataQueue: number[] = [];

export const uploadFile = async (file: File, options: UploadOptions) => {
  await options?.onInit?.();

  const sliceCount = Math.ceil(file.size / options.sliceSize);
  for (let i = 0; i < sliceCount; i++) {
    const bytes: [number, number] = [
      i * options.sliceSize,
      (i + 1) * options.sliceSize,
    ];

    const sliceFile = file.slice(bytes[0], bytes[1]);
    const info = { index: i, bytes };

    const uploadTask = options.onUpload(sliceFile, info, (event) => {
      uploadedDataQueue[i] = event.loaded;
      const totalLoaded =
        uploadedDataQueue.reduce((a, b) => a + (b || 0), 0) / file.size;
      const percent = formatMutipleNum(totalLoaded, 0.01) as number;

      options.onTotalProgress?.(percent, totalLoaded);
    });

    uploadQueue.push(uploadTask);
  }

  const batchRes = await Promise.all(uploadQueue);

  return options?.onEnd?.() || batchRes;
};
