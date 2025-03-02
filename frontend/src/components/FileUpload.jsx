import { Upload, X } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { formatFileSize } from "../utils/formatFileSize";

export const FileUpload = ({
    getRootProps,
    getInputProps,
    isDragActive,
    handleFileChange,
    selectedFile,
    sendFile,
    transferProgress,
    fileSending,
    removeSelectedFile,
}) => {
    const handleSendFile = async () => {
        if (selectedFile) {
            console.log("FileUpload props:", {
                fileSending,
                transferProgress,
                selectedFile,
            });
            await sendFile();
            removeSelectedFile();
        }
    };

    

    return (
        <div className="mt-4">
            {!selectedFile && (
                <div
                    {...getRootProps()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                >
                    <input
                        {...getInputProps()}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {isDragActive ? (
                        <p className="text-indigo-500">Drop the file here...</p>
                    ) : (
                        <>
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
                                    <Upload
                                        size={24}
                                        className="text-indigo-500"
                                    />
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                                Drop files here or{" "}
                                <span className="text-indigo-500 font-medium">
                                    browse
                                </span>
                            </p>
                        </>
                    )}
                </div>
            )}

            {selectedFile && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <FileIcon
                                    size={16}
                                    className="text-indigo-500"
                                />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-medium text-gray-800 truncate max-w-[180px]">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={removeSelectedFile}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {fileSending ? (
                        <div className="space-y-1">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                    style={{ width: `${transferProgress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>{transferProgress}% complete</span>
                                <span>
                                    {formatFileSize(selectedFile.size)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleSendFile}
                            className="w-full bg-indigo-500 text-white px-3 py-2 rounded-md hover:bg-indigo-600 transition-colors text-sm font-medium"
                        >
                            Send File
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
