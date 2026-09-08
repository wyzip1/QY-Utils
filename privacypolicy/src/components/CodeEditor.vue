<template>
  <vue-monaco-editor
    :value="code"
    theme="vs-dark"
    language="html"
    :options="MONACO_EDITOR_OPTIONS"
    @mount="handleMount"
    @change="$emit('change', $event)"
  />
</template>

<script setup lang="ts">
import {
  VueMonacoEditor,
  loader,
  EditorProps,
} from "@guolao/vue-monaco-editor";

defineProps<{ code?: string }>();
defineEmits<{ change: [value: string] }>();

loader.config({
  paths: { vs: __basePath + "/module/monaco-editor/vs" },
  "vs/nls": { availableLanguages: { "*": "zh-cn" } },
});

const MONACO_EDITOR_OPTIONS: EditorProps["options"] = {
  automaticLayout: true,
  formatOnType: true,
};

const editor = shallowRef();
const handleMount = (editorInstance: any) => (editor.value = editorInstance);

// your action
function formatCode() {
  editor.value?.getAction("editor.action.formatDocument").run();
}

defineExpose({
  setCode: (code: string) => {
    editor.value?.setValue(code);
    formatCode();
  },
  getCode: () => editor.value?.getValue(),
  editor,
});
</script>
