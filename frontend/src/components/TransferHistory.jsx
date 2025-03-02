import React from "react";
import { FileText, Check, Clock } from "lucide-react";

export const TransferHistory = ({ transfers = [] }) => {
    if (transfers.length === 0) return null;

    return (
        <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
                Transfer History
            </h3>
            <div className="border rounded-lg overflow-hidden">
                {transfers.map((transfer, index) => (
                    <div
                        key={index}
                        className={`flex items-center justify-between p-3 ${
                            index < transfers.length - 1 ? "border-b" : ""
                        }`}
                    >
                        <div className="flex items-center space-x-3">
                            <FileText size={20} className="text-gray-500" />
                            <div>
                                <p className="font-medium text-gray-800 truncate max-w-[200px]">
                                    {transfer.fileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {transfer.size}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            {transfer.status === "completed" ? (
                                <Check size={18} className="text-green-500" />
                            ) : (
                                <Clock size={18} className="text-yellow-500" />
                            )}
                            <span className="text-xs ml-1 text-gray-500">
                                {transfer.timestamp}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
