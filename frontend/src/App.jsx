import React, { useEffect, useRef, useState } from "react";
import {
    Upload,
    Download,
    Copy,
    CheckCircle,
    X,
    RefreshCw,
} from "lucide-react";

import { useDropzone } from 'react-dropzone'

const App = () => {
    const [peerId, setPeerId] = useState("");
    const [targetPeerId, setTargetPeerId] = useState("");
    const [status, setStatus] = useState("Disconnected");
    const [fileSending, setFileSending] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [transferProgress, setTransferProgress] = useState(0);
    const [role, setRole] = useState(null); // 'sender' or 'receiver'
    const [copied, setCopied] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const fileInputRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Add function to copy Peer ID to clipboard
    const copyPeerId = () => {
        navigator.clipboard.writeText(peerId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Function to format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const connectWebSocket = () => {
        try {
            const socket = new WebSocket("ws://localhost:8080");
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("WebSocket connected");
                setWsConnected(true);
                setStatus("WebSocket Connected");

                const newPeerId = Math.random().toString(36).substring(7);
                setPeerId(newPeerId);
                socket.send(
                    JSON.stringify({ type: "register", peerId: newPeerId })
                );
            };

            socket.onclose = () => {
                console.log("WebSocket disconnected");
                setWsConnected(false);
                setStatus("WebSocket Disconnected");

                reconnectTimeoutRef.current = setTimeout(() => {
                    if (
                        !socketRef.current ||
                        socketRef.current.readyState === WebSocket.CLOSED
                    ) {
                        console.log("Attempting to reconnect...");
                        connectWebSocket();
                    }
                }, 2000);
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                setStatus("WebSocket Error");
            };

            socket.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("Received message:", data);

                    // Create new peer connection if we don't have one or if it's closed
                    if (
                        !peerConnectionRef.current ||
                        peerConnectionRef.current.connectionState === "closed"
                    ) {
                        createPeerConnection();
                    }

                    switch (data.type) {
                        case "offer":
                            await handleOffer(data);
                            break;
                        case "answer":
                            await handleAnswer(data);
                            break;
                        case "candidate":
                            await handleCandidate(data);
                            break;
                        default:
                            console.log("Unknown message type:", data.type);
                    }
                } catch (error) {
                    console.error("Error handling message:", error);
                }
            };
        } catch (error) {
            console.error("Error creating WebSocket:", error);
            setStatus("WebSocket Creation Error");
        }
    };

    const handleOffer = async (data) => {
        await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socketRef.current.send(
            JSON.stringify({
                type: "answer",
                target: data.peerId,
                answer,
            })
        );
        setStatus("Connected to Peer");
    };

    const handleAnswer = async (data) => {
        await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
        setStatus("Connected to Peer");
    };

    const handleCandidate = async (data) => {
        await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
        );
    };

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            if (dataChannelRef.current) {
                dataChannelRef.current.close();
            }
        };
    }, []);

    function createPeerConnection() {
        // Close existing connection if any
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        // Create new connection
        peerConnectionRef.current = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                {
                    urls: "turn:openrelay.metered.ca:80",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
            ],
        });

        peerConnectionRef.current.oniceconnectionstatechange = () => {
            console.log(
                "ICE Connection State:",
                peerConnectionRef.current?.iceConnectionState
            );
            if (
                peerConnectionRef.current?.iceConnectionState === "disconnected"
            ) {
                setStatus("Peer Disconnected");
            }
        };

        peerConnectionRef.current.onconnectionstatechange = () => {
            console.log(
                "Connection State:",
                peerConnectionRef.current?.connectionState
            );
            if (peerConnectionRef.current?.connectionState === "failed") {
                setStatus("Connection Failed");
            }
        };

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate && targetPeerId) {
                socketRef.current?.send(
                    JSON.stringify({
                        type: "candidate",
                        target: targetPeerId,
                        candidate: event.candidate,
                    })
                );
            }
        };

        peerConnectionRef.current.ondatachannel = (event) => {
            console.log("Data channel received");
            dataChannelRef.current = event.channel;
            setUpDataChannel();
        };
    }


    function setUpDataChannel() {
        if (!dataChannelRef.current) return;

        dataChannelRef.current.binaryType = "arraybuffer";

        dataChannelRef.current.onopen = () => {
            console.log("Data channel opened");
            setStatus("Connected to Peer");
        };

        dataChannelRef.current.onclose = () => {
            console.log("Data channel closed");
            setStatus("Disconnected");
        };

        dataChannelRef.current.onerror = (error) => {
            console.error("Data channel error:", error);
            setStatus("Data Channel Error");
        };

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
                        console.log("Receiving file:", fileInfo.name);
                    }
                } else {
                    receivedBuffers.push(data);
                    receivedSize += data.byteLength;

                    if (fileInfo) {
                        const progress = (receivedSize / fileInfo.size) * 100;
                        setTransferProgress(Math.round(progress));
                    }

                    if (fileInfo && receivedSize === fileInfo.size) {
                        console.log("File fully received");
                        const receivedFile = new Blob(receivedBuffers);
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(receivedFile);
                        link.download = fileInfo.name;
                        link.click();
                        URL.revokeObjectURL(link.href);

                        // Reset state
                        receivedBuffers = [];
                        receivedSize = 0;
                        fileInfo = null;
                        setTransferProgress(0);
                    }
                }
            } catch (error) {
                console.error("Error processing received data:", error);
            }
        };
    }

    function connectPeer() {
        try {
            // Always create a new peer connection when connecting
            createPeerConnection();

            setStatus("Connecting...");

            // Create new data channel
            dataChannelRef.current =
                peerConnectionRef.current.createDataChannel("fileTransfer", {
                    ordered: true,
                });
            setUpDataChannel();

            // Create and send offer
            peerConnectionRef.current
                .createOffer()
                .then((offer) =>
                    peerConnectionRef.current.setLocalDescription(offer)
                )
                .then(() => {
                    socketRef.current?.send(
                        JSON.stringify({
                            type: "offer",
                            target: targetPeerId,
                            peerId,
                            offer: peerConnectionRef.current.localDescription,
                        })
                    );
                })
                .catch((error) => {
                    console.error("Error creating offer:", error);
                    setStatus("Connection Error");
                });
        } catch (error) {
            console.error("Error connecting to peer:", error);
            setStatus("Connection Error");

            // Cleanup on error
            if (dataChannelRef.current) {
                dataChannelRef.current.close();
                dataChannelRef.current = null;
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
        }
    }

    async function sendFile() {
        if (
            !dataChannelRef.current ||
            dataChannelRef.current.readyState !== "open"
        ) {
            alert("Connection not established");
            return;
        }

        const file = fileInputRef.current.files[0];
        if (!file) {
            alert("Please select a file");
            return;
        }

        try {
            setFileSending(true);
            setTransferProgress(0);

            // Send file info
            dataChannelRef.current.send(
                JSON.stringify({
                    messageType: "file-info",
                    name: file.name,
                    size: file.size,
                })
            );

            // Use chunks of 16KB
            const CHUNK_SIZE = 16384;
            const reader = new FileReader();
            let offset = 0;

            reader.onload = (e) => {
                if (
                    !dataChannelRef.current ||
                    dataChannelRef.current.readyState !== "open"
                ) {
                    setFileSending(false);
                    setStatus("Connection Lost During Transfer");
                    return;
                }

                dataChannelRef.current.send(e.target.result);
                offset += e.target.result.byteLength;

                const progress = (offset / file.size) * 100;
                setTransferProgress(Math.round(progress));

                if (offset < file.size) {
                    // Read the next chunk
                    readNextChunk();
                } else {
                    // Transfer complete
                    setFileSending(false);
                    setTransferProgress(0);
                }
            };

            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                setFileSending(false);
                setStatus("File Reading Error");
            };

            function readNextChunk() {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            }

            // Start reading the first chunk
            readNextChunk();
        } catch (error) {
            console.error("Error sending file:", error);
            setFileSending(false);
            setStatus("File Sending Error");
        }
    }

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    function resetConnection() {
        try {
            setRole(null);
            setTargetPeerId("");
            setSelectedFile(null);
            setTransferProgress(0);
            setStatus("Disconnected");

            // Close and cleanup data channel
            if (dataChannelRef.current) {
                dataChannelRef.current.close();
                dataChannelRef.current = null;
            }

            // Close and cleanup peer connection
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
        } catch (error) {
            console.error("Error during reset:", error);
        }
    }

    

    return (
        <div className="flex flex-col items-center p-6 min-h-screen bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        P2P File Transfer
                    </h1>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                wsConnected ? "bg-green-500" : "bg-red-500"
                            }`}
                        ></span>
                        <span>
                            {wsConnected
                                ? "Connected to server"
                                : "Disconnected"}
                        </span>
                    </div>
                </div>

                {/* Role Selection */}
                {!role && (
                    <div className="flex flex-col space-y-4 mb-6">
                        <h2 className="text-lg font-semibold text-center">
                            Choose Your Role
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setRole("sender")}
                                className="flex flex-col items-center p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <Upload
                                    size={24}
                                    className="text-blue-500 mb-2"
                                />
                                <span className="font-medium">Send Files</span>
                            </button>
                            <button
                                onClick={() => setRole("receiver")}
                                className="flex flex-col items-center p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
                            >
                                <Download
                                    size={24}
                                    className="text-green-500 mb-2"
                                />
                                <span className="font-medium">
                                    Receive Files
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Connection Interface */}
                {role && (
                    <div className="space-y-4">
                        {/* Peer ID Display */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                {role === "sender"
                                    ? "Your Sender ID"
                                    : "Your Receiver ID"}
                            </label>
                            <div className="flex items-center space-x-2">
                                <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                                    {peerId}
                                </code>
                                <button
                                    onClick={copyPeerId}
                                    className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                                    title="Copy ID"
                                >
                                    {copied ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <Copy size={20} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Target ID Input */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                {role === "sender"
                                    ? "Receiver ID"
                                    : "Sender ID"}
                            </label>
                            <input
                                type="text"
                                value={targetPeerId}
                                onChange={(e) =>
                                    setTargetPeerId(e.target.value)
                                }
                                className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Enter ${
                                    role === "sender" ? "receiver" : "sender"
                                } ID`}
                            />
                        </div>

                        {/* File Selection (Sender only) */}
                        {role === "sender" && (
                            <div className="flex flex-col space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Select File
                                </label>
                                <input
                                    type="file"
                                    onChange={handleFileSelect}
                                    ref={fileInputRef}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-md file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100"
                                />
                                {selectedFile && (
                                    <div className="text-sm text-gray-600">
                                        Selected: {selectedFile.name} (
                                        {formatFileSize(selectedFile.size)})
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Status and Progress */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">
                                    Status
                                </span>
                                <span className="text-sm text-gray-600">
                                    {status}
                                </span>
                            </div>
                            {transferProgress > 0 && (
                                <div className="space-y-1">
                                    <div className="bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${transferProgress}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <div className="text-right text-sm text-gray-600">
                                        {transferProgress}%
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3 pt-4">
                            <button
                                onClick={connectPeer}
                                disabled={
                                    !wsConnected ||
                                    !targetPeerId ||
                                    status === "Connected to Peer"
                                }
                                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 
                                    disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Connect
                            </button>
                            {role === "sender" && (
                                <button
                                    onClick={sendFile}
                                    disabled={
                                        fileSending ||
                                        !wsConnected ||
                                        status !== "Connected to Peer" ||
                                        !selectedFile
                                    }
                                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 
                                        disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    {fileSending ? `Sending...` : "Send"}
                                </button>
                            )}
                        </div>

                        {/* Reset Button */}
                        <button
                            onClick={resetConnection}
                            className="w-full mt-4 flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <RefreshCw size={16} />
                            <span>Reset Connection</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
