import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { startTransfer, updateProgress, completeTransfer, rejectTransfer, failTransfer, resetTransfers, resetCurrentTransfer } from '../store/transferSlice';
import { FileMetadata } from "../types";
import { setReceiveProgress } from "../store/peerSlice";

export const useFileTransfer = () => {
    const [fileSending, setFileSending] = useState<boolean>(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef(null);

    const dispatch = useDispatch();

    const sendFile = (
        dataChannel: RTCDataChannel,
        file: File,
        fileMetadata: FileMetadata,
    ) => {
        return new Promise<void>((resolve, reject) => {
            if(!dataChannel) {
                reject(new Error("Data channel is not initialized"));
                return;
            }
            if (!file) {
                reject(new Error("No file selected"));
                return;
            }            
            if (dataChannel.readyState !== "open") {
                reject(new Error(`Data channel not open, current state: ${dataChannel.readyState}`));
                return;
            }
            console.log("Starting file transfer for:", file.name);
            
            console.log("File metadata:", fileMetadata);

            dispatch(startTransfer(fileMetadata));
    
            const CHUNK_SIZE = 16384;
            let offset = 0;
            const reader = new FileReader();
    
            const readNextChunk = () => {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            };
    
            reader.onload = (e) => {
                try {
                    if (e.target?.result instanceof ArrayBuffer) {
                        dataChannel.send(e.target.result);
                        offset += e.target.result.byteLength;
    
                        const progress = Math.min(
                            Math.round((offset / file.size) * 100),
                            100
                        );
                        dispatch(updateProgress(progress));
    
                        if (offset < file.size) {
                            readNextChunk();
                        } else {
                            setFileSending(false);
                            // dispatch(completeTransfer());
                            // dispatch(resetCurrentTransfer());
                            
                            resolve();
                        }
                    }
                } catch (error) {
                    console.error("Error in file reader onload:", error);
                    dispatch(failTransfer());   
                    reject(error);
                }
            };
    
            reader.onerror = (error) => {
                console.error("File reader error:", error);
                dispatch(failTransfer());
                reject(error);
            };
    
            readNextChunk();
        });
    };

    return {
        fileSending,
        setFileSending,
        selectedFile,
        setSelectedFile,
        sendFile,
    };
};