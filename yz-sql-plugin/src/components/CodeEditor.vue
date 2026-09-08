<template>
  <vue-monaco-editor
    :value="model"
    theme="vs-dark"
    language="sql"
    :options="MONACO_EDITOR_OPTIONS"
    @mount="handleMount"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import {
  VueMonacoEditor,
  loader,
  EditorProps,
} from "@guolao/vue-monaco-editor";
import * as monaco from "monaco-editor";
const [model] = defineModel<string>();

defineEmits<{ change: [value: string] }>();

loader.config({ monaco });

const MONACO_EDITOR_OPTIONS: EditorProps["options"] = {
  automaticLayout: true,
  formatOnType: true,
  wordWrap: "on",
};

const editor = shallowRef();
const handleMount = (editorInstance: any) => {
  editor.value = editorInstance;
};

// your action
function formatCode() {
  editor.value?.getAction("editor.action.formatDocument").run();
}

function onChange(value: string) {
  model.value = value;
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
