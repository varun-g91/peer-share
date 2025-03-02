import { useRef, useState, useCallback, useEffect, useMemo } from 'react';

export const usePeerConnection = (socketRef, setStatus, setIncomingFile, formatFileSize, setReceiveProgress) => {
    const [targetPeerId, setTargetPeerId] = useState("");
    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    const receivedBuffersRef = useRef([]);
    const receivedSizeRef = useRef(0);
    const fileInfoRef = useRef(null);
    const completedFileRef = useRef(null);


    const iceServers = useMemo(() => ({
        iceServers: [
            { urls: "stun:stun.relay.metered.ca:80", },
            { urls: "stun:stun.l.google.com:19302", },
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
        ]
    }), []);

    const disconnectPeer = useCallback(() => {
        if (dataChannelRef.current) {
            console.log("Closing data channel.");
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }

        if (peerConnectionRef.current) {
            console.log("Closing peer connection.");
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        setStatus("Disconnected");
        setIsConnected(false);
        setTargetPeerId("");
    }, [setStatus]);

    const handleDataChannelMessage = useCallback((event) => {
        try {
            const data = event.data;
            if (typeof data === "string") {
                const parsedData = JSON.parse(data);
                console.log("Received message:", parsedData);
                if (parsedData.messageType === "file-info") {
                    fileInfoRef.current = parsedData;
                    receivedBuffersRef.current = [];
                    receivedSizeRef.current = 0;
                    console.log("File info received:", fileInfoRef.current);
                    setIncomingFile({
                        name: parsedData.name,
                        size: formatFileSize(parsedData.size),
                    });
                }
            } else {
                // Handle file chunk
                console.log("Received chunk size:", data.byteLength);
                receivedBuffersRef.current.push(data);
                receivedSizeRef.current += data.byteLength;

                if (fileInfoRef.current) {
                    const progress = (receivedSizeRef.current / fileInfoRef.current.size) * 100;
                    setReceiveProgress(Math.round(progress));
                }

                if (fileInfoRef.current && receivedSizeRef.current === fileInfoRef.current.size) {
                    console.log("File transfer complete");
                    completedFileRef.current = {
                        blob: new Blob(receivedBuffersRef.current),
                        name: fileInfoRef.current.name
                    };
                    // const receivedFile = new Blob(receivedBuffersRef.current);
                    // const link = document.createElement("a");
                    // link.href = URL.createObjectURL(receivedFile);
                    // link.download = fileInfoRef.current.name;
                    // link.click();
                    // URL.revokeObjectURL(link.href);
                }
            }
        } catch (error) {
            console.error("Error processing received data:", error);
        }
    }, [setIncomingFile, formatFileSize, setReceiveProgress]);
    
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

    const setupDataChannel = useCallback((channel) => {
        console.log('Setting up data channel event listeners...', channel);
        console.log('Data channel state at setup:', channel.readyState);
        channel.binaryType = "arraybuffer";
        channel.onopen = () => {
            console.log("Data channel opened");
            setStatus("Connected to Peer");
            setIsConnected(true);
        };
        channel.onclose = () => {
            console.log("Data channel closed");
            setStatus("Disconnected");
            setIsConnected(false);
        };
        channel.onerror = (error) => {
            console.error("Data channel error:", error);
            setStatus("Data Channel Error");
            setIsConnected(false);
        };

        channel.onmessage = (event) => {
            handleDataChannelMessage(event);
        };
    }, [setStatus, setIsConnected, handleDataChannelMessage]);

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
                console.log("Connection state changed:", peerConnectionRef.current.connectionState);
                if (peerConnectionRef.current.connectionState === 'connected') {
                    console.log("Peers connected successfully!");
                }
            };

            // Monitor signaling state
            peerConnectionRef.current.onsignalingstatechange = () => {
                console.log("Signaling state changed:", peerConnectionRef.current.signalingState);
            };

            peerConnectionRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("Generated ICE candidate:", event.candidate);
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
                if (!error.url.includes('stun:')) {
                    console.error("Critical ICE candidate error:", error);
                }
            };

            peerConnectionRef.current.ondatachannel = (event) => {
                console.log("Received Data Channel:", event.channel);
                console.log("Data channel state on receive:", event.channel.readyState);
                dataChannelRef.current = event.channel;
                setupDataChannel(event.channel);
            };

            peerConnectionRef.current.onicegatheringstatechange = () => {
                console.log(
                    "ICE gathering state changed:",
                    peerConnectionRef.current.iceGatheringState
                );
            };

            console.log("Initial connection state:", peerConnectionRef.current.connectionState);
            console.log("Initial signaling state:", peerConnectionRef.current.signalingState);
            console.log("Initial ICE gathering state:", peerConnectionRef.current.iceGatheringState);

            return peerConnectionRef.current;
        } catch (error) {
            console.error("Error creating peer connection:", error);
            setStatus("Connection Error");
            return null;
        }
    }, [socketRef, targetPeerId, setStatus, iceServers, setupDataChannel]);

    const handleOffer = useCallback(
        async ({ peerId, offer }) => {
            console.log("Handling incoming offer from:", peerId);
            console.log("Offer details:", offer);
            setTargetPeerId(peerId);
            setStatus("Receiving Offer");

            try {
                peerConnectionRef.current = await createPeerConnection();
                if (!peerConnectionRef.current) {
                    console.error("Failed to create peer connection while handling offer");
                    return;
                }

                console.log("Setting remote description...");
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

                console.log("Creating answer...");
                const answer = await peerConnectionRef.current.createAnswer();

                console.log("Setting local description...");
                await peerConnectionRef.current.setLocalDescription(answer);

                console.log("Sending answer to peer:", peerId);
                socketRef.current?.send(
                    JSON.stringify({
                        type: "answer",
                        target: peerId,
                        answer: answer
                    })
                );

                setStatus("Waiting for Connection");
            } catch (error) {
                console.error("Error handling offer:", error);
                setStatus("Offer Error");
                disconnectPeer();
            }
        },
        [createPeerConnection, socketRef, setStatus, disconnectPeer]
    );

    const handleAnswer = useCallback(
        async ({ answer }) => {
            console.log("Handling incoming answer...");
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(answer);
                setStatus("Connected to Peer");
                setIsConnected(true);
            }
        },
        [setStatus]
    );

    const handleCandidate = async (data) => {
        if (!peerConnectionRef.current) {
            console.error("Peer connection is not initialized.");
            return;
        }

        if (typeof peerConnectionRef.current.addIceCandidate !== "function") {
            console.error("addIceCandidate is not a function. Peer connection may be invalid.");
            console.log("Current peer connection:", peerConnectionRef.current);
            return;
        }

        try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log("ICE candidate added:", data.candidate);
        } catch (error) {
            console.error("Error adding ICE candidate:", error);
        }
    };

    useEffect(() => {
        const handleDisconnect = () => {
            console.log("Handling disconnect due to single peer.");
            disconnectPeer();
        };

        // Example: Disconnect if only one peer is left (replace with your actual logic)
        if (peerConnectionRef.current && !isConnected) {
            handleDisconnect();
        }

        // Cleanup function (optional)
        return () => {
            // Any cleanup logic here
        };
    }, [disconnectPeer, isConnected]);

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
        disconnectPeer,
        isConnected,
        acceptTransferredFile,
    };
};