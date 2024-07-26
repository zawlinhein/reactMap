import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  markers: [],
};
const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setMarkers(state, action) {
      return {
        ...state,
        markers: action.payload,
      };
    },
  },
});
export const markers = (state) => state.map.markers;
export const { setMarkers } = mapSlice.actions;
export default mapSlice.reducer;
