import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
    FileMetadata,
    IncomingFile,
    PeerConnectionStatus,
    Role,
    Transfer,
} from "../types";
import { useDispatch, useSelector } from "react-redux";
import { store } from "../store";
import {
    setIncomingFile,
    setReceiveProgress,
    setPeerConnectionStatus,
    resetPeerConnection,
    setIsConnected,
    setTargetPeerId,
    setIsReceivingFile,
    setWebSocketStatus,
    setRemotePeer,
    setIsInitiator,
} from "../store/peerSlice";
import { RootState } from "../store";
import { startTransfer, resetCurrentTransfer, completeTransfer } from "../store/transferSlice";
import { iceConfiguration } from "../utils/iceServers";

type OfferSignal = {
    peerId: string;
    offer: RTCSessionDescriptionInit;
};

type AnswerSignal = {
    answer: RTCSessionDescriptionInit;
    target: string;
};

type CandidateSignal = {
    candidate: RTCIceCandidate;
};

const CONNECTION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export const usePeerConnection = (
    socketRef: React.RefObject<WebSocket | null>
) => {
    const dispatch = useDispatch();
    const { role, targetPeerId, pcStatus, peerId, remotePeer } =
        useSelector((state: RootState) => state.peer);
    const isInitiator = useSelector((state: RootState) => state.peer.isInitiator || false);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const receivedBuffersRef = useRef<ArrayBuffer[]>([]);
    const receivedSizeRef = useRef<number>(0);
    const fileInfoRef = useRef<FileMetadata | null>(null);
    const completedFileRef = useRef<File | null>(null);
    const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    const iceServers = useMemo(() => iceConfiguration, []);

    const disconnectPeer = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        if (dataChannelRef.current) {
            dataChannelRef.current.close();
        }
        dispatch(resetPeerConnection());
        clearTimeout(connectionTimeoutRef.current!);
    }, [resetPeerConnection]);

    const setConnectionTimeout = useCallback(() => {
        console.log("Setting connection timeout...");
        clearTimeout(connectionTimeoutRef.current!);
        connectionTimeoutRef.current = setTimeout(() => {
            console.log("Connection timed out. Disconnecting...");
            alert("Connection timed out. Please try again.");
            disconnectPeer();
        }, CONNECTION_TIMEOUT);
    }, [disconnectPeer]);

    const resetConnectionTimeout = useCallback(() => {
        console.log("Resetting connection timeout...");
        clearTimeout(connectionTimeoutRef.current!);
        setConnectionTimeout();
    }, [setConnectionTimeout]);


    const handleDataChannelMessage = useCallback(
        (event: MessageEvent) => {
            try {
                if (typeof event.data === "string") {
                    dispatch(setIsReceivingFile(true));
                    const parsedData = JSON.parse(event.data);
                    if (parsedData.messageType === "file-info") {
                        const fileMetadata = {
                            name: parsedData.name,
                            id: parsedData.id,
                            type: parsedData.type,
                            size: parsedData.size,
                        };

                        fileInfoRef.current = fileMetadata;
                        console.log("Received file metadata:", fileMetadata);

                        dispatch(setIncomingFile({ metadata: fileMetadata }));
                        
                        dispatch(startTransfer(fileInfoRef.current));
                    }
                } else if (event.data instanceof ArrayBuffer) {
                    receivedBuffersRef.current.push(event.data);
                    receivedSizeRef.current += event.data.byteLength;
                    if (fileInfoRef.current) {
                        const rawProgress = (receivedSizeRef.current / fileInfoRef.current.size) * 100;
                        const progress = Math.min(Math.round(rawProgress), 100);
                        dispatch(setReceiveProgress(progress));

                        if (receivedSizeRef.current >= fileInfoRef.current.size) {
                            const completeFile = new File(
                                [new Blob(receivedBuffersRef.current)],
                                fileInfoRef.current.name,
                                { type: fileInfoRef.current.type }
                            );
                            completedFileRef.current = completeFile;
                            dispatch(setReceiveProgress(null));
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing received data:", error);
            }
        },
        [setIncomingFile, setReceiveProgress]
    );

    const handleDataChannelEvents = useCallback(
        (channel: RTCDataChannel) => {
            try {
                console.log("Setting up data channel events for channel:", channel.label);
                channel.binaryType = "arraybuffer";

                dataChannelRef.current = channel;

                const updateConnectionState = () => {
                    console.log("Updating connection state. Channel state:", channel.readyState);
                    if (channel.readyState === "open") {
                        dispatch(setPeerConnectionStatus("Connected"));
                        dispatch(setIsConnected(true));
                        setConnectionTimeout();

                        setTimeout(() => {
                            const state = store.getState().peer;
                            console.log("Connection state after update:", {
                                pcStatus: state.pcStatus,
                                isConnected: state.isConnected
                            });
                        }, 0);
                    }
                };

                channel.onopen = () => {
                    console.log("Data channel onopen triggered, state:", channel.readyState);
                    updateConnectionState();
                };

                channel.onclose = () => {
                    console.log("Data channel closed");
                    dispatch(setPeerConnectionStatus("Disconnected"));
                    dispatch(setIsConnected(false));
                    dataChannelRef.current = null;
                };

                channel.onerror = (error) => {
                    console.error("Data channel error:", error);
                    dispatch(setPeerConnectionStatus("Error"));
                    dispatch(setIsConnected(false));
                };

                channel.onmessage = handleDataChannelMessage;

                // If channel is already open when we set up events
                if (channel.readyState === "open") {
                    console.log("Channel already open on setup");
                    updateConnectionState();
                }

            } catch (error) {
                console.error("Error in handleDataChannelEvents:", error);
                dispatch(setPeerConnectionStatus("Error"));
                dispatch(setIsConnected(false));
            }
        },
        [handleDataChannelMessage, setConnectionTimeout, dispatch]
    );


    const createPeerConnection = useCallback(async () => {
        try {
            if (peerConnectionRef.current) {
                console.log("Peer connection exists, returning existing connection");
                return peerConnectionRef.current;
            }

            console.log("Creating new peer connection with ICE servers:", iceServers);
            peerConnectionRef.current = new RTCPeerConnection(iceServers as RTCConfiguration);
            dispatch(setPeerConnectionStatus("Connecting"));
            dispatch(setIsInitiator(true));

            if (peerConnectionRef.current) {
                peerConnectionRef.current.onconnectionstatechange = () => {
                    const state = peerConnectionRef.current?.connectionState;
                    console.log("Connection state changed:", state);

                    switch (state) {
                        case "connected":
                            // Only update if we have a data channel
                            if (dataChannelRef.current?.readyState === "open") {
                                dispatch(setPeerConnectionStatus("Connected"));
                                dispatch(setIsConnected(true));
                            }
                            break;
                        case "disconnected":
                        case "failed":
                            dispatch(setPeerConnectionStatus("Disconnected"));
                            dispatch(setIsConnected(false));
                            break;
                        case "connecting":
                            dispatch(setPeerConnectionStatus("Connecting"));
                            break;
                    }
                };

                // Add ICE connection state monitoring
                peerConnectionRef.current.oniceconnectionstatechange = () => {
                    console.log("ICE Connection State:", peerConnectionRef.current?.iceConnectionState);
                    if (peerConnectionRef.current?.iceConnectionState === 'failed') {
                        console.log("ICE connection failed, attempting restart...");
                        if (peerConnectionRef.current) {
                            peerConnectionRef.current.restartIce();
                        }
                    }
                };

                // Create data channel before creating offer
                console.log("Creating data channel as initiator");
                const channel = peerConnectionRef.current.createDataChannel("fileTransfer", {
                    ordered: true,
                    negotiated: false,
                    maxRetransmits: 3,
                    protocol: 'file-transfer'
                });
                console.log("Data channel created with ID:", channel.id);
                dataChannelRef.current = channel;
                handleDataChannelEvents(channel);

                peerConnectionRef.current.ondatachannel = (event) => {
                    console.log("Received remote data channel");
                    if (event.channel) {
                        dataChannelRef.current = event.channel;
                        handleDataChannelEvents(event.channel);
                    } else {
                        console.error("Received null data channel");
                        dispatch(setPeerConnectionStatus("Error"));
                    }
                };

                peerConnectionRef.current.onicecandidate = (event) => {
                    if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(
                            JSON.stringify({
                                type: "candidate",
                                candidate: event.candidate,
                                target: targetPeerId
                            })
                        );
                    }
                };

                peerConnectionRef.current.onicecandidateerror = (event) => {
                    console.warn("ICE candidate error:", {
                        errorCode: event.errorCode,
                        errorText: event.errorText,
                        address: event.address,
                        port: event.port,
                        url: event.url
                    });

                    // Try fallback to TCP if UDP fails
                    if (event.errorCode === 701) {
                        console.log("Attempting fallback to TCP...");
                    }
                };

                try {
                    const offer = await peerConnectionRef.current.createOffer();
                    await peerConnectionRef.current.setLocalDescription(offer);

                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(
                            JSON.stringify({
                                type: "offer",
                                target: targetPeerId,
                                offer: offer,
                                peerId: peerId,
                            })
                        );
                        dispatch(setPeerConnectionStatus("Connecting"));
                    } else {
                        console.error("WebSocket is not open");
                        dispatch(setWebSocketStatus("Disconnected"));
                        disconnectPeer();
                        return null;
                    }
                } catch (error) {
                    console.error("Error in offer creation:", error);
                    dispatch(setPeerConnectionStatus("Error"));
                    disconnectPeer();
                    return null;
                }
            }

            return peerConnectionRef.current;
        } catch (error) {
            console.error("Error in createPeerConnection:", error);
            dispatch(setPeerConnectionStatus("Error"));
            return null;
        }
    }, [
        socketRef,
        targetPeerId,
        iceServers,
        handleDataChannelEvents,
        dispatch,
        isInitiator,
    ]);

    const handleOffer = useCallback(
        async ({ peerId, offer }: OfferSignal) => {
            console.log("Handling incoming offer from:", peerId);
            dispatch(setPeerConnectionStatus("Connecting"));

            try {
                if (peerId) dispatch(setTargetPeerId(peerId));

                const remoteRole = role === "sender" ? "receiver" : "sender";

                if (!peerConnectionRef.current) {
                    console.log("Creating peer connection on offer (remote peer)");
                    peerConnectionRef.current = new RTCPeerConnection(iceServers as RTCConfiguration);

                    peerConnectionRef.current.onicecandidate = (event) => {
                        if (event.candidate) {
                            socketRef.current?.send(JSON.stringify({
                                type: "candidate",
                                candidate: event.candidate,
                                target: peerId,
                            }));
                        }
                    };

                    console.log("Setting remote peer:", {
                        id: peerId,
                        role: remoteRole,
                        isConnected: false
                    })

                    dispatch(setRemotePeer({
                        id: peerId,
                        role: remoteRole,
                        isConnected: false
                    }));

                    peerConnectionRef.current.ondatachannel = (event) => {
                        console.log("Remote peer received data channel");
                        dataChannelRef.current = event.channel;
                        handleDataChannelEvents(event.channel);
                    };

                    peerConnectionRef.current.onconnectionstatechange = () => {
                        const state = peerConnectionRef.current?.connectionState;
                        // dispatch(setPeerConnectionStatus(state === "connected" ? "Connected" : "Disconnected"));
                    };

                    peerConnectionRef.current.oniceconnectionstatechange = () => {
                        console.log("ICE conn state:", peerConnectionRef.current?.iceConnectionState);
                    };
                }

                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnectionRef.current.createAnswer();
                await peerConnectionRef.current.setLocalDescription(answer);

                socketRef.current?.send(JSON.stringify({
                    type: "answer",
                    target: peerId,
                    answer: answer,
                }));
            } catch (error) {
                console.error("Error handling offer:", error);
                disconnectPeer();
                dispatch(setPeerConnectionStatus("Error"));
            }
        },
        [socketRef, role, dispatch, handleDataChannelEvents, disconnectPeer]
    );


    const handleAnswer = useCallback(
        async ({ answer, target }: AnswerSignal) => {
            console.log("Handling incoming answer...");
            try {
                if (!peerConnectionRef.current) {
                    console.error("Peer connection is not initialized.");
                    return;
                }
                await peerConnectionRef.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
                console.log("Answer set successfully.");
                console.log("remote peer state before dispatch: ", {
                    id: target,
                    role: role === "sender" ? "receiver" : "sender",
                    isConnected: false
                });

                dispatch(setRemotePeer({
                    id: target,
                    role: role === "sender" ? "receiver" : "sender",
                    isConnected: false
                }));
                console.log('Remote description set successfully');
            } catch (error) {
                console.error("Error setting remote description:", error);
                dispatch(setPeerConnectionStatus("Error"));
                dispatch(setRemotePeer(null));
            }
        },
        [dispatch, setRemotePeer, setPeerConnectionStatus, role]
    );

    const handleCandidate = useCallback(
        async ({ candidate }: CandidateSignal) => {
            if (pcStatus !== 'Connecting' && candidate) {
                dispatch(setPeerConnectionStatus("Connecting"));
            }

            if (!peerConnectionRef.current) {
                console.error("Peer connection is not initialized.");
                return;
            }
            try {
                if (candidate) {
                    console.log("Received candidate: ", candidate);
                    await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    throw new Error("Candidate missing");
                }
            } catch (error) {
                console.error("Error adding candidate: ", error);
            }
        }, [dispatch, setPeerConnectionStatus]);



    return {
        targetPeerId,
        setTargetPeerId,
        peerConnectionRef,
        dataChannelRef,
        createPeerConnection,
        handleDataChannelEvents,
        handleOffer,
        handleAnswer,
        receivedSizeRef,
        handleCandidate,
        remotePeer,
        completedFileRef,
        fileInfoRef,
        disconnectPeer,
        pcStatus,
        role,
        peerId
    };
};
