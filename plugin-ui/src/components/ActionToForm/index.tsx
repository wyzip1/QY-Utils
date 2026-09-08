import React, { useState, createRef } from "react";
import { Modal } from "antd";
import Action from "../Action";
import Form, { FormInstance } from "../Form";

import type { ButtonProps } from "antd";
import type { FormProps } from "../Form";

interface ATFormProps extends Omit<FormProps, "onSubmit"> {
  onSubmit: (data: any) => Promise<unknown | undefined>;
}

interface ActionToFormProps {
  btnProps?: ButtonProps;
  formProps: ATFormProps;
  modalTitle?: string;
  children: React.ReactNode;
  autoConfirmClose?: Boolean;
  modalWidth?: number | string;
}

type OnClick = React.MouseEventHandler<HTMLAnchorElement> &
  React.MouseEventHandler<HTMLButtonElement>;

const covertOnClick = (callback: OnClick, origin?: OnClick): OnClick => {
  return (
    e: React.MouseEvent<HTMLButtonElement & HTMLAnchorElement, MouseEvent>
  ) => {
    callback(e);
    origin?.(e);
  };
};

const setBtnProps = (props: ButtonProps, onClick: OnClick) => {
  props.onClick = covertOnClick(onClick, props.onClick);
};

export default function ActionToForm({
  btnProps = {},
  children,
  formProps,
  modalTitle,
  autoConfirmClose = true,
  modalWidth,
}: ActionToFormProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  const FormInstance = createRef<FormInstance>();

  const cancel = () => {
    setOpen(false);
    FormInstance.current?.reset();
  };

  const onConfirm = () => FormInstance.current?.submit();

  setBtnProps(btnProps, () => setOpen(true));

  const originSubmit = formProps.onSubmit;

  formProps.onSubmit = async (data: Record<string, unknown>) => {
    try {
      setConfirmLoading(true);
      await originSubmit?.(data);
      autoConfirmClose && cancel();
      console.log("123123");
    } catch (error) {
      console.log("onSubmit Error:", error);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      <Action btnProps={btnProps}>{children}</Action>
      <Modal
        width={modalWidth}
        title={modalTitle}
        open={open}
        closable
        onCancel={cancel}
        onOk={onConfirm}
        confirmLoading={confirmLoading}
      >
        <Form ref={FormInstance} {...formProps} showBtns={false} />
      </Modal>
    </>
  );
}
