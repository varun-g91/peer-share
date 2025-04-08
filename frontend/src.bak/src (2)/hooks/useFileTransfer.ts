import { useState, useRef } from "react";

export const useFileTransfer = () => {
    const [transferProgress, setTransferProgress] = useState<number>(0);
    const [fileSending, setFileSending] = useState<boolean>(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef(null);

    const sendFile = (
        dataChannel: RTCDataChannel,
        file: File,
        onProgress?: (progress: number) => void
    ) => {
        return new Promise<void>((resolve, reject) => {
            console.log("Starting file transfer for:", file.name);
            
            if (dataChannel.readyState !== "open") {
                reject(new Error(`Data channel not open, current state: ${dataChannel.readyState}`));
                return;
            }
    
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
                        onProgress?.(progress);
    
                        if (offset < file.size) {
                            readNextChunk();
                        } else {
                            console.log("File transfer completed:", file.name);
                            resolve();
                        }
                    }
                } catch (error) {
                    console.error("Error in file reader onload:", error);
                    reject(error);
                }
            };
    
            reader.onerror = (error) => {
                console.error("File reader error:", error);
                reject(error);
            };
    
            readNextChunk();
        });
    };

    return {
        transferProgress,
        setTransferProgress,
        fileSending,
        setFileSending,
        selectedFile,
        setSelectedFile,
        fileInputRef,
        sendFile,
    };
};