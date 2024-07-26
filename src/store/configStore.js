import { configureStore } from "@reduxjs/toolkit";
import mapSlice from "../components/mapSlice";

export const store = configureStore({
  reducer: {
    map: mapSlice,
  },
});
