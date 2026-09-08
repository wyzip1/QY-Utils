import React from "react";
import dayjs, { Dayjs } from "dayjs";
import ActionToForm from "src/components/ActionToForm";

import type { ItemConfig } from "src/components/Form";

interface FormData {
  item: number;
  text: string;
  openFlag: boolean;
  hobby: number[];
  sex: number;
  "test-date": Dayjs;
  "date-range": [Dayjs, Dayjs];
  address: [string, string, string];
}

const itemOptions: ItemConfig[] = [
  {
    type: "input",
    itemProps: {
      initialValue: "wyzip",
      label: "文本",
      name: "text",
      required: true,
      rules: [{ required: true, message: "请输入文本" }],
    },
  },
  {
    type: "select",
    itemProps: {
      label: "下拉选项",
      name: "item",
      required: true,
      rules: [{ required: true, message: "请选择选项" }],
      initialValue: 2,
    },
    valueProps: {
      allowClear: true,
      options: [
        { label: "选项一", value: 1 },
        { label: "选项二", value: 2 },
        { label: "选项三", value: 3 },
      ],
    },
  },
  {
    type: "switch",
    itemProps: {
      label: "开关测试",
      name: "openFlag",
      initialValue: true,
      valuePropName: "checked",
      rules: [
        {
          validator(_, value) {
            if (value) return Promise.resolve();
            return Promise.reject(new Error("请打开开关"));
          },
        },
      ],
    },
  },
  {
    type: "checkbox",
    valueList: [
      { label: "game", value: 1 },
      { label: "运动", value: 2 },
      { label: "nothing", value: 3 },
    ],
    itemProps: {
      label: "爱好",
      name: "hobby",
      required: true,
      rules: [{ required: true, message: "请选择爱好" }],
      initialValue: [1, 2],
    },
  },
  {
    type: "radio",
    valueList: [
      { label: "男", value: 1 },
      { label: "女", value: 2 },
    ],
    itemProps: {
      label: "性别",
      name: "sex",
      required: true,
      rules: [{ required: true, message: "请选择性别" }],
      initialValue: 1,
    },
  },
  {
    type: "date",
    itemProps: {
      initialValue: dayjs("2023-01-03"),
      label: "时间选择",
      name: "test-date",
      required: true,
      rules: [{ required: true, message: "请选择时间" }],
    },
    valueProps: {
      showTime: true,
    },
  },
  {
    type: "dateRanger",
    itemProps: {
      label: "时间范围",
      name: "date-range",
      initialValue: [
        dayjs("2023-01-03 16:09:00"),
        dayjs("2023-01-03 19:09:00"),
      ],
      required: true,
      rules: [{ required: true, message: "请选择时间范围" }],
    },
    valueProps: {
      showTime: true,
    },
  },
  {
    type: "cascader",
    itemProps: {
      label: "级联选择器",
      name: "address",
      required: true,
      initialValue: ["00200", "00210", "00212"],
      rules: [{ required: true, message: "请选择地址" }],
    },
    valueProps: {
      options: [
        {
          label: "北京市",
          value: "00100",
          children: [
            {
              label: "北京市",
              value: "00110",
              children: [
                {
                  label: "房山区",
                  value: "00111",
                },
                {
                  label: "丰台区",
                  value: "00112",
                },
              ],
            },
          ],
        },
        {
          label: "湖北省",
          value: "00200",
          children: [
            {
              label: "武汉市",
              value: "00210",
              children: [
                {
                  label: "洪山区",
                  value: "00211",
                },
                {
                  label: "江夏区",
                  value: "00212",
                },
              ],
            },
          ],
        },
      ],
    },
  },
];

export default function ActionToFormDemo() {
  const ActionOnSubmit = (data: FormData) => {
    return new Promise((rev) => {
      console.log("data", data);
      console.log("mock fetch");
      setTimeout(rev, 3000);
    });
  };

  return (
    <ActionToForm
      modalWidth={640}
      modalTitle="用户表单"
      formProps={{
        onSubmit: ActionOnSubmit,
        itemConfig: itemOptions,
      }}
      btnProps={{
        type: "primary",
      }}
    >
      ShowFormModal
    </ActionToForm>
  );
}
