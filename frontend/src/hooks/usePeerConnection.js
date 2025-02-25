import { useRef, useState, useCallback, useEffect } from 'react';

export const usePeerConnection = (socketRef, setStatus) => {
    const [targetPeerId, setTargetPeerId] = useState("");
    const peerConnectionRef = useRef(null);
    const dataChannelRef = useRef(null);

    const iceServers = {
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
    }

    const createPeerConnection = useCallback(async () => {
    try {
        if (!peerConnectionRef.current) {
            peerConnectionRef.current = new RTCPeerConnection(iceServers);
        }

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate:", event.candidate);
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
            console.log("Received Data Channel:", event.channel);
            dataChannelRef.current = event.channel;
            setStatus("Connected to Peer");
        };

        return peerConnectionRef.current;
    } catch (error) {
        console.error("Error creating peer connection:", error);
        setStatus("Connection Error");
        return null;
    }
}, [socketRef, targetPeerId, setStatus]);

/** Handle Incoming Offer */
const handleOffer = useCallback(
    async ({ peerId, offer }) => {
        console.log("Handling incoming offer from:", peerId);
        setTargetPeerId(peerId);
        setStatus("Receiving Offer");

        peerConnectionRef.current = await createPeerConnection();
        if (!peerConnectionRef.current) return;

        await peerConnectionRef.current.setRemoteDescription(offer);

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        socketRef.current?.send(
            JSON.stringify({
                type: "answer",
                target: peerId,
                answer,
            })
        );

        console.log("Sent answer to peer.");
    },
    [createPeerConnection, socketRef, setStatus]
);

/** Handle Incoming Answer */
const handleAnswer = useCallback(
    async ({ answer }) => {
        console.log("Handling incoming answer...");
        if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(answer);
            setStatus("Connected to Peer");
        }
    },
    [setStatus]
);

/** Handle Incoming ICE Candidate */
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


return {
    targetPeerId,
    setTargetPeerId,
    peerConnectionRef,
    dataChannelRef,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleCandidate,
};
};