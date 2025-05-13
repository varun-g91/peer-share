import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Transfer, TransferStatus, FileMetadata } from "../types";

export interface CurrentTransfer {
    progress: number | null;
    fileMetadata?: FileMetadata;
    status: TransferStatus;
}

interface TransferState {
    currentTransfer: CurrentTransfer | null;
    transferHistory: Transfer[];
}

const initialState: TransferState = {
    currentTransfer: null,
    transferHistory: [],
};

const transferSlice = createSlice({
    name: "transfer",
    initialState,
    reducers: {
        startTransfer(state, action: PayloadAction<FileMetadata>) {
            state.currentTransfer = {
                progress: 0,
                fileMetadata: action.payload,
                status: "pending",
            };
        },

        updateProgress(state, action: PayloadAction<number | null>) {
            if (state.currentTransfer) {
                state.currentTransfer.progress = action.payload;
            }
        },

        completeTransfer(state) {
            if (state.currentTransfer?.fileMetadata) {
                state.transferHistory.push({
                    fileMetadata: state.currentTransfer.fileMetadata,
                    timestamp: new Date().toISOString(),
                    status: "completed",
                });
            }
            // state.currentTransfer = null;
        },

        completeTransferSender(state, action: PayloadAction<FileMetadata | null>) {
            if (action.payload) {
                state.transferHistory.push({
                    fileMetadata: action.payload,
                    timestamp: new Date().toISOString(),
                    status: "completed",
                });
            }
        },

        resetCurrentTransfer(state) {
            state.currentTransfer = null;
        },

        rejectTransfer(state) {
            if (state.currentTransfer?.fileMetadata) {
                state.currentTransfer.status = "failed";
            }
        },

        failTransfer(state) {
            if (state.currentTransfer) {
                state.currentTransfer.status = "failed";
            }
        },

        resetTransfers(state) {
            state.currentTransfer = null;
            state.transferHistory = [];
        },

        deleteTransfer(state, action: PayloadAction<string>) {
            state.transferHistory = state.transferHistory.filter(
                (transfer) => transfer.fileMetadata?.id !== action.payload
            );
        }
    },
});

export const {
    resetCurrentTransfer,
    completeTransferSender,
    startTransfer,
    deleteTransfer,
    updateProgress,
    completeTransfer,
    rejectTransfer,
    failTransfer,
    resetTransfers,
} = transferSlice.actions;

export default transferSlice.reducer;
