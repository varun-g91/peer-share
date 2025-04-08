import { CheckCircle, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { IncomingFile, Transfer } from "../types";
import { WebSocketStatus } from "../hooks/useWebSocket";

type Role = 'sender' | 'receiver' | null;

interface ConnectionInterfaceProps {
    role: Role;
    targetPeerId: string;
    setTargetPeerId: (peerId: string) => void;
    isConnected: boolean;
    pcStatus: string;
    wsConnected: boolean;
    peerId: string;
    createPeerConnection: () => Promise<RTCPeerConnection | null>;
    setupDataChannel: (dataChannel: RTCDataChannel) => void;
    setPcStatus: (status: string) => void;
    disconnectPeer: () => void;
    setRole: (role: Role) => void;
    setIncomingFile: (file: IncomingFile | null) => void;
    setReceiveProgress: (progress: number) => void;
    peerConnectionRef: React.RefObject<RTCPeerConnection | null>;
    dataChannelRef: React.RefObject<RTCDataChannel | null>;
    onSendOffer: (offer: any) => void;
    setWsStatus: (status: WebSocketStatus) => void;
    copyPeerId: () => void;
    copied: boolean;
    setCopied: (copied: boolean) => void;
    setSelectedFile: (file: File | null) => void;
}

export function ConnectionInterface({
    role,
    targetPeerId,
    setTargetPeerId,
    pcStatus,
    wsConnected,
    isConnected,
    peerId,
    createPeerConnection,
    setupDataChannel,
    setPcStatus,
    disconnectPeer,
    setRole,
    setIncomingFile,
    setReceiveProgress,
    peerConnectionRef,
    dataChannelRef,
    onSendOffer,
    setWsStatus,
    copyPeerId,
    copied,
    setCopied,
    setSelectedFile,
}: ConnectionInterfaceProps) {
    /** Copy Peer ID to Clipboard */


    /** Handle Peer Connection */
    const connectPeer = async () => {
        if (!targetPeerId) {
            console.error("Target peer ID missing!");
            return;
        }

        if (!wsConnected) {
            console.error("WebSocket connection not established.");
            setWsStatus?.("Error");
            return;
        }


    

        console.log("Creating peer connection...");
        peerConnectionRef.current = await createPeerConnection();

        if (!peerConnectionRef.current) {
            console.error("Peer connection failed to initialize.");
            setPcStatus("Connection Error");
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
            onSendOffer({
                type: "offer",
                target: targetPeerId,
                offer: offer,
                peerId: peerId
            });

            setPcStatus("Waiting for Answer");
        } catch (error) {
            console.error("Error creating/sending offer:", error);
            setPcStatus("Offer Error");
            disconnectPeer();
        }
    };

    /** Reset Connection */
    const resetConnection = () => {
        setRole(null);
        setTargetPeerId("");
        setSelectedFile(null);
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

    return (
        <div className="space-y-4">
            {/* Target ID Input */}
            {!isConnected && (
                <div className="flex flex-col space-y-2">
                    <label className="text-md font-medium text-gray-700">
                        {role === "sender" ? "Receiver ID" : "Sender ID"}
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={targetPeerId}
                            onChange={(e) => setTargetPeerId(e.target.value)}
                            className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={`Enter ${role === "sender" ? "receiver" : "sender"
                                } ID`}

                        />
                        <button
                            onClick={connectPeer}
                            disabled={
                                !wsConnected ||
                                !targetPeerId ||
                                status === "Connected to Peer"
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && wsConnected ||
                                    targetPeerId
                                ) {
                                    connectPeer();
                                }
                            }}
                            className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            Connect
                        </button>
                    </div>
                </div>
            )}

            {/* Status and Peer ID */}
            <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                        Peer Connection Status:
                    </span>

                    <span
                        className={`text-sm font-medium ${pcStatus === "Connected to Peer"
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                    >
                        {pcStatus}
                    </span>
                </div>
                {/* <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                        WebSocket Status:
                    </span>
                    
                    <span
                        className={`text-sm font-medium ${
                            wsStatus === "Connected"
                                ? "text-green-500"
                                : "text-red-500"
                        }`}
                    >
                        {wsStatus}
                    </span>
                </div> */}

                {peerId && !isConnected && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                            Your Peer ID:
                        </span>
                        <div className="flex items-center space-x-1">
                            <span className="text-gray-800 font-mono text-sm">
                                {peerId}
                            </span>
                            <button
                                onClick={copyPeerId}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                {copied ? (
                                    <CheckCircle
                                        size={16}
                                        className="text-green-500"
                                    />
                                ) : (
                                    <Copy size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reset Button */}
            <div className="flex justify-center pt-2">
                <button
                    onClick={resetConnection}
                    className="flex items-center justify-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                    <RefreshCw size={14} />
                    <span>Reset Connection</span>
                </button>
            </div>
        </div>
    );
}
