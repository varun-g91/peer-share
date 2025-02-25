import { useState, useRef } from 'react';

export const useFileTransfer = (dataChannelRef, setStatus) => {
    const [fileSending, setFileSending] = useState(false);
    const [transferProgress, setTransferProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const setUpDataChannel = () => {
        if (!dataChannelRef.current) return;

        dataChannelRef.current.binaryType = "arraybuffer";
        dataChannelRef.current.onopen = () => setStatus("Connected to Peer");
        dataChannelRef.current.onclose = () => setStatus("Disconnected");
        dataChannelRef.current.onerror = () => setStatus("Data Channel Error");

        let receivedBuffers = [];
        let receivedSize = 0;
        let fileInfo = null;

        dataChannelRef.current.onmessage = (event) => {
            try {
                const data = event.data;
                if (typeof data === "string") {
                    const parsedData = JSON.parse(data);
                    if (parsedData.messageType === "file-info") {
                        fileInfo = parsedData;
                        receivedBuffers = [];
                        receivedSize = 0;
                    }
                } else {
                    receivedBuffers.push(data);
                    receivedSize += data.byteLength;

                    if (fileInfo) {
                        const progress = (receivedSize / fileInfo.size) * 100;
                        setTransferProgress(Math.round(progress));

                        if (receivedSize === fileInfo.size) {
                            const receivedFile = new Blob(receivedBuffers);
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(receivedFile);
                            link.download = fileInfo.name;
                            link.click();
                            URL.revokeObjectURL(link.href);

                            receivedBuffers = [];
                            receivedSize = 0;
                            fileInfo = null;
                            setTransferProgress(0);
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing received data:", error);
            }
        };
    };

    const sendFile = async () => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
            alert("Connection not established");
            return;
        }

        if (!selectedFile) {
            alert("Please select a file");
            return;
        }

        try {
            setFileSending(true);
            setTransferProgress(0);

            dataChannelRef.current.send(JSON.stringify({
                messageType: "file-info",
                name: selectedFile.name,
                size: selectedFile.size,
            }));

            const CHUNK_SIZE = 16384;
            const reader = new FileReader();
            let offset = 0;

            reader.onload = (e) => {
                if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
                    setFileSending(false);
                    setStatus("Connection Lost During Transfer");
                    return;
                }

                dataChannelRef.current.send(e.target.result);
                offset += e.target.result.byteLength;

                const progress = (offset / selectedFile.size) * 100;
                setTransferProgress(Math.round(progress));

                if (offset < selectedFile.size) {
                    readNextChunk();
                } else {
                    setFileSending(false);
                    setTransferProgress(0);
                }
            };

            const readNextChunk = () => {
                const slice = selectedFile.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            };

            readNextChunk();
        } catch (error) {
            console.error("Error sending file:", error);
            setFileSending(false);
            setStatus("File Sending Error");
        }
    };


    return {
        fileSending,
        transferProgress,
        selectedFile,
        setSelectedFile,
        fileInputRef,
        formatFileSize,
        setUpDataChannel,
        sendFile
    };
};