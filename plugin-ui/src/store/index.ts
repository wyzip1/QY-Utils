import { configureStore } from "@reduxjs/toolkit";
import global from "./global";

export const store = configureStore({
  reducer: {
    global,
  },
});

export type RootState = ReturnType<typeof store.getState>;
