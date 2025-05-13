import {
    DropzoneInputProps,
    DropzoneRootProps,
    useDropzone,
} from "react-dropzone";
import { FileIcon } from "./FileIcon";
import { ProgressBar } from "./ProgressBar";
import { X } from "lucide-react";
import { formatFileSize } from "../utils/formatFileSize";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { CurrentTransfer } from "../store/transferSlice";

interface FileUploadProps {
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    sendFile: () => void;
    removeSelectedFile: () => void;
    fileSending: boolean;
    currentTransfer: CurrentTransfer | null;
}

export const FileUpload = ({
    selectedFile,
    setSelectedFile,
    sendFile,
    removeSelectedFile,
    fileSending,
    currentTransfer,
}: FileUploadProps) => {
    let disabled = !selectedFile || fileSending;

    const dispatch = useDispatch();

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            try {
                const file = acceptedFiles[0];
                if (file && setSelectedFile) {
                    setSelectedFile(file);
                }
            } catch (error) {
                console.error("Ere95wjiror handling file drop:", error);
            }
        },
        [setSelectedFile]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled: fileSending,
        multiple: false,
        maxFiles: 1,
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let file: File | null = null;
        if (event.target.files) {
            file = event.target.files[0];
        }
        console.log("File selected:", file);
        setSelectedFile(file);
    };

    const handleRemoveFile = () => {
        if (selectedFile) {
            // dispatch()
            console.log("Removing file:", selectedFile);
            console.log("fileSending: ", fileSending);
            console.log("currentTransfer: ", currentTransfer);
            removeSelectedFile();
        }
    }

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-colors duration-200
                    ${
                        isDragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-white"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
            >
                <input {...getInputProps()} onChange={handleFileChange} />
                <p className="text-gray-600">
                    {isDragActive
                        ? "Drop the file here"
                        : "Drag & drop a file here, or click to select"}
                </p>
            </div>

            {selectedFile && (
                <div className="p-4 border rounded-lg border-[#161179] space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <FileIcon
                                size={25}
                                className="w-6 h-6 text-gray-500"
                            />
                            <div>
                                <p className="font-medium">
                                    {selectedFile.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        {!fileSending && (
                            <button
                                onClick={handleRemoveFile}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    {currentTransfer?.progress && (
                        <ProgressBar
                            progress={currentTransfer.progress}
                        />
                    )}
                    {!fileSending && !currentTransfer && (
                        <button
                            onClick={sendFile}
                            disabled={false}
                            className="w-full py-2 px-4 bg-[#161179] text-white rounded-lg
                                hover:bg-blue-600 transition-colors disabled:bg-gray-400
                                disabled:cursor-not-allowed"
                        >
                            Send File
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
