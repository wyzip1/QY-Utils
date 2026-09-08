<template>
  <a-config-provider
    :theme="{
      token: {
        colorPrimary: '#155bd4',
        borderRadius: 0,
      },
    }"
  >
    <a-button
      type="primary"
      :icon="h(ConsoleSqlOutlined)"
      @click="() => (openDrawer = true)"
    />

    <a-drawer
      title="批量执行SQL"
      placement="right"
      :width="800"
      :open="openDrawer"
      @close="onCloseDrawer"
    >
      <div class="flex justify-between items-end mb-2">
        <div class="font-semibold">
          <div class="mb-2 flex">
            <div class="w-16 text-right mr-2">dbName:</div>
            <a-checkable-tag checked @click="copyInfo(baseInfo.dbName)">
              {{ baseInfo.dbName }}
            </a-checkable-tag>
          </div>
          <div class="mb-2 flex">
            <div class="w-16 text-right mr-2">zone:</div>
            <a-checkable-tag checked @click="copyInfo(baseInfo.zone)">
              {{ baseInfo.zone }}
            </a-checkable-tag>
          </div>
          <div class="mb-2 flex">
            <div class="w-16 text-right mr-2">appId:</div>
            <a-checkable-tag checked @click="copyInfo(baseInfo.appId)">
              {{ baseInfo.appId }}
            </a-checkable-tag>
          </div>
          <div class="mb-2 flex">
            <div class="w-16 text-right mr-2">bizInsId:</div>
            <a-checkable-tag checked @click="copyInfo(baseInfo.bizInsId)">
              {{ baseInfo.bizInsId }}
            </a-checkable-tag>
          </div>
          <div class="mb-2 flex">
            <div class="w-16 leading-[30px] text-right mr-2">批量执行:</div>
            <a-input-number v-model:value="batchNum" :max="500" :min="1" />
          </div>
          <div class="mb-2 flex">
            <div class="w-16 leading-[22px] text-right mr-2">错误中断:</div>
            <a-switch v-model:checked="catchBreak" />
          </div>
        </div>
        <a-radio-group size="small" v-model:value="inputMode">
          <a-radio-button value="codeEditor">code</a-radio-button>
          <a-radio-button value="textarea">text</a-radio-button>
        </a-radio-group>
      </div>
      <a-textarea
        v-if="inputMode === 'textarea'"
        :rows="8"
        v-model:value="sqlStr"
      />
      <code-editor
        v-else-if="inputMode === 'codeEditor'"
        v-model="sqlStr"
        style="height: 500px"
      />
      <div class="flex justify-end mt-2 mb-2">
        <a-button type="primary" :loading="runLoading" @click="runExecSql"
          >执行</a-button
        >
      </div>

      <div
        v-for="(data, i) in resultList"
        :key="i"
        class="border border-solid border-gray-200 mb-2 last:mb-0 px-3 py-2 hover:bg-gray-200 transition-all cursor-pointer"
      >
        <div class="flex items-center gap-2">
          <LoadingOutlined
            class="text-blue-700"
            v-if="data.status === 'loading'"
          />
          <CloseCircleOutlined
            class="text-red-700"
            v-if="data.status === 'error'"
          />
          <CheckCircleOutlined
            class="text-green-700"
            v-if="data.status === 'success'"
          />
          <a-tooltip :title="data.sql">
            <div class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
              {{ data.sql }}
            </div>
          </a-tooltip>
        </div>
        <div class="text-red-700">{{ data.errorMsg }}</div>
      </div>
    </a-drawer>
  </a-config-provider>
</template>

<script setup lang="ts">
import { h } from "vue";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ConsoleSqlOutlined,
  LoadingOutlined,
} from "@ant-design/icons-vue";
import { copyInfo } from "@/utils";
import { execDml } from "@/api/index";
import useRequest from "./hook/useRequest";
import storage from "@/utils/storage";
console.log("111");

const baseInfo = ref({
  limit: 500,
  dbName: _global?.addonOpenInfo?.appName,
  zone: _global?.addonOpenInfo?.zone,
  appId: _global?.addonOpenInfo?.appId,
  bizInsId: _global?.addonOpenInfo?.bizInsId,
});
const batchNum = ref(500);
const openDrawer = ref(false);
const inputMode = ref(storage.get("inputMode") || "codeEditor");
const sqlStr = ref("");
const catchBreak = ref(false);

const sqlList = computed(() =>
  sqlStr.value
    .split("\n")
    .filter((v) => !v.startsWith("# ") && v.trim() !== ""),
);

watch(inputMode, () => {
  storage.set("inputMode", inputMode.value);
});

const [execRequest] = useRequest(execDml, { initSearch: false });
const runLoading = ref(false);

const resultList = ref<
  Array<{ sql: string; status: string; errorMsg?: string }>
>([]);

function onCloseDrawer() {
  openDrawer.value = false;
}

async function runExecSql() {
  try {
    runLoading.value = true;
    const runList = toRaw(sqlList.value);
    while (runList.length) {
      const endIdx = Math.min(runList.length, batchNum.value);
      const sql = runList
        .splice(0, Math.min(endIdx, runList.length))
        .join("\n");
      resultList.value.unshift({ sql, status: "loading" });
      try {
        await execRequest({ ...baseInfo.value, statement: sql });
        resultList.value[0].status = "success";
      } catch (err: any) {
        resultList.value[0].status = "error";
        resultList.value[0].errorMsg =
          err.data?.message || err.message || "执行错误";
        if (catchBreak.value) break;
      }
    }
  } finally {
    runLoading.value = false;
  }
}
</script>
