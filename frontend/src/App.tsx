import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { usePeerConnection } from "./hooks/usePeerConnection";
import { useFileTransfer } from "./hooks/useFileTransfer";
import { usePeerState } from "./hooks/usePeerState";
import { useDropzone } from "react-dropzone";
import Header from "./components/Header";
import { ConnectionInterface } from "./components/ConnectionInterface";
import { FileUpload } from "./components/FileUpload";
import { FileReceiver } from "./components/FileReceiver";
import { TransferHistory } from "./components/TransferHistory";
import { RoleSelection } from "./components/RoleSelection";
import { formatFileSize } from "./utils/formatFileSize";
import { X } from "lucide-react";
import {
    IncomingFile,
    Peer,
    FileMetadata,
    SignalState,
    Role,
    Transfer,
} from "./types/index";
import { v4 as uuidv4 } from "uuid";
import ErrorModal from "./components/ErrorModal";

const App = () => {
    const [role, setRole] = useState<Role>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [incomingFile, setIncomingFile] = useState<IncomingFile | null>(null);
    const [receiveProgress, setReceiveProgress] = useState<number>(0);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const { peerId, wsConnected, wsStatus, setWsStatus, socketRef, connectWebSocket } =
        useWebSocket();

    const rejectFile = () => {
        setIncomingFile(null);
        setReceiveProgress(0);
    };

    const acceptFile = () => {
        setIncomingFile(null);
        setReceiveProgress(0);
    };

    const copyPeerId = () => {
        navigator.clipboard.writeText(peerId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        setTransferProgress(0);
        setFileSending(false);
    };

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
        fileInfoRef,
        isConnected,
        acceptTransferredFile,
        pcStatus,
        setPcStatus,
    } = usePeerConnection(
        socketRef,
        role,
        setRole,
        setReceiveProgress,
        setIncomingFile,
    );

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

    const {
        peerState,
        initializeLocalPeer,
        initializeRemotePeer,
        updatePeerConnection,
        startFileTransfer,
        updateTransferProgress,
        updateTransferStatus,
        resetPeerState
    } = usePeerState();

    const closeModal = () => {
        setIsModalOpen(false);
    };

    useEffect(() => {
        if (role && peerId) {
            initializeLocalPeer(peerId, role);
        }
    }, [role, peerId]);

    const handleFileSend = () => {
        console.log("handleFileSend called", {
            hasFile: !!selectedFile,
            hasDataChannel: !!dataChannelRef.current,
            dataChannelState: dataChannelRef.current?.readyState,
            hasRemotePeer: !!peerState.remotePeer,
            selectedFileInfo: selectedFile ? {
                name: selectedFile.name,
                size: selectedFile.size
            } : null
        });
    
        if (!selectedFile || !dataChannelRef.current || !peerState.remotePeer) {
            console.error("Missing requirements for file send:", {
                hasFile: !!selectedFile,
                hasDataChannel: !!dataChannelRef.current,
                hasRemotePeer: !!peerState.remotePeer
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
        startFileTransfer(peerState.localPeer!.id, fileMetadata);
        
        dataChannelRef.current.send(JSON.stringify({
            messageType: "file-info",
            ...fileMetadata
        }));
    
        console.log("Sending file chunks...");
        sendFile(dataChannelRef.current, selectedFile, (progress) => {
            console.log("Transfer progress:", progress);
            setTransferProgress(progress);
            updateTransferProgress(peerState.localPeer!.id, progress);
        })
            .then(() => {
                console.log("File transfer completed");
                updateTransferStatus(peerState.localPeer!.id, 'completed');
                setFileSending(false);
                removeSelectedFile();
            })
            .catch((error) => {
                console.error("File transfer failed:", error);
                updateTransferStatus(peerState.localPeer!.id, 'rejected');
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
                        console.log("Received ICE candidate:", data);
                        await handleCandidate(data);
                        break;
                    default:
                        console.warn("Unknown message type:", data.type);
                }
            } catch (error) {
                console.error("Error handling message:", error);
                setWsStatus("Error");
            }
        },
        [
            handleOffer,
            handleAnswer,
            handleCandidate,
            setIncomingFile,
            setReceiveProgress,
            setWsStatus,
        ]
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

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                setSelectedFile(acceptedFiles[0]);
            }
        },
        [setSelectedFile]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let file: File | null = null;
        if (event.target.files) {
            file = event.target.files[0];
        }
        console.log("File selected:", file);
        setSelectedFile(file);
    };

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
                    {!role && <RoleSelection setRole={setRole} />}

                    {role && (
                        <ConnectionInterface
                            copied={copied}
                            setCopied={setCopied}
                            role={role}
                            targetPeerId={targetPeerId}
                            setTargetPeerId={setTargetPeerId}
                            pcStatus={pcStatus}
                            wsConnected={wsConnected}
                            isConnected={isConnected}
                            peerId={peerId}
                            copyPeerId={copyPeerId}
                            createPeerConnection={createPeerConnection}
                            setupDataChannel={setupDataChannel}
                            setPcStatus={setPcStatus}
                            disconnectPeer={disconnectPeer}
                            setRole={setRole}
                            setIncomingFile={setIncomingFile}
                            setReceiveProgress={setReceiveProgress}
                            peerConnectionRef={peerConnectionRef}
                            dataChannelRef={dataChannelRef}
                            onSendOffer={(offerMessage) => {
                                socketRef.current?.send(
                                    JSON.stringify(offerMessage)
                                );
                            }}
                            setWsStatus={setWsStatus}
                            setSelectedFile={setSelectedFile}
                        />
                    )}

                    {role === "sender" && pcStatus === "Connected to Peer" && (
                        <FileUpload
                            getRootProps={getRootProps}
                            handleFileChange={handleFileChange}
                            getInputProps={getInputProps}
                            isDragActive={isDragActive}
                            setSelectedFile={setSelectedFile}
                            selectedFile={selectedFile}
                            sendFile={handleFileSend}
                            transferProgress={transferProgress}
                            fileSending={fileSending}
                            removeSelectedFile={removeSelectedFile}
                        />
                    )}

                    {role === "receiver" &&
                        pcStatus === "Connected to Peer" &&
                        incomingFile && (
                            <FileReceiver
                                incomingFile={incomingFile}
                                transferStatus={peerState.remotePeer?.currentTransfer?.status || "pending"}
                                transferProgress={receiveProgress}
                                acceptFile={acceptFile}
                                rejectFile={rejectFile}
                                acceptTransferredFile={acceptTransferredFile}
                            />
                        )}

                    {pcStatus === "Connected to Peer" &&
                        (<TransferHistory transfers={peerState.localPeer?.transfers || []} />)}
                </div>
            </div>
        </main>
    );
};

export default App;
