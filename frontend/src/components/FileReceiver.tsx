import { FileMetadata, IncomingFile, TransferStatus } from "../types";
import { formatFileSize } from "../utils/formatFileSize";
import { FileIcon } from "./FileIcon";
import { ProgressBar } from "./ProgressBar";
import { setIncomingFile, setIsReceivingFile } from "../store/peerSlice";
import {
    completeTransfer,
    CurrentTransfer,
    rejectTransfer,
    resetCurrentTransfer,
} from "../store/transferSlice";
import { useDispatch } from "react-redux";
import { useCallback, useEffect, useState } from "react";

interface FileReceiverProps {
    fileInfoRef: React.RefObject<FileMetadata | null>;
    receiveProgress: number | null;
    completedFileRef: React.RefObject<File | null>;
    dataChannelRef: React.RefObject<RTCDataChannel | null>;
    incomingFile: IncomingFile | null;
    resetFileReceiver: () => void;
    currentTransfer: CurrentTransfer | null;
    fileSending: boolean;
    isReceivingFile: boolean;
    receivedSizeRef: React.RefObject<number>;
}

export const FileReceiver = ({
    fileInfoRef,
    completedFileRef,
    incomingFile,
    dataChannelRef,
    resetFileReceiver,
    currentTransfer,
    receiveProgress,
    isReceivingFile,
    receivedSizeRef,
}: FileReceiverProps) => {
    const dispatch = useDispatch();


    const acceptTransferredFile = useCallback(() => {
        console.log("acceptTransferredFile called");
        console.log("completedFileRef:", completedFileRef.current);

        if (!completedFileRef.current) {
            console.error("No completed file to accept.");
            return;
        }

        
        try {
            const file = completedFileRef.current;
            const link = document.createElement("a");
            link.href = URL.createObjectURL(file);
            link.download = file.name;
            link.click();
            URL.revokeObjectURL(link.href);

            completedFileRef.current = null;
            fileInfoRef.current = null;
            dispatch(completeTransfer());
            dispatch(setIsReceivingFile(false));
            dispatch(setIncomingFile(null));
        } catch (error) {
            console.error("Error accepting file:", error);
        }
    }, [dispatch, completedFileRef, fileInfoRef]);

    const handleAccept = async () => {
        if (
            !incomingFile ||
            !dataChannelRef.current ||
            dataChannelRef.current.readyState !== "open"
        ) {
            console.error("Cannot accept file - invalid state", {
                incomingFile: !!incomingFile,
                dataChannel: !!dataChannelRef.current,
                readyState: dataChannelRef.current?.readyState,
            });
            return;
        }

        if (!completedFileRef.current) {
            console.error("Cannot accept file - transfer not complete");
            return;
        }

        try {
            dataChannelRef.current.send(
                JSON.stringify({
                    messageType: "file-accepted",
                    fileId: incomingFile.metadata?.id,
                    fileMetadata: incomingFile.metadata,
                })
            );
            acceptTransferredFile();
            resetFileReceiver();
        } catch (error) {
            console.error("Error in handleAccept:", error);
        }
    };

    const handleReject = () => {
        dispatch(rejectTransfer());
        resetFileReceiver();
    };

    useEffect(() => {
        console.log("Receive progress:", receiveProgress);
        console.log("isReceivingFile:", isReceivingFile);
        console.log("size: ", incomingFile?.metadata?.size);
    }, [receiveProgress, isReceivingFile]);

    useEffect(() => {
        console.log("FileReceiver mounted with state:", {
            currentTransfer,
            incomingFile,
            dataChannelState: dataChannelRef.current?.readyState,
            completedFile: completedFileRef.current,
            fileInfo: fileInfoRef.current,
        });
    }, []);

    if (!currentTransfer || !isReceivingFile) {
        return null;
    }

    return (
        <div className="p-4 border rounded-lg shadow-sm space-y-4">
            {/* File info */}
            <div className="flex items-center space-x-3">
                <FileIcon size={24} />
                <div>
                    <p className="font-medium">
                        {incomingFile?.metadata?.name
                            ? incomingFile?.metadata?.name
                            : null}
                    </p>
                    <p className="text-sm text-gray-500">
                        {currentTransfer?.fileMetadata?.size &&
                            formatFileSize(
                                currentTransfer.fileMetadata.size
                            )}{" "}
                        bytes
                    </p>
                </div>
            </div>

            {typeof receiveProgress === "number" && (
                <ProgressBar progress={receiveProgress} />
            )}
            {incomingFile && completedFileRef.current && (
                <div className="flex justify-between space-x-2">
                    <>
                        <button
                            onClick={handleAccept}
                            className="px-4 py-2 bg-[#8E1616] text-white rounded hover:bg-[#8E1644] transition-colors"
                        >
                            Accept File
                        </button>
                        <button
                            onClick={handleReject}
                            className="px-4 py-2 bg-black text-white rounded hover:bg-[#222222] transition-colors"
                        >
                            Reject
                        </button>{" "}
                    </>
                </div>
            )}
        </div>
    );
};
