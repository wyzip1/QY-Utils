import List from "@/api/model/List";
import { PageOptions } from "@/components/PageList";
import { useEffect, useRef, useState } from "react";

// type FetchApi = (...args: any) => Promise<any>;
type ItemType<T> = T extends (...args: any) => Promise<List<infer V>> ? V : never;

export default function useSearchList<T extends (...args: any) => Promise<List<any>>>(
  fetchApi: T,
  searchParams: Omit<Parameters<T>[0], "pageNum" | "pageSize">,
  searchCall?: () => void,
  defaultOptions: { pageSize?: number; initSearch?: boolean } = { initSearch: true }
): [
  (pageOptions: PageOptions) => void,
  { pageNum: number; pageSize: number; total: number; loading: boolean; list: ItemType<T>[] },
  {
    doSearch: () => void;
    updateList: (callback?: ((list: Array<ItemType<T>>) => void) | undefined) => void;
    refreshList: () => void;
  }
] {
  const [pageNum, setPageNum] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultOptions?.pageSize || 10);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [list, setList] = useState<Array<ItemType<T>>>([]);

  const updateParams = (params: PageOptions) => {
    setPageNum(params.pageNum || pageNum);
    setPageSize(params.pageSize || pageSize);
  };

  const onSearch = (pageNum: number, pageSize: number) => {
    searchCall?.();
    setLoading(true);

    fetchApi({ pageNum, pageSize, ...searchParams })
      .then(res => {
        setList(res.list);
        setTotal(res.total);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const doSearch = () => {
    if (pageNum === 1) onSearch(1, pageSize);
    else setPageNum(1);
  };

  const updateList = (callback?: (list: Array<ItemType<T>>) => void) => {
    callback?.(list);
    setList([...list]);
  };

  const refreshList = () => {
    onSearch(pageNum, pageSize);
  };

  const initRef = useRef<boolean>(true);

  useEffect(() => {
    if (initRef.current && !defaultOptions.initSearch) {
      initRef.current = false;
      return;
    }
    onSearch(pageNum, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, pageSize]);

  return [
    updateParams,
    { pageNum, pageSize, total, loading, list },
    { doSearch, updateList, refreshList },
  ];
}
