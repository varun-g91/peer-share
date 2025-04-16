import { X, RotateCcw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { WebSocketStatus } from "../hooks/useWebSocket";

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectWebSocket: () => Promise<void>;
    wsStatus: WebSocketStatus;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
    isOpen,
    onClose,
    connectWebSocket,
    wsStatus,
}) => {
    const [message, setMessage] = useState<string>("");

    const handleReconnect = async () => {
        try {
            console.log("Reconnecting");
            await connectWebSocket();
            setMessage(""); // Clear error message on successful connection
        } catch (error) {
            if (wsStatus === 'Disconnected') {
                setMessage("Signaling server connection not established");
            } else if (wsStatus === 'Error') {
                setMessage("Could not connect to signaling server");
            } else {
                setMessage(`Connection error: ${error}`);
            }
        }
    }

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("overflow-hidden");
        } else {
            document.body.classList.remove("overflow-hidden");
        }

        return () => {
            document.body.classList.remove("overflow-hidden");
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
                {/* Header with Close button */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-red-600">
                        {"WebSocket Error"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error message and retry */}
                <div className="flex items-center justify-between bg-red-50 border border-red-200 p-4 rounded-lg">
                    <span className="text-sm text-red-600">
                        Connection lost. Please retry.
                    </span>
                    <button
                        onClick={handleReconnect}
                        className="flex items-center cursor-pointer gap-1 text-sm text-red-600 hover:text-red-800 transition"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;
