/* eslint-disable no-case-declarations */
import React, { useImperativeHandle, useMemo, forwardRef } from "react";
import {
  Form as AForm,
  Input,
  Select,
  Button,
  Row,
  Col,
  Switch,
  Checkbox,
  Radio,
  DatePicker,
  Cascader,
} from "antd";
import { FormStyled } from "./styled";

import type {
  FormItemProps,
  InputProps,
  FormProps as AFormProps,
  SwitchProps,
  SelectProps,
  FormInstance as AFormInstance,
  RadioGroupProps,
  DatePickerProps,
  CascaderProps,
} from "antd";
import type { DefaultOptionType } from "rc-cascader";

import type { RangePickerProps } from "antd/es/date-picker/generatePicker";
import type { Dayjs } from "dayjs";

type TypeMap =
  | "input"
  | "select"
  | "switch"
  | "checkbox"
  | "radio"
  | "date"
  | "dateRanger"
  | "cascader";
type ValuePropsMap =
  | InputProps
  | SelectProps
  | typeof Checkbox.Group
  | RadioGroupProps
  | DatePickerProps
  | RangePickerProps<Dayjs>
  | CascaderProps<DefaultOptionType>;
type ValueList = Array<{ label: string; value: unknown; disabled?: boolean }>;

export interface ItemConfig {
  type: TypeMap;
  valueList?: ValueList;
  itemProps: FormItemProps;
  valueProps?: ValuePropsMap;
}

export interface FormProps {
  formProps?: AFormProps;
  itemConfig: ItemConfig[];
  title?: React.ReactNode | string;
  titleAlign?: "center" | "left" | "right";
  style?: React.CSSProperties;
  onReset?: () => void;
  onSubmit?: (data: any) => void;
  showBtns?: boolean | { submit: boolean; reset: boolean };
  loading?: boolean;
}

export interface FormInstance {
  form: AFormInstance;
  submit: () => void;
  reset: () => void;
}

function getControlValue<T extends TypeMap>(
  type: T,
  props?: ValuePropsMap,
  valueList?: ValueList
) {
  switch (type) {
    // eslint-disable-next-line prettier/prettier
    case "input": return <Input {...(props as InputProps)} />;
    // eslint-disable-next-line prettier/prettier
    case "select": return <Select {...(props as SelectProps)} />;
    // eslint-disable-next-line prettier/prettier
    case "switch": return <Switch {...(props as SwitchProps)} />;
    // eslint-disable-next-line prettier/prettier
    case "date": return <DatePicker {...(props as DatePickerProps)} />;
    // eslint-disable-next-line prettier/prettier
    case "dateRanger": return <DatePicker.RangePicker {...(props as RangePickerProps<Dayjs>)} />
    // eslint-disable-next-line prettier/prettier
    case "cascader": return <Cascader {...(props as CascaderProps<DefaultOptionType>)} />
    case "checkbox":
      return (
        <Checkbox.Group {...(props as typeof Checkbox.Group)}>
          {valueList?.map((item, idx) => (
            <Checkbox key={idx} value={item.value} disabled={item.disabled}>
              {item.label}
            </Checkbox>
          ))}
        </Checkbox.Group>
      );
    case "radio":
      return (
        <Radio.Group {...(props as RadioGroupProps)}>
          {valueList?.map((item, idx) => (
            <Radio key={idx} disabled={item.disabled} value={item.value}>
              {item.label}
            </Radio>
          ))}
        </Radio.Group>
      );
  }
}

function Form(
  {
    itemConfig,
    formProps = { labelCol: { span: 4 } },
    title,
    titleAlign = "left",
    style,
    onReset,
    onSubmit,
    showBtns = true,
    loading,
  }: FormProps,
  ref?: React.Ref<FormInstance>
) {
  const [form] = AForm.useForm();

  useImperativeHandle(ref, () => ({
    form,
    submit: () => form.submit(),
    reset: () => form.resetFields(),
  }));

  const show = useMemo(() => {
    if (showBtns === true) return { submit: true, reset: true };
    return showBtns;
  }, [showBtns]);

  return (
    <FormStyled style={style} titleAlign={titleAlign}>
      <AForm form={form} onFinish={onSubmit} onReset={onReset} {...formProps}>
        {title && <div className="form-title">{title}</div>}
        {itemConfig.map((config, idx) => (
          <AForm.Item key={idx} {...config.itemProps}>
            {getControlValue(config.type, config.valueProps, config.valueList)}
          </AForm.Item>
        ))}
      </AForm>
      {show && (
        <Row>
          <Col span={formProps?.labelCol?.span}></Col>
          <div className="footer-btns">
            {show.submit && (
              <Button
                loading={loading}
                type="primary"
                onClick={() => form.submit()}
              >
                提交
              </Button>
            )}
            {show.reset && (
              <Button onClick={() => form.resetFields()}>重置</Button>
            )}
          </div>
        </Row>
      )}
    </FormStyled>
  );
}

export default forwardRef(Form);
