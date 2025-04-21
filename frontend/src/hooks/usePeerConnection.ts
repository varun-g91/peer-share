import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
    FileMetadata,
    IncomingFile,
    PeerConnectionStatus,
    Role,
    Transfer,
} from "../types";
import { useDispatch, useSelector } from "react-redux";
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


    const iceServers = useMemo(
        () => ({
            iceServers: [
                {
                    urls: "stun:stun.relay.metered.ca:80",
                },
                {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "9e32000a1b04a9c0d7bb4425",
                    credential: "VUJvL9eXEdxKPMhu",
                },
                {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "9e32000a1b04a9c0d7bb4425",
                    credential: "VUJvL9eXEdxKPMhu",
                },
                {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "9e32000a1b04a9c0d7bb4425",
                    credential: "VUJvL9eXEdxKPMhu",
                },
                // {
                //     urls: "turns:global.relay.metered.ca:443?transport=tcp",
                //     username: "9e32000a1b04a9c0d7bb4425",
                //     credential: "VUJvL9eXEdxKPMhu",
                // },
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
        dispatch(resetPeerConnection());
        clearTimeout(connectionTimeoutRef.current!);
    }, [resetPeerConnection]);

    const setConnectionTimeout = useCallback(() => {
        console.log("Setting connection timeout...");
        clearTimeout(connectionTimeoutRef.current!);
        connectionTimeoutRef.current = setTimeout(() => {
            console.log("Connection timed out. Disconnecting...");
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
                        fileInfoRef.current = {
                            name: parsedData.name,
                            id: parsedData.id,
                            type: parsedData.type,
                            size: parsedData.size,
                        };
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

                            dispatch(setIncomingFile({ metadata: fileInfoRef.current }));
                            completedFileRef.current = completeFile;
                            receivedBuffersRef.current = [];
                            receivedSizeRef.current = 0;
                            fileInfoRef.current = null;
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
                channel.binaryType = "arraybuffer";
                
                channel.onopen = () => {
                    if (channel.readyState === "open") {
                        dispatch(setPeerConnectionStatus("Connected"));
                        dispatch(setIsConnected(true));
                        setConnectionTimeout();
                    }
                };

                channel.onclose = () => {
                    dispatch(setPeerConnectionStatus("Disconnected"));
                    dispatch(setIsConnected(false));
                };

                channel.onerror = (error) => {
                    console.error("Data channel error:", error);
                    dispatch(setPeerConnectionStatus("Error"));
                    dispatch(setIsConnected(false));
                };

                channel.onmessage = handleDataChannelMessage;
            } catch (error) {
                console.error("Data channel setup error:", error);
                dispatch(setPeerConnectionStatus("Error"));
                dispatch(setIsConnected(false));
            }
        },
        [handleDataChannelMessage, targetPeerId, role, setPeerConnectionStatus, setIsConnected, dispatch]
    );


    const createPeerConnection = useCallback(async () => {
        try {
            if (peerConnectionRef.current) {
                return peerConnectionRef.current;
            }

            peerConnectionRef.current = new RTCPeerConnection(iceServers);
            dispatch(setPeerConnectionStatus("Connecting"));
            dispatch(setIsInitiator(true));

            if (peerConnectionRef.current) {
                peerConnectionRef.current.onconnectionstatechange = () => {
                    const state = peerConnectionRef.current?.connectionState;
                    switch(state) {
                        case "connected":
                            console.log("Peer connection established");
                            break;
                        case "disconnected":
                        case "failed":
                            console.error("Peer connection failed or disconnected:", state);
                            dispatch(setPeerConnectionStatus("Disconnected"));
                            dispatch(setIsConnected(false));
                            break;
                        case "connecting":
                            dispatch(setPeerConnectionStatus("Connecting"));
                            break;
                    }
                };

                const channel = peerConnectionRef.current.createDataChannel("fileTransfer");
                dataChannelRef.current = channel;
                handleDataChannelEvents(channel);

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

                peerConnectionRef.current.oniceconnectionstatechange = () => {
                    if (peerConnectionRef.current?.iceConnectionState === "failed") {
                        console.error("ICE connection failed");
                    }
                };

                peerConnectionRef.current.onicecandidateerror = (error) => {
                    if (!error.url.includes("stun:")) {
                        console.error("Critical ICE candidate error:", error);
                    }
                };

                peerConnectionRef.current.ondatachannel = (event) => {
                    dataChannelRef.current = event.channel;
                    handleDataChannelEvents(event.channel);
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
            console.error("Error creating peer connection:", error);
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
                    peerConnectionRef.current = new RTCPeerConnection(iceServers);

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
