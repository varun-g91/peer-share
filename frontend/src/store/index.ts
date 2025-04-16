import { configureStore } from "@reduxjs/toolkit";
import peerReducer from './peerSlice';
import transferReducer from './transferSlice';

export const store = configureStore({
    reducer: {
        peer: peerReducer,
        transfer: transferReducer,
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;