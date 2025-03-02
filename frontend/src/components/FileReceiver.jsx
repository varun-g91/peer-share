import { usePeerConnection } from "../hooks/usePeerConnection";
import { FileIcon } from "./FileIcon";

export const FileReceiver = ({
    incomingFile,
    transferProgress,
    acceptFile,
    rejectFile,
    acceptTransferredFile,
}) => {
    const handleAccept = () => {
        const downloaded = acceptTransferredFile();
        if (downloaded) {
            acceptFile();
        }
    };

    if (!incomingFile) return null;

    return (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FileIcon size={16} className="text-blue-500" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-800 truncate max-w-[180px]">
                            {incomingFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                            {incomingFile.size}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${transferProgress}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{transferProgress}% complete</span>
                    <span>Receiving...</span>
                </div>

                <div className="flex space-x-2 mt-2">
                    <button
                        onClick={handleAccept}
                        className="flex-1 bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                        Accept
                    </button>
                    <button
                        onClick={rejectFile}
                        className="flex-1 bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
};
