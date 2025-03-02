import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePeerConnection } from "./hooks/usePeerConnection";
import { useFileTransfer } from "./hooks/useFileTransfer";
import { useDropzone } from "react-dropzone";
import Header from "./components/Header";
import { ConnectionInterface } from "./components/ConnectionInterface";
import { FileUpload } from "./components/FileUpload";
import { FileReceiver } from "./components/FileReceiver";
import { TransferHistory } from "./components/TransferHistory";
import { RoleSelection } from "./components/RoleSelection";
import { formatFileSize } from './utils/formatFileSize'

const App = () => {
    const [role, setRole] = useState(null);
    const [copied, setCopied] = useState(false);
    const [transferHistory, setTransferHistory] = useState([]);
    const [incomingFile, setIncomingFile] = useState(null);
    const [receiveProgress, setReceiveProgress] = useState(0);

    const { peerId, wsConnected, status, setStatus, socketRef } =
        useWebSocket();

    const {
        targetPeerId,
        setTargetPeerId,
        peerConnectionRef,
        dataChannelRef,
        createPeerConnection,
        setupDataChannel,
        handleOffer,
        handleAnswer,
        handleCandidate,
        disconnectPeer,
        isConnected,
        acceptTransferredFile,
    } = usePeerConnection(socketRef, setStatus, setIncomingFile, formatFileSize, setReceiveProgress);

    const {
        fileSending,
        transferProgress,
        setTransferProgress,
        selectedFile,
        setSelectedFile,
        fileInputRef,
        sendFile,
        setFileSending,
    } = useFileTransfer();

    /** Copy Peer ID to Clipboard */
    const copyPeerId = () => {
        navigator.clipboard.writeText(peerId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        setTransferProgress(0)
        setFileSending(false)
    }

    /** Handle Peer Connection */
    const connectPeer = async () => {
        if (!targetPeerId) {
            console.error("Target peer ID missing!");
            return;
        }

        if (!socketRef.current) {
            console.error("WebSocket connection not established.");
            setStatus("WebSocket Error");
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

        // Set up data channel event listeners
        setupDataChannel(dataChannelRef.current);

        try {
            // Create and send offer to remote peer
            console.log("Creating offer...");
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);

            console.log("Sending offer to peer:", targetPeerId);
            socketRef.current.send(
                JSON.stringify({
                    type: "offer",
                    target: targetPeerId,
                    offer: offer,
                    peerId: peerId // Add this to identify the sender
                })
            );
            
            setStatus("Waiting for Answer");
        } catch (error) {
            console.error("Error creating/sending offer:", error);
            setStatus("Offer Error");
            disconnectPeer();
        }
    };

    /** Reset Connection */
    const resetConnection = () => {
        setRole(null);
        setTargetPeerId("");
        setSelectedFile(null);
        
        if (socketRef.current) 

        setTransferHistory([]);
        setIncomingFile(null);
        setReceiveProgress(0);
        setCopied(false);

        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
    };

    // Enhanced file transfer handling with history
    const handleFileSend = () => {
        if (selectedFile) {
            setFileSending(true);
            setTransferProgress(0); // Reset progress at start
            
            sendFile(dataChannelRef.current, selectedFile, setStatus)
                .then(() => {
                    const newTransfer = {
                        fileName: selectedFile.name,
                        size: formatFileSize(selectedFile.size),
                        timestamp: new Date().toLocaleTimeString(),
                        status: "completed",
                        direction: "sent",
                    };

                    setFileSending(false);
                    setTransferProgress(0); // Reset progress after completion
                    setTransferHistory((prev) => [...prev, newTransfer]);
                    removeSelectedFile();
                })
                .catch((error) => {
                    console.error("File transfer failed:", error);
                    setFileSending(false);
                    setTransferProgress(0);
                    setStatus("Transfer Failed");
                });
        }
    };

    const acceptFile = () => {
        console.log("File accepted");

        if (incomingFile) {
            const newTransfer = {
                fileName: incomingFile.name,
                size: formatFileSize(incomingFile.size),
                timestamp: new Date().toLocaleTimeString(),
                status: "completed",
                direction: "received",
            };

            setTransferHistory((prev) => [...prev, newTransfer]);
            setIncomingFile(null);
            setReceiveProgress(0);
        }
    };

    const rejectFile = () => {
        console.log("File rejected");
        setSelectedFile(null);
        setTransferProgress(0);
        setIncomingFile(null);
        setReceiveProgress(0);
    };

    const handleMessage = useCallback(async (event) => {
        try {
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
                case "file_info":
                    setIncomingFile({
                        name: data.fileName,
                        size: formatFileSize(data.fileSize),
                    });
                    console.log("Incoming File Info:", {
                        name: data.fileName,
                        size: formatFileSize(data.fileSize),
                    });
                    break;
                case "file_progress":
                    setReceiveProgress(data.progress);
                    break;
                default:
                    console.warn("Unknown message type:", data.type);
            }
        } catch (error) {
            console.error("Error handling message:", error);
            setStatus("Message Error");
        }
    }, [handleOffer, handleAnswer, handleCandidate, setIncomingFile, setReceiveProgress, setStatus]);

    useEffect(() => {
        if (!socketRef.current) {
            console.error("WebSocket is not connected.");
            return;
        }

        const socket = socketRef.current;

        const handleOpen = () => {
            console.log("WebSocket connected in App.jsx");
        };

        const handleClose = () => {
            console.log("WebSocket disconnected in App.jsx");
        };

        const handleError = (error) => {
            console.error("WebSocket error in App.jsx:", error);
        };

        socket.addEventListener("open", handleOpen);
        socket.addEventListener("close", handleClose);
        socket.addEventListener("error", handleError);
        socket.addEventListener("message", handleMessage);

        return () => {
            socket.removeEventListener("open", handleOpen);
            socket.removeEventListener("close", handleClose);
            socket.removeEventListener("error", handleError);
            socket.removeEventListener("message", handleMessage);
        };
    }, [socketRef, handleMessage]);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setSelectedFile(acceptedFiles[0]);
        }
    }, [setSelectedFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
    });

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        console.log("File selected:", file);
        setSelectedFile(file);
    };

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
                <Header />

                <div className="p-4 space-y-4">
                    {!role && <RoleSelection setRole={setRole} />}

                    {role && (
                        <ConnectionInterface
                            role={role}
                            targetPeerId={targetPeerId}
                            setTargetPeerId={setTargetPeerId}
                            status={status}
                            peerId={peerId}
                            copyPeerId={copyPeerId}
                            copied={copied}
                            connectPeer={connectPeer}
                            wsConnected={wsConnected}
                            resetConnection={resetConnection}
                            isConnected={isConnected}
                        />
                    )}

                    {role === "sender" && status === "Connected to Peer" && (
                        <FileUpload
                            getRootProps={getRootProps}
                            removeEventListener={removeSelectedFile}
                            fileInputRef={fileInputRef}
                            handleFileChange={handleFileChange}
                            getInputProps={getInputProps}
                            isDragActive={isDragActive}
                            selectedFile={selectedFile}
                            sendFile={handleFileSend}
                            transferProgress={transferProgress}
                            fileSending={fileSending}
                            removeSelectedFile={removeSelectedFile}
                            formatFileSize={formatFileSize}
                        />
                    )}

                    {role === "receiver" &&
                        status === "Connected to Peer" &&
                        incomingFile &&
                        (console.log(
                            "Role:",
                            role,
                            "Status:",
                            status,
                            "Incoming File:",
                            incomingFile
                        ),
                        (
                            <FileReceiver
                                incomingFile={incomingFile}
                                transferProgress={receiveProgress}
                                acceptFile={acceptFile}
                                rejectFile={rejectFile}
                                acceptTransferredFile={acceptTransferredFile}
                            />
                        ))}

                    {status === "Connected to Peer" && 
                        (console.log("Transfer History:", transferHistory),
                        (<TransferHistory transfers={transferHistory} />))}
                </div>
            </div>
        </main>
    );
};

export default App;
