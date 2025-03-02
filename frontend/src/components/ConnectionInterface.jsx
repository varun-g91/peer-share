import { CheckCircle, Copy, RefreshCw } from "lucide-react";

export function ConnectionInterface({
    role,
    targetPeerId,
    setTargetPeerId,
    status,
    peerId,
    copyPeerId,
    copied,
    connectPeer,
    wsConnected,
    resetConnection,
    isConnected,
}) {
    return (
        <div className="space-y-4">
            {/* Target ID Input */}
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
                        placeholder={`Enter ${
                            role === "sender" ? "receiver" : "sender"
                        } ID`}
                    />
                    <button
                        onClick={connectPeer}
                        disabled={
                            !wsConnected ||
                            !targetPeerId ||
                            status === "Connected to Peer"
                        }
                        className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                        Connect
                    </button>
                </div>
            </div>

            {/* Status and Peer ID */}
            <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                        Status:
                    </span>
                    <span
                        className={`text-sm font-medium ${
                            status === "WebSocket Connected" ||
                            status === "Connected to Peer"
                                ? "text-green-500"
                                : "text-red-500"
                        }`}
                    >
                        {status}
                    </span>
                </div>

                {peerId && (
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
