<template>
  <div class="privacy-manager" v-show="kdtIdList.length">
    <div class="title">
      <span>隐私协议管理</span>
      <a-popconfirm
        title="确定清空所有缓存数据么？"
        placement="topRight"
        @confirm="localState.clear()"
      >
        <a-button type="primary" danger>清空缓存</a-button>
      </a-popconfirm>
    </div>
    <div class="list">
      <strong>
        店铺ID:
        <a-select
          show-search
          v-model:value="selectKdtId"
          @change="(kdtId) => changeSelectKdtId(kdtId as string)"
        >
          <a-select-option
            v-for="kdtId in kdtIdList"
            :key="kdtId"
            :value="kdtId"
            >{{ kdtId }}</a-select-option
          >
        </a-select>
      </strong>
      <div
        v-for="(data, index) in codeList[selectKdtId]"
        :key="data.code"
        class="item"
      >
        <div class="content">
          <span>协议标题：{{ data.title }}</span>
          <span>协议标识：{{ data.code }}</span>
        </div>
        <div class="action">
          <a-popconfirm
            :title="`确定删除【${data.title}】么`"
            placement="topRight"
            @confirm="delCode(selectKdtId, index as number, data)"
          >
            <a-button type="link">删除</a-button>
          </a-popconfirm>
        </div>
      </div>
    </div>
    <div>
      <!-- <a-button
        type="primary"
        danger
        :loading="deleteLoading"
        @click="deleteCustomPrivacy"
        >删除隐私协议</a-button
      > -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { request } from "@/utils";
import localState from "@/utils/localState";
import { message } from "ant-design-vue";

const selectKdtId = ref("");
const kdtIdList = ref<string[]>([]);
const codeList = ref<any>([]);

// const deleteLoading = ref(false);

onMounted(() => {
  if (!localState.state.codeList) {
    localState.state.codeList = {};
    localState.setState(localState.state);
  }
  updateCodeData();
  selectKdtId.value = localState.state.selectKdtId || kdtIdList.value[0];
});

function updateCodeData() {
  codeList.value = localState.state.codeList;
  kdtIdList.value = Object.keys(codeList.value);
}

function changeSelectKdtId(kdtId: string) {
  localState.setState((data) => (data.selectKdtId = kdtId));
}

async function delCode(grantId: string, i: number, data: Record<string, any>) {
  const { code, client_id, client_secret } = data;
  const tokenParams = { client_id, client_secret, grant_id: grantId };

  const res = await request("deleteAgreement", {
    data: { ag_prod_code: code },
    tokenParams,
  });
  if (!res.success) return message.error(res.message);
  message.success("协议删除成功");
  // 缓存数据同步删除
  localState.setState(({ codeList }) => {
    codeList[grantId].splice(i, 1);
    if (codeList[grantId].length === 0) delete codeList[grantId];
  });
  updateCodeData();
}

function pushCode(grant_id: string, data: any) {
  localState.setState(({ codeList }) => {
    if (!Array.isArray(codeList[grant_id])) codeList[grant_id] = [];
    codeList[grant_id].unshift(data);
  });
  updateCodeData();
}

// async function deleteCustomPrivacy() {
//   const tokenParams = {
//     client_id: "2c283ad337fedad2cf",
//     client_secret: "9311839686990c9663f42ac79cc0bb5e",
//     grant_id: "90458972",
//   };

//   const res = await request("deleteAgreement", {
//     data: { ag_prod_code: "TEXT_BESPOKE-5644b5c-1878e984db6" },
//     tokenParams,
//   });
//   if (!res.success) return message.error(res.message);
//   message.success("协议删除成功");
// }

defineExpose({
  pushCode,
});
</script>

<style lang="scss" scoped>
.privacy-manager .title {
  font-size: 18px;
  font-weight: bold;
  padding: 10px 0;
  /* border-bottom: 1px solid #ddd; */
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.privacy-manager .list {
  border: 1px solid #ddd;
  margin-bottom: 10px;
  font-size: 14px;
  padding: 10px 15px;
}

.privacy-manager .list strong {
  display: inline-block;
  margin-bottom: 10px;
}

.privacy-manager .list .item {
  padding: 8px 20px;
  box-sizing: border-box;
  border: 1px solid #ddd;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  transition: background-color 0.3s;
}

.privacy-manager .item:hover {
  background-color: #e9e9e9;
}

.privacy-manager .list .item .content {
  display: flex;
  flex-direction: column;
}

.privacy-manager .list .item .action {
  display: flex;
}
</style>
