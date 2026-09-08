import React, {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Button } from "antd";
import { SearchStyled } from "./styled";
import { covertLength, initComponentList } from "./utils";
import RenderRow from "./components/RenderRow";
import type { Options, SearchInstance, SearchProps, State } from "./type";

function Search(
  {
    inline,
    config,
    defaultLabelWidth = 60,
    loading,
    onChange,
    onSearch,
    onReset,
    searchBtnExtend,
    actionClassName,
    actionStyle,
  }: SearchProps,
  ref: ForwardedRef<SearchInstance>
) {
  const [formData, setFormData] = useState<State>(initFormData());
  const [isReset, setIsReset] = useState<boolean>(false);

  function initFormData() {
    return config.reduce((prev, options) => {
      options.forEach(item => (prev[item.key] = item.defaultValue));
      return prev;
    }, {});
  }

  useImperativeHandle(ref, () => ({
    getFormData: () => formData,
  }));

  useEffect(() => {
    onChange?.(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  useEffect(() => {
    if (!loading) setIsReset(false);
  }, [loading]);

  const componentList = useMemo<Options[][]>(() => initComponentList(config), [config]);

  const _defaultLabelWidth = useMemo<string>(
    () => covertLength(defaultLabelWidth)!,
    [defaultLabelWidth]
  );

  const reset = () => {
    const initData = initFormData();
    setIsReset(true);
    setFormData(initData);
    onReset?.(initData);
  };

  const search = () => {
    onSearch(formData);
  };

  return (
    <SearchStyled defaultLabelWidth={_defaultLabelWidth} inline={inline}>
      <div className="input-content">
        {componentList.map((item, idx) => (
          <RenderRow
            search={search}
            options={item}
            key={idx}
            state={formData}
            setState={setFormData}
          />
        ))}
      </div>
      <div className={`action-control ${actionClassName || ""}`} style={actionStyle}>
        <Button loading={!isReset && loading} type="primary" onClick={search}>
          查询
        </Button>
        <Button loading={isReset && loading} type="default" onClick={reset}>
          重置
        </Button>
        {!inline && searchBtnExtend}
      </div>
      {inline && searchBtnExtend && <div className="inline-ext-btns">{searchBtnExtend}</div>}
    </SearchStyled>
  );
}

export default forwardRef(Search);
