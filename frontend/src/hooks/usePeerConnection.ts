import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
    AnswerData,
    FileMetadata,
    IncomingFile,
    OfferData,
    Role,
    Transfer,
} from "../types";
import { usePeerState } from "./usePeerState";

export const usePeerConnection = (
    socketRef: React.RefObject<WebSocket | null>,
    role: Role,
    setRole: (role: Role) => void,
    setReceiveProgress: (progress: number) => void,
    setIncomingFile: (file: IncomingFile) => void
) => {
    const [targetPeerId, setTargetPeerId] = useState<string>("");
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const [pcStatus, setPcStatus] = useState<string>("Disconnected");
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const receivedBuffersRef = useRef<ArrayBuffer[]>([]);
    const receivedSizeRef = useRef<number>(0);
    const fileInfoRef = useRef<FileMetadata | null>(null);
    const completedFileRef = useRef(null);

    const {
        peerState,
        resetPeerState,
        updateTransferProgress,
        updateTransferStatus,
        initializeRemotePeer,
    } = usePeerState();

    const iceServers = useMemo(
        () => ({
            iceServers: [
                { urls: "stun:stun.relay.metered.ca:80" },
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun.l.google.com:5349" },
                { urls: "stun:stun1.l.google.com:3478" },
                { urls: "stun:stun1.l.google.com:5349" },
                { urls: "stun:stun2.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:5349" },
                { urls: "stun:stun3.l.google.com:3478" },
                { urls: "stun:stun3.l.google.com:5349" },
                { urls: "stun:stun4.l.google.com:19302" },
                { urls: "stun:stun4.l.google.com:5349" },
                {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "28471e62a421937f1e824e89",
                    credential: "MPdjNA8BI5yHZA2L",
                },
                {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "28471e62a421937f1e824e89",
                    credential: "MPdjNA8BI5yHZA2L",
                },
                {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "28471e62a421937f1e824e89",
                    credential: "MPdjNA8BI5yHZA2L",
                },
                {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "28471e62a421937f1e824e89",
                    credential: "MPdjNA8BI5yHZA2L",
                },
            ],
        }),
        []
    );

    const disconnectPeer = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        if (dataChannelRef.current) {
            dataChannelRef.current.close();
        }
        resetPeerState();
        setPcStatus("Not Connected");
    }, [resetPeerState, setPcStatus]);

    const handleDataChannelMessage = useCallback(
        (event: MessageEvent) => {
            try {
                if (typeof event.data === "string") {
                    const parsedData = JSON.parse(event.data);
                    if (parsedData.messageType === "file-info") {
                        fileInfoRef.current = {
                            id: parsedData.id,
                            name: parsedData.name,
                            size: parsedData.size,
                            type: parsedData.type,
                        };
                        // Start transfer when receiving file info
                        updateTransferStatus(
                            peerState.remotePeer!.id,
                            "in_progress"
                        );
                    }
                } else if (event.data instanceof ArrayBuffer) {
                    receivedBuffersRef.current.push(event.data);
                    receivedSizeRef.current += event.data.byteLength;

                    if (fileInfoRef.current) {
                        const progress = Math.min(
                            Math.round(
                                (receivedSizeRef.current /
                                    fileInfoRef.current.size) *
                                    100
                            ),
                            100
                        );
                        setReceiveProgress(progress);
                        updateTransferProgress(
                            peerState.remotePeer!.id,
                            progress
                        );

                        if (
                            receivedSizeRef.current === fileInfoRef.current.size
                        ) {
                            const completeFile = new File(
                                [new Blob(receivedBuffersRef.current)],
                                fileInfoRef.current.name,
                                { type: fileInfoRef.current.type }
                            );
                            setIncomingFile({
                                file: completeFile,
                                metadata: fileInfoRef.current,
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing received data:", error);
            }
        },
        [
            setIncomingFile,
            setReceiveProgress,
            updateTransferProgress,
            updateTransferStatus,
        ]
    );

    const acceptTransferredFile = useCallback(() => {
        if (completedFileRef.current) {
            const { blob, name } = completedFileRef.current;
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = name;
            link.click();
            URL.revokeObjectURL(link.href);

            // Reset the refs
            completedFileRef.current = null;
            receivedBuffersRef.current = [];
            receivedSizeRef.current = 0;
            fileInfoRef.current = null;

            return true;
        }
        return false;
    }, []);

    const setupDataChannel = useCallback(
        (channel: RTCDataChannel) => {
            channel.binaryType = "arraybuffer";
            channel.onopen = () => {
                console.log("Data channel opened", {
                    targetPeerId,
                    hasRemotePeer: !!peerState.remotePeer,
                    role,
                });

                setPcStatus("Connected to Peer");
                setIsConnected(true);
            };

            // Double-check remote peer initialization
            if (targetPeerId && !peerState.remotePeer) {
                const remoteRole = role === "sender" ? "receiver" : "sender";
                console.log(
                    `Data channel opened: initializing remote peer with role: ${remoteRole}`
                );
                initializeRemotePeer(targetPeerId, remoteRole);
            }

            channel.onclose = () => {
                console.log("Data channel closed");
                setPcStatus("Disconnected");
                setIsConnected(false);
            };
            channel.onerror = (error) => {
                console.error("Data channel error:", error);
                setPcStatus("Data Channel Error");
                setIsConnected(false);
            };

            channel.onmessage = (event: MessageEvent) => {
                handleDataChannelMessage(event);
            };
        },
        [
            setPcStatus,
            setIsConnected,
            handleDataChannelMessage,
            targetPeerId,
            role,
            initializeRemotePeer,
        ]
    );

    const handleConnectionStateChange = useCallback(() => {
        if (peerConnectionRef.current?.connectionState === "connected") {
            console.log(
                "Connection established, ensuring remote peer is initialized"
            );
            if (targetPeerId && !peerState.remotePeer) {
                const remoteRole = role === "sender" ? "receiver" : "sender";
                console.log(
                    `Late initialization of remote peer with role: ${remoteRole}`
                );
                initializeRemotePeer(targetPeerId, remoteRole);
            }
        }
    }, [targetPeerId, peerState.remotePeer, role, initializeRemotePeer]);

    const createPeerConnection = useCallback(async () => {
        try {
            if (peerConnectionRef.current) {
                console.log("Peer connection already exists.");
                return peerConnectionRef.current;
            }

            console.log("Creating new peer connection.");
            peerConnectionRef.current = new RTCPeerConnection(iceServers);

            // Monitor connection state
            peerConnectionRef.current.onconnectionstatechange = () => {
                console.log(
                    "Connection state changed:",
                    peerConnectionRef.current?.connectionState
                );
                if (
                    peerConnectionRef.current?.connectionState === "connected"
                ) {
                    console.log("Peers connected successfully!");
                    handleConnectionStateChange();
                } else if (
                    peerConnectionRef.current?.connectionState ===
                    "disconnected"
                ) {
                    setPcStatus("Disconnected");
                }
            };

            // Monitor signaling state
            peerConnectionRef.current.onsignalingstatechange = () => {
                console.log(
                    "Signaling state changed:",
                    peerConnectionRef.current?.signalingState
                );
            };

            peerConnectionRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socketRef.current?.send(
                        JSON.stringify({
                            type: "candidate",
                            target: targetPeerId,
                            candidate: event.candidate,
                        })
                    );
                } else {
                    console.log("ICE candidate generation complete");
                }
            };

            peerConnectionRef.current.onicecandidateerror = (error) => {
                // Only log errors that aren't related to STUN server connection attempts
                if (!error.url.includes("stun:")) {
                    console.error("Critical ICE candidate error:", error);
                }
            };

            peerConnectionRef.current.ondatachannel = (event) => {
                dataChannelRef.current = event.channel;
                setupDataChannel(event.channel);
            };

            return peerConnectionRef.current;
        } catch (error) {
            console.error("Error creating peer connection:", error);
            setPcStatus("Connection Error");
            return null;
        }
    }, [
        socketRef,
        targetPeerId,
        setPcStatus,
        iceServers,
        setupDataChannel,
        handleConnectionStateChange,
    ]);

    const handleOffer = useCallback(
        async ({ peerId, offer }: OfferData) => {
            console.log("Handling incoming offer from:", peerId);
            setTargetPeerId(peerId);
            setPcStatus("Receiving Offer");

            try {
                // Initialize remote peer before creating connection
                const remoteRole = role === "sender" ? "receiver" : "sender";
                console.log(
                    `Initializing remote peer with role: ${remoteRole}`
                );
                initializeRemotePeer(peerId, remoteRole);

                peerConnectionRef.current = await createPeerConnection();
                if (!peerConnectionRef.current) {
                    console.error(
                        "Failed to create peer connection while handling offer"
                    );
                    return;
                }

                console.log("Setting remote description...");
                await peerConnectionRef.current.setRemoteDescription(
                    new RTCSessionDescription(offer)
                );

                console.log("Creating answer...");
                const answer = await peerConnectionRef.current.createAnswer();

                console.log("Setting local description...");
                await peerConnectionRef.current.setLocalDescription(answer);

                console.log("Sending answer to peer:", peerId);
                socketRef.current?.send(
                    JSON.stringify({
                        type: "answer",
                        target: peerId,
                        answer: answer,
                    })
                );

                setPcStatus("Waiting for Connection");
            } catch (error) {
                console.error("Error handling offer:", error);
                setPcStatus("Offer Error");
                disconnectPeer();
            }
        },
        [createPeerConnection, socketRef, setPcStatus, disconnectPeer]
    );

    const handleAnswer = useCallback(
        async ({ answer }: AnswerData) => {
            console.log("Handling incoming answer...");
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(answer);
                setPcStatus("Connected to Peer");
                setIsConnected(true);
            }
        },
        [setPcStatus]
    );

    const handleCandidate = useCallback(
        async (data: { candidate: RTCIceCandidate }) => {
            if (!peerConnectionRef.current) {
                console.error("Peer connection is not initialized.");
                return;
            }

            try {
                await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(data.candidate)
                );
            } catch (error) {
                console.error("Error adding ICE candidate:", error);
            }
        },
        []
    );

    useEffect(() => {
        const handleDisconnect = () => {
            if (
                targetPeerId &&
                peerConnectionRef.current?.connectionState === "disconnected"
            ) {
                alert("Disconnected due to single peer.");
                setRole(null);
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

    return {
        targetPeerId,
        setTargetPeerId,
        peerConnectionRef,
        dataChannelRef,
        createPeerConnection,
        setupDataChannel,
        handleOffer,
        handleAnswer,
        handleCandidate,
        fileInfoRef,
        disconnectPeer,
        isConnected,
        acceptTransferredFile,
        pcStatus,
        setPcStatus,
    };
};
