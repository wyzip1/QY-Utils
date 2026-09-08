<template>
  <div class="flex flex-col overflow-hidden">
    <Toolbar
      style="border-bottom: 1px solid #ccc"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
    />
    <Editor
      class="flex-1 overflow-hidden shrink-0"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      @onCreated="handleCreated"
    />
  </div>
</template>

<script setup lang="ts">
import "@wangeditor/editor/dist/css/style.css"; // 引入 css
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import type { IDomEditor } from "@wangeditor/editor";

// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef<IDomEditor>();

// 内容 HTML
const valueHtml = ref();

const toolbarConfig = {};
const editorConfig = { placeholder: "请输入内容..." };

defineExpose({
  valueHtml,
  isEmpty: () => editorRef.value?.isEmpty(),
  setHtml: (html: string) => {
    editorRef.value?.setHtml(html);
  },
});

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});

const handleCreated = (editor) => {
  editorRef.value = editor; // 记录 editor 实例，重要！
};
</script>
