import { useEffect, useState, useCallback } from "react";
import { Upload, Download, Copy, CheckCircle, RefreshCw } from "lucide-react";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePeerConnection } from "./hooks/usePeerConnection";
import { useFileTransfer } from "./hooks/useFileTransfer";
import { useDropzone } from "react-dropzone";

const App = () => {
    const [role, setRole] = useState(null);
    const [copied, setCopied] = useState(false);

    const { peerId, wsConnected, status, setStatus, socketRef } =
        useWebSocket();
    const {
        targetPeerId,
        setTargetPeerId,
        peerConnectionRef,
        dataChannelRef,
        createPeerConnection,
        handleOffer,
        handleAnswer,
        handleCandidate,
    } = usePeerConnection(socketRef, setStatus);

    const {
        fileSending,
        transferProgress,
        selectedFile,
        setSelectedFile,
        fileInputRef,
        formatFileSize,
        setUpDataChannel,
        sendFile,
    } = useFileTransfer(dataChannelRef, setStatus);

    /** Copy Peer ID to Clipboard */
    const copyPeerId = () => {
        navigator.clipboard.writeText(peerId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /** Handle Peer Connection */
    const connectPeer = async () => {
        if (!targetPeerId) {
            console.error("Target peer ID missing!");
            return;
        }

        console.log("Creating peer connection...");
        peerConnectionRef.current = await createPeerConnection();

        if (!peerConnectionRef.current) {
            console.error("Peer connection failed to initialize.");
            setStatus("Connection Error");
            return;
        }

        console.log("Creating data channel...");
        dataChannelRef.current = peerConnectionRef.current.createDataChannel(
            "fileTransfer",
            { ordered: true }
        );

        if (!dataChannelRef.current) {
            console.error("Failed to create data channel.");
            return;
        }

        console.log("Data channel created:", dataChannelRef.current);
        setUpDataChannel();

        console.log("Creating and sending offer...");
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
    };



    /** Reset Connection */
    const resetConnection = () => {
        setRole(null);
        setTargetPeerId("");
        setSelectedFile(null);
        setStatus("Disconnected");

        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
    };

    /** Handle File Selection */
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    /** Listen for WebSocket Messages */
    useEffect(() => {
        if (!socketRef.current) return;

        const handleMessage = async (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "offer":
                    console.log("Received offer:", data);
                    await handleOffer(data);
                    break;
                case "answer":
                    console.log("Received answer:", data);
                    await handleAnswer(data);
                    break;
                case "candidate":
                    console.log("Received ICE candidate:", data);
                    await handleCandidate(data);
                    break;
                default:
                    console.warn("Unknown message type:", data.type);
            }
        };

        socketRef.current.addEventListener("message", handleMessage);
        return () => {
            socketRef.current?.removeEventListener("message", handleMessage);
        };
    }, [socketRef, handleOffer, handleAnswer, handleCandidate]);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setSelectedFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
    });

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
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

                        {/* Status Display */}
                        <div className="text-sm font-medium text-gray-700">
                            Status: {status}
                        </div>

                        {peerId && (
                            <div className="flex flex-col items-center bg-gray-100 p-3 rounded-lg mb-4">
                                <span className="text-sm font-medium text-gray-700">
                                    Your Peer ID
                                </span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-800 font-mono text-lg">
                                        {peerId}
                                    </span>
                                    <button
                                        onClick={copyPeerId}
                                        className="text-gray-600 hover:text-gray-800"
                                    >
                                        {copied ? (
                                            <CheckCircle
                                                size={20}
                                                className="text-green-500"
                                            />
                                        ) : (
                                            <Copy size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Connect and Reset Buttons */}
                        <div className="flex space-x-3 pt-4">
                            <button
                                onClick={connectPeer}
                                disabled={
                                    !wsConnected ||
                                    !targetPeerId ||
                                    status === "Connected to Peer"
                                }
                                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Connect
                            </button>
                            <button
                                onClick={resetConnection}
                                className="w-full mt-4 flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <RefreshCw size={16} />
                                <span>Reset Connection</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Drop zone */}
                <div
                    {...getRootProps()}
                    className="border-2 w-full border-dashed p-6 text-center cursor-pointer h-36"
                >
                    <input ref={fileInputRef} onChange={handleFileChange} {...getInputProps()} />
                    {isDragActive ? (
                        <p>Drop the file here ...</p>
                    ) : (
                        <p>Drag & drop a file here, or click to select</p>
                    )}
                </div>

                {/* Display Selected File */}
                {selectedFile && (
                    <p className="text-sm text-gray-700">
                        Selected File: {selectedFile.name} ({selectedFile.size}{" "}
                        bytes)
                    </p>
                )}

                <button
                    onClick={sendFile}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-2"
                >
                    Send File
                </button>
            </div>
        </div>
    );
};

export default App;
