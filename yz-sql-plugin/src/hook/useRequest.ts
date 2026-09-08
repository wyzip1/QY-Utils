import axios, { CancelToken } from "axios";

type RequestResult<T> = T extends (...args: any[]) => Promise<infer V>
  ? V
  : never;

const defaultOptions = { initSearch: true, autoEmpty: true };

export default function useRequest<
  T extends (params: any, cancelToken?: CancelToken) => Promise<any>,
>(
  requestApi: T,
  options?: {
    initRequestParams?: Parameters<T>[0] | undefined;
    initSearch?: boolean;
    autoEmpty?: boolean;
  },
): [
  (params?: Parameters<T>[0]) => Promise<RequestResult<T>>,
  Ref<RequestResult<T> | undefined>,
  Ref<boolean>,
  () => void,
] {
  const _options = { ...defaultOptions, ...options };

  const loading = ref(false);
  const data = ref<RequestResult<T>>();

  let cancelTokenSourceRef = axios.CancelToken.source();

  async function request(params?: Parameters<T>[0]) {
    loading.value = true;
    try {
      if (_options.autoEmpty) data.value = undefined;
      const res = await requestApi(params, cancelTokenSourceRef.token);
      data.value = res;
      return res;
    } finally {
      loading.value = false;
    }
  }

  function cancelRequest() {
    cancelTokenSourceRef.cancel();
    cancelTokenSourceRef = axios.CancelToken.source();
  }

  onMounted(() => {
    if (!_options.initSearch) return;
    request(_options.initRequestParams);
  });

  onBeforeUnmount(() => {
    cancelRequest();
  });

  return [request, data, loading, cancelRequest];
}
