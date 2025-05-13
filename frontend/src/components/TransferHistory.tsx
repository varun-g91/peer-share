import React from "react";
import { FileText, Check, Clock, X, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { Transfer } from "../types";
import { formatFileSize } from "../utils/formatFileSize";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { deleteTransfer } from "../store/transferSlice";
import { formatTimestamp } from "../utils/formatTimestamp";

interface TransferHistoryProps {
    transferHistory: Transfer[];
}

export const TransferHistory = ({ transferHistory }: TransferHistoryProps) => {
    
    const dispatch = useDispatch();

    if (transferHistory.length === 0) return null;

    const getStatusIcon = (status: Transfer['status']) => {
        switch (status) {
            case 'completed':
                return (
                    <div className="flex items-center">
                        <Check size={18} className="text-green-500" />
                    </div>
                );
            case 'rejected':
                return <X size={18} className="text-red-500" />;
            case 'pending':
                return <Loader2 size={18} className="text-blue-500 animate-spin" />;
            default:
                return <Clock size={18} className="text-yellow-500" />;
        }
    };

    const getStatusText = (status: Transfer['status']) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'rejected':
                return 'Rejected';
            case 'pending':
                return 'In Progress';
            default:
                return 'Pending';
        }
    };

    const handleDeleteHistory = (id: string) => {
        dispatch(deleteTransfer(id));
    }

    return (
        <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
                Transfer History
            </h3>
            <div className="border rounded-lg overflow-hidden">
                {transferHistory.map((transfer, index) => (
                    <div
                        key={`${transfer.fileMetadata?.id}-${index}`}
                        className={`flex items-center justify-between p-3 ${
                            index < transferHistory.length - 1 ? "border-b" : ""
                        }`}
                    >
                        <div className="flex items-center space-x-3">
                            <FileText size={20} className="text-gray-500" />
                            <div>
                                <p className="font-medium text-gray-800 truncate max-w-[200px]">
                                    {transfer.fileMetadata?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(transfer.fileMetadata?.size || 0)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getStatusIcon(transfer.status)}
                            <span className="text-xs text-gray-500">
                                {getStatusText(transfer.status)} • {formatTimestamp(new Date(transfer.timestamp))}
                            </span>
                            <button onClick={() => handleDeleteHistory(transfer.fileMetadata?.id || '')}>
                                <X size={18} className="text-red-500" />  
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};