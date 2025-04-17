import { CheckCircle, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { IncomingFile, Transfer } from "../types";
import { WebSocketStatus } from "../hooks/useWebSocket";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";

import {
    setWebSocketStatus,
    setIsInitiator,
    setTargetPeerId,
    resetPeerConnection,
} from "../store/peerSlice";

type Role = "sender" | "receiver" | null;

interface ConnectionInterfaceProps {
    createPeerConnection: () => Promise<RTCPeerConnection | null>;
    copyPeerId: () => void;
    copied: boolean;
    isConnected: boolean;
    role: Role;
    pcStatus: string;
    peerId: string;
    targetPeerId: string;
    wsConnected: boolean;
    wsStatus: WebSocketStatus;
}

export function ConnectionInterface({
    createPeerConnection,
    copyPeerId,
    copied,
    isConnected,
    role,
    pcStatus,
    peerId,
    targetPeerId,
    wsConnected,
    wsStatus,
}: ConnectionInterfaceProps) {
    const dispatch = useDispatch();
    

    const handleConnect = async () => {
        if (!wsConnected) {
            console.error("WebSocket connection not established");
            dispatch(setWebSocketStatus("Error"));
            return;
        }
        dispatch(setIsInitiator(true));
        await createPeerConnection();
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
                            onChange={(e) =>
                                dispatch(setTargetPeerId(e.target.value))
                            }
                            className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={`Enter ${
                                role === "sender" ? "receiver" : "sender"
                            } ID`}
                        />
                        <button
                            onClick={handleConnect}
                            disabled={
                                !wsConnected ||
                                !targetPeerId ||
                                pcStatus === "Connected"
                            }
                            onKeyDown={async (e) => {
                                if (
                                    (e.key === "Enter" && wsConnected) ||
                                    targetPeerId
                                ) {
                                    await createPeerConnection();
                                }
                            }}
                            className="bg-[#8E1616] text-white px-4 py-2 rounded-md hover:bg-black disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            Connect
                        </button>
                    </div>
                </div>
            )}

            {/* Status and Peer ID */}
            <div className="bg-[#F8EEDF] p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                        Peer Connection Status:
                    </span>

                    <span
                        className={`text-sm font-medium ${
                            pcStatus === "Connected"
                                ? "text-[#000000]"
                                : "text-[#8E1616]"
                        } ${
                            pcStatus === "Connecting" ? "text-yellow-500" : ""
                        }`}
                    >
                        {pcStatus}
                    </span>
                </div>{" "}
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
                    onClick={() => dispatch(resetPeerConnection())}
                    className="flex items-center justify-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                    <RefreshCw size={14} />
                    <span>Reset Connection</span>
                </button>
            </div>
        </div>
    );
}
