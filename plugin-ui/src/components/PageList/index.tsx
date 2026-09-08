import React, {
  ForwardedRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Search from "../Search";
import { Table } from "antd";

import type { Config, SearchInstance, State } from "../Search/type";
import type { TablePaginationConfig, TableProps } from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import type {
  ColumnsType,
  FilterValue,
  TableCurrentDataSource,
  SorterResult,
} from "antd/es/table/interface";

export type SortType<T> = SorterResult<T> | SorterResult<T>[];

export interface PageOptions {
  pageNum: number;
  pageSize: number;
}
export interface PageInstace {
  search(): Promise<void>;
  reset(): void;
}

interface PageProps<DataType> {
  inline?: boolean;
  className?: string;
  searchOptions: Config;
  doSearch(
    formData: State,
    pageOptions: PageOptions,
    sorter: SortType<DataType>,
    isReset: boolean
  ): Promise<unknown>;
  columns: ColumnsType<DataType>;
  rowKey?: string;
  showSelection?: boolean | "checkbox" | "radio";
  searchBtnExtend?: React.ReactNode;
  disabledName?: keyof DataType;
  batchControl?: (
    getSelectedRowData: () => DataType[],
    removeSelectRowData: (ids?: (number | string)[]) => void
  ) => React.ReactNode;
  total?: number;
  dataSource?: Array<DataType>;
  toRef?: ForwardedRef<PageInstace>;
  defaultLabelWidth?: string | number;
  actionStyle?: React.CSSProperties;
  actionClassName?: string;
  selectionChange?(keys: React.Key[], list: DataType[]): void;
  selectKeys?: React.Key[];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  scroll?: TableProps<DataType>["scroll"];
  size?: TableProps<DataType>["size"];
}

export interface Sorter {
  field: React.Key | readonly React.Key[];
  type: "ascend" | "descend";
}

export type SorterOption = Sorter[];

export default function PageList<DataType extends object = {}>({
  className,
  searchOptions,
  doSearch,
  columns,
  rowKey,
  searchBtnExtend,
  showSelection,
  disabledName,
  batchControl,
  total,
  dataSource,
  toRef,
  inline,
  defaultLabelWidth,
  actionClassName,
  actionStyle,
  selectionChange,
  selectKeys,
  pageSizeOptions,
  defaultPageSize,
  scroll,
  size,
}: PageProps<DataType>) {
  const searchRef = useRef<SearchInstance>(null);
  const [formData, setFormData] = useState<State>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [pageNum, setPageNum] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize || 10);
  const [sorter, setSorter] = useState<SortType<DataType>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRowData, setSelectedRowData] = useState<DataType[]>([]);

  const clearSelectRowData = () => {
    setSelectedRowKeys([]);
    setSelectedRowData([]);
  };

  const translateSorter = (sorter: SortType<DataType>): SorterOption => {
    const option = Array.isArray(sorter) ? sorter : [sorter];
    const nonullSortList = option.filter(item => item.field && item.order);
    return nonullSortList.map(item => ({
      field: item.field!,
      type: item.order!,
    }));
  };

  const onSearch = async (
    formData: State,
    pageOptions: PageOptions = { pageNum, pageSize }
  ) => {
    try {
      setLoading(true);
      const sorterOption = translateSorter(sorter);
      clearSelectRowData();
      await doSearch(formData, pageOptions, sorterOption, false);
    } catch (error) {
      console.group("Page Component doSearch Catch Error:");
      console.log(error);
      console.groupEnd();
    } finally {
      setLoading(false);
    }
  };

  const _doSearch = (formData: State) => {
    setPageNum(1);
    onSearch(formData);
  };

  const onReset = () => {
    setPageNum(1);
    setPageSize(10);
    clearSelectRowData();
    onSearch(formData, { pageNum: 1, pageSize: 10 });
  };

  const removeSelectRowData = (ids?: (number | string)[]) => {
    if (!ids) return clearSelectRowData();
    for (const id of ids) {
      const idx = selectedRowKeys.indexOf(id);
      if (idx === -1) continue;
      selectedRowKeys.splice(idx, 1);
      selectedRowData.splice(idx, 1);
    }
    setSelectedRowKeys([...selectedRowKeys]);
    setSelectedRowData([...selectedRowData]);
  };

  useImperativeHandle(toRef, () => ({
    search: () => onSearch(searchRef.current?.getFormData() || {}),
    reset: onReset,
  }));

  useEffect(() => {
    if (loading) return;
    onSearch(searchRef.current?.getFormData() || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, pageSize, sorter]);

  const TableChange = (
    pageOptions: TablePaginationConfig,
    filter: Record<string, FilterValue | null>,
    sorter: SortType<DataType>,
    extra: TableCurrentDataSource<DataType>
  ) => {
    pageOptions.current && setPageNum(pageOptions.current);
    pageOptions.pageSize && setPageSize(pageOptions.pageSize);
    setSorter(sorter);
  };

  const rowSelection = useMemo<TableRowSelection<DataType> | undefined>(() => {
    if (!showSelection) return;
    const options: TableRowSelection<DataType> = {};
    if (showSelection === true) options.type = "checkbox";
    else options.type = showSelection;
    options.selectedRowKeys = selectedRowKeys;
    options.onChange = (selectedKeys, selectedData) => {
      if (!selectKeys) {
        setSelectedRowKeys(selectedKeys);
        setSelectedRowData(selectedData);
      }
      selectionChange?.(selectedKeys, selectedData);
    };
    const disbaledFn = (record: DataType) => ({
      disabled: Boolean(record[disabledName!]),
    });
    options.getCheckboxProps = disabledName === undefined ? undefined : disbaledFn;
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSelection, selectedRowKeys]);

  useEffect(() => {
    setSelectedRowKeys(selectKeys || []);
  }, [selectKeys]);

  return (
    <div className={className}>
      <Search
        actionClassName={actionClassName}
        actionStyle={actionStyle}
        inline={inline}
        defaultLabelWidth={defaultLabelWidth}
        ref={searchRef}
        loading={loading}
        config={searchOptions}
        onSearch={_doSearch}
        onChange={setFormData}
        onReset={onReset}
        searchBtnExtend={searchBtnExtend}
      />
      {batchControl && (
        <div style={{ marginTop: 15 }}>
          {batchControl(() => selectedRowData, removeSelectRowData)}
        </div>
      )}
      <Table
        style={{ marginTop: 15 }}
        bordered
        loading={loading}
        dataSource={dataSource}
        columns={columns}
        rowKey={rowKey}
        rowSelection={rowSelection}
        scroll={scroll}
        size={size}
        pagination={{
          pageSizeOptions: pageSizeOptions || [10, 20, 30],
          current: pageNum,
          pageSize,
          total,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: total => `共${total}条`,
        }}
        onChange={TableChange}
      />
    </div>
  );
}
