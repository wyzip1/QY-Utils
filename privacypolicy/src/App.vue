<template>
  <a-config-provider :locale="zhCN">
    <resize-area class="w-full h-full" :width-r="400">
      <template #left>
        <div class="pl-2 box-border">
          <a-tabs
            v-model:active-key="activeTab"
            @change="(v) => onChangeTab(v as string)"
          >
            <a-tab-pane key="text-editor" tab="富文本"> </a-tab-pane>
            <a-tab-pane key="code-editor" tab="源码编辑"> </a-tab-pane>
          </a-tabs>
        </div>
        <wang-editor
          v-show="activeTab === 'text-editor'"
          style="height: calc(100% - 62px)"
          ref="editorRef"
        />
        <code-editor
          v-show="activeTab === 'code-editor'"
          ref="codeEditorRef"
          style="height: calc(100% - 62px)"
        />
      </template>
      <template #right>
        <div class="p-5 pl-2 box-border h-full overflow-auto">
          <form-info ref="formRef" @submit="onSubmit" />

          <privacy-manage ref="privacyManageRef" />

          <div class="flex gap-3">
            <a-input v-model:value="inputCode" placeholder="协议标识" />
            <a-button type="primary" danger @click="handleDelete">
              删除
            </a-button>
          </div>
        </div>
      </template>
    </resize-area>
  </a-config-provider>
</template>

<script setup lang="ts">
import { message } from "ant-design-vue";
import { FormState } from "./components/type";
import { getTokenParams, request } from "./utils";
import { WangEditorInstance } from "@/components/type";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import localState from "./utils/localState";
dayjs.locale("zh-cn");

const activeTab = ref<"text-editor" | "code-editor">("text-editor");
const editorRef = ref<WangEditorInstance>();
const codeEditorRef = ref<{
  setCode: (code: string) => void;
  getCode: () => string;
}>();
const privacyManageRef = ref<{ pushCode: any }>();
const inputCode = ref("");

const getRichText = () =>
  ({
    "text-editor": editorRef.value?.valueHtml,
    "code-editor": codeEditorRef.value?.getCode(),
  })[activeTab.value];

function getPrivacyParams(data: FormState) {
  return {
    ag_prod_name: data.ag_prod_name,
    rich_text: getRichText(),
    description: data.description,
    version: data.version,
    biz_type: data.biz_type,
  };
}

async function onSubmit(data: FormState) {
  try {
    if (
      (activeTab.value === "text-editor" && editorRef.value?.isEmpty()) ||
      (activeTab.value === "code-editor" && !codeEditorRef.value?.getCode())
    )
      return message.warning("协议内容不能为空");
    const privacyParams = getPrivacyParams(data);
    const tokenParams = getTokenParams(data);
    const res = await request("createAgreement", {
      data: privacyParams,
      tokenParams,
    });

    if (!res.success)
      return message.error(res.message || res.gw_err_resp.err_msg);
    message.success("协议创建成功");
    privacyManageRef.value?.pushCode(tokenParams.grant_id, {
      title: privacyParams.ag_prod_name,
      version: privacyParams.version,
      desc: privacyParams.description,
      client_id: tokenParams.client_id,
      client_secret: tokenParams.client_secret,
      code: res.data?.ag_prod_code,
    });
  } catch (err) {
    console.log("create err", err);
    message.error("协议创建失败");
  }
}

function onChangeTab(v: string) {
  if (v === "code-editor") {
    codeEditorRef.value?.setCode(editorRef.value?.valueHtml || "");
  } else editorRef.value?.setHtml(codeEditorRef.value?.getCode() || "");
}
interface FormInfoInstance {
  setFormState: (state: Partial<FormState>) => void;
  getFormData: () => FormState;
}
const formRef = ref<FormInfoInstance>();

async function handleDelete() {
  const tokenParams = getTokenParams(formRef.value!.getFormData());

  const res = await request("deleteAgreement", {
    data: { ag_prod_code: inputCode.value },
    tokenParams,
  });
  if (!res.success) return message.error(res.message);
  message.success("协议删除成功");

  const idx =
    localState.state.codeList?.[tokenParams.grant_id]?.findIndex(
      (item: any) => item.code === inputCode.value,
    ) ?? -1;

  if (idx === -1) return;
  // 缓存数据同步删除
  localState.setState(({ codeList }) => {
    codeList[tokenParams.grant_id].splice(idx, 1);
    if (codeList[tokenParams.grant_id].length === 0)
      delete codeList[tokenParams.grant_id];
  });
}
</script>

<style lang="scss" scoped></style>
