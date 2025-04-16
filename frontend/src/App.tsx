import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePeerConnection } from "./hooks/usePeerConnection";
import { useFileTransfer } from "./hooks/useFileTransfer";
import Header from "./components/Header";
import { ConnectionInterface } from "./components/ConnectionInterface";
import { FileUpload } from "./components/FileUpload";
import { FileReceiver } from "./components/FileReceiver";
import { TransferHistory } from "./components/TransferHistory";
import { RoleSelection } from "./components/RoleSelection";
import { v4 as uuidv4 } from "uuid";
import ErrorModal from "./components/ErrorModal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./store";
import {
    setLocalPeer,
    setWebSocketStatus,
    setRole,
    setIncomingFile,
    setReceiveProgress,
    setIsReceivingFile,
} from "./store/peerSlice";
import { completeTransferSender, resetCurrentTransfer, updateProgress } from "./store/transferSlice";
import { ProgressBar } from "./components/ProgressBar";
import { FileMetadata } from "./types";

const App = () => {
    const { incomingFile, receiveProgress, isReceivingFile, wsConnected, isConnected } = useSelector(
        (state: RootState) => state.peer
    );

    const [copied, setCopied] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const { socketRef, connectWebSocket, wsStatus } = useWebSocket();

    const dispatch = useDispatch();

    const resetFileReceiver = () => {
        dispatch(setIncomingFile(null));
        dispatch(resetCurrentTransfer());
        dispatch(setIsReceivingFile(false));
        dispatch(setReceiveProgress(null));
    };

    const currentTransfer = useSelector(
        (state: RootState) => state.transfer.currentTransfer
    );

    const transferHistory = useSelector(
        (state: RootState) => state.transfer.transferHistory
    );

    const copyPeerId = () => {
        navigator.clipboard.writeText(peerId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        dispatch(updateProgress(null));
        dispatch(resetCurrentTransfer());
        setFileSending(false);
    };

    const {
        setTargetPeerId,
        peerConnectionRef,
        dataChannelRef,
        targetPeerId,
        disconnectPeer,
        createPeerConnection,
        handleOffer,
        handleAnswer,
        handleCandidate,
        peerId,
        fileInfoRef,
        role,
        pcStatus,
        receivedSizeRef,
        remotePeer,
        completedFileRef,
    } = usePeerConnection(socketRef);

    const {
        fileSending,
        selectedFile,
        setSelectedFile,
        sendFile,
        setFileSending,
    } = useFileTransfer();

    useEffect(() => {
        connectWebSocket().catch((error) => {
            console.error("Failed to connect to signaling server: ", error);
        });
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    const closeModal = () => {
        setIsModalOpen(false);
    };

    useEffect(() => {
        if (role && peerId) {
            console.log("Setting local peer in App.jsx:", {
                id: peerId,
                role: role,
                isConnected: false,
            });
            dispatch(
                setLocalPeer({
                    id: peerId,
                    role: role,
                    isConnected: false,
                })
            );
        }
    }, [role, peerId, dispatch]);

    useEffect(() => {
        if (incomingFile) {
            console.log("Incoming file:", incomingFile);
        }
    }, [incomingFile]);

    const handleFileSend = () => {
        console.log("handleFileSend called");

        if (!selectedFile || !dataChannelRef.current || !remotePeer) {
            console.error("Missing requirements for file send:", {
                hasFile: !!selectedFile,
                hasDataChannel: !!dataChannelRef.current,
                hasRemotePeer: !!remotePeer,
            });
            return;
        }

        setFileSending(true);
        const fileMetadata = {
            id: uuidv4(),
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
        };

        console.log("Starting file transfer with metadata:", fileMetadata);

        dataChannelRef.current.send(
            JSON.stringify({
                messageType: "file-info",
                ...fileMetadata,
            })
        );

        console.log("Sending file chunks...");
        sendFile(dataChannelRef.current, selectedFile, fileMetadata)
            .then(() => {
                console.log("File transfer completed");
                if (dataChannelRef.current) {
                    dataChannelRef.current.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data.messageType === "file-accepted") {
                            console.log("File accepted by receiver");
                            
                            if (data.fileMetadata) {
                                dispatch(completeTransferSender(data.fileMetadata as FileMetadata));
                            }

                            console.log("current transfer:", currentTransfer);
                            dispatch(resetCurrentTransfer());
                            dispatch(setIncomingFile(null));
                        } else if (data.messageType === "file-rejected") {
                            console.log("File rejected by receiver");
                            dispatch(resetCurrentTransfer());
                            dispatch(setIncomingFile(null));
                            alert("File transfer rejected by the receiver.");
                        }
                    }
                }
                setFileSending(false);
                removeSelectedFile();
            })
            .catch((error) => {
                console.error("File transfer failed:", error);
                setFileSending(false);
                removeSelectedFile();
            });
    };
    const handleMessage = useCallback(
        async (event: MessageEvent) => {
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
                        console.log("Received ICE candidates:", data.candidate);
                        await handleCandidate({ candidate: data.candidate });
                        break;
                    default:
                        console.warn("Unknown message type:", data.type);
                }
            } catch (error) {
                console.error("Error handling message:", error);
                dispatch(setWebSocketStatus("Error"));
            }
        },
        [handleOffer, handleAnswer, handleCandidate, setWebSocketStatus]
    );

    useEffect(() => {
        if (!socketRef.current) {
            console.error("WebSocket is not connected.");
            setIsModalOpen(true);
            return;
        }

        const socket = socketRef.current;

        const handleOpen = () => {
            console.log("WebSocket connected in App.jsx");
        };

        const handleClose = () => {
            console.log("WebSocket disconnected in App.jsx");
        };

        const handleError = (error: Event) => {
            console.error("WebSocket error in App.jsx:", error);
            setIsModalOpen(true);
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


    useEffect(() => {
        const handleDisconnect = () => {
            if (
                targetPeerId &&
                peerConnectionRef.current?.connectionState === "disconnected"
            ) {
                alert("Disconnected due to single peer.");
                dispatch(setRole(null));
                disconnectPeer();
            }
        };

        if (peerConnectionRef.current) {
            const connectionState = peerConnectionRef.current.connectionState;
            if (
                connectionState === "disconnected" ||
                connectionState === "failed"
            ) {
                handleDisconnect();
            }
        }

        return () => {
            if (peerConnectionRef.current?.connectionState === "disconnected") {
                handleDisconnect();
            }
        };
    }, [disconnectPeer, targetPeerId, setRole]);

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <ErrorModal
                isOpen={isModalOpen}
                onClose={closeModal}
                connectWebSocket={connectWebSocket}
                wsStatus={wsStatus}
            />

            <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
                <Header />

                <div className="p-4 space-y-4">
                    {!role && <RoleSelection />}

                    {role && (
                        <ConnectionInterface
                            createPeerConnection={createPeerConnection}
                            copyPeerId={copyPeerId}
                            copied={copied}
                            peerId={peerId}
                            pcStatus={pcStatus}
                            isConnected={isConnected}
                            targetPeerId={targetPeerId}
                            wsConnected={wsConnected}
                            wsStatus={wsStatus}
                            role={role}
                        />
                    )}

                    {role === "sender" && pcStatus === "Connected" && (
                        <FileUpload
                            setSelectedFile={setSelectedFile}
                            selectedFile={selectedFile}
                            sendFile={handleFileSend}
                            fileSending={fileSending}
                            removeSelectedFile={removeSelectedFile}
                            currentTransfer={currentTransfer}
                        />
                    )}

                    {role === "receiver" && pcStatus === "Connected" && (
                        <FileReceiver
                            isReceivingFile={isReceivingFile}
                            fileSending={fileSending}
                            completedFileRef={completedFileRef}
                            fileInfoRef={fileInfoRef}
                            incomingFile={incomingFile}
                            receivedSizeRef={receivedSizeRef}
                            resetFileReceiver={resetFileReceiver}
                            currentTransfer={currentTransfer}
                            receiveProgress={receiveProgress}
                            dataChannelRef={dataChannelRef}
                        />
                    )}

                    {pcStatus === "Connected" && (
                        <TransferHistory transferHistory={transferHistory} />
                    )}
                    
                </div>
            </div>
        </main>
    );
};

export default App;
