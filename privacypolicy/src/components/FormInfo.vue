<template>
  <h3 class="mb-3">商家协议信息</h3>
  <a-form
    ref="formRef"
    :model="formState"
    name="basic"
    :label-col="{ span: 7 }"
    :wrapper-col="{ span: 17 }"
    autocomplete="off"
    @finish="$emit('submit', formState)"
  >
    <a-form-item
      label="client_id"
      name="client_id"
      :rules="[{ required: true, message: '请输入client_id' }]"
    >
      <a-input v-model:value="formState.client_id" />
    </a-form-item>

    <a-form-item
      label="client_secret"
      name="client_secret"
      :rules="[{ required: true, message: '请输入client_secret' }]"
    >
      <a-input v-model:value="formState.client_secret" />
    </a-form-item>

    <a-form-item
      label="店铺ID"
      name="grant_id"
      :rules="[{ required: true, message: '请输入店铺ID' }]"
    >
      <a-input v-model:value="formState.grant_id" />
    </a-form-item>

    <a-form-item
      label="协议名称"
      name="ag_prod_name"
      :rules="[{ required: true, message: '请输入协议名称' }]"
    >
      <a-input v-model:value="formState.ag_prod_name" />
    </a-form-item>

    <a-form-item label="协议描述" name="description">
      <a-input v-model:value="formState.description" />
    </a-form-item>

    <a-form-item label="版本" name="version">
      <a-input v-model:value="formState.version" />
    </a-form-item>

    <a-form-item :wrapper-col="{ offset: 7, span: 17 }">
      <a-button type="primary" html-type="submit">提交</a-button>
      <a-button type="default" class="ml-2" @click="resetForm()">
        重置
      </a-button>
    </a-form-item>
  </a-form>
</template>
<script setup lang="ts">
import { defaultFormState } from "@/config";
import { FormInstance } from "ant-design-vue";
import { FormState } from "./type";

defineEmits<{
  submit: [formState: FormState];
}>();

const formState = ref<FormState>({
  ...defaultFormState,
  grant_id: "",
  ag_prod_name: "",
  description: "",
  version: "",
});

defineExpose({
  setFormState: (state: Partial<FormState>) => {
    formState.value = { ...formState.value, ...state };
  },
  getFormData: () => formState.value,
});

const formRef = ref<FormInstance>();

function resetForm() {
  formRef.value?.resetFields();
}
</script>
