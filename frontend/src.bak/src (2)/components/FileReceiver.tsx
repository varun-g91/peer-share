import { usePeerConnection } from "../hooks/usePeerConnection";
import { IncomingFile, TransferStatus } from "../types";
import { formatFileSize } from "../utils/formatFileSize";
import { FileIcon } from "./FileIcon";
import { ProgressBar } from "./ProgressBar";

interface FileReceiverProps {
    incomingFile: IncomingFile | null;
    transferProgress: number;
    acceptFile: () => void;
    rejectFile: () => void;
    acceptTransferredFile: () => void;
    transferStatus: TransferStatus | null;
}

export const FileReceiver = ({
    incomingFile,
    transferProgress,
    acceptFile,
    rejectFile,
    acceptTransferredFile,
    transferStatus
}: FileReceiverProps) => {
    if (!incomingFile) return null;

    const handleAccept = () => {
        if (transferProgress === 100) {
            acceptTransferredFile();
            acceptFile();
        }
    };

    const handleReject = () => {
        rejectFile();
    };

    return (
        <div className="p-4 border rounded-lg shadow-sm space-y-4">
            {/* File info */}
            <div className="flex items-center space-x-3">
                <FileIcon size={24}  />
                <div>
                    <h3 className="font-medium">{incomingFile.metadata.name}</h3>
                    <p className="text-sm text-gray-500">
                        {formatFileSize(incomingFile.metadata.size)}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            {transferStatus === 'in_progress' && (
                <ProgressBar 
                    progress={transferProgress}
                    showLabel={true}
                    label="Receiving..."
                />
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2">
                {transferProgress === 100 && (
                    <button
                        onClick={handleAccept}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                        Save File
                    </button>
                )}
                <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                    Reject
                </button>
            </div>
        </div>
    );
};