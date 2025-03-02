import { useState, useRef } from 'react';

export const useFileTransfer = () => {
    const [transferProgress, setTransferProgress] = useState(0);
    const [fileSending, setFileSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const sendFile = (dataChannel, selectedFile, setStatus) => {
        return new Promise((resolve, reject) => {
            if (!dataChannel || dataChannel.readyState !== "open") {
                alert("Connection not established");
                reject(new Error("Connection not established"));
                return;
            }

            try {
                setFileSending(true);
                setTransferProgress(0); // Reset progress

                const CHUNK_SIZE = 16384;
                const reader = new FileReader();
                let offset = 0;

                reader.onload = (e) => {
                    try {
                        dataChannel.send(e.target.result);
                        offset += e.target.result.byteLength;
                        
                        // Update progress
                        const progress = Math.round((offset / selectedFile.size) * 100);
                        setTransferProgress(progress);
                        console.log('Send progress:', progress); // Debug log

                        if (offset < selectedFile.size) {
                            readNextChunk();
                        } else {
                            resolve();
                        }
                    } catch (error) {
                        setFileSending(false);
                        reject(error);
                    }
                };

                const readNextChunk = () => {
                    const slice = selectedFile.slice(offset, offset + CHUNK_SIZE);
                    reader.readAsArrayBuffer(slice);
                };

                // Send file info first
                dataChannel.send(JSON.stringify({
                    messageType: "file-info",
                    name: selectedFile.name,
                    size: selectedFile.size,
                }));

                readNextChunk();
            } catch (error) {
                setFileSending(false);
                reject(error);
            }
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
        sendFile
    };
};