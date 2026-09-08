import { createSlice } from "@reduxjs/toolkit";

const global = createSlice({
  name: "counter",
  initialState: {
    baseURL: "",
  },
  reducers: {
    SET_BASE_URL: (state, action) => {
      // Redux Toolkit 允许在 reducers 中编写 "mutating" 逻辑。
      // 它实际上并没有改变 state，因为使用的是 Immer 库，检测到“草稿 state”的变化并产生一个全新的
      // 基于这些更改的不可变的 state。
      state.baseURL = action.payload;
    },
  },
});

export default global.reducer;

export const { SET_BASE_URL } = global.actions;
