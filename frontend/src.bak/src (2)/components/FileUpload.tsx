import { DropzoneInputProps, DropzoneRootProps, useDropzone } from 'react-dropzone';
import { FileIcon } from './FileIcon';
import { ProgressBar } from './ProgressBar';
import { X } from 'lucide-react';
import { formatFileSize } from '../utils/formatFileSize';
import { useCallback } from 'react';

interface FileUploadProps {
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    sendFile: () => void;
    removeSelectedFile: () => void;
    fileSending: boolean;
    transferProgress: number;
    getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
    getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isDragActive: boolean;
}

export const FileUpload = ({
    selectedFile,
    setSelectedFile,
    sendFile,
    removeSelectedFile,
    fileSending,
    transferProgress,
}: FileUploadProps) => {
    let disabled = !selectedFile || fileSending;
    // Move onDrop inside useDropzone config
    const onDrop = useCallback((acceptedFiles: File[]) => {
        try {
            const file = acceptedFiles[0];
            if (file && setSelectedFile) {
                setSelectedFile(file);
            }
        } catch (error) {
            console.error('Error handling file drop:', error);
        }
    }, [setSelectedFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled: fileSending,
        multiple: false,
        maxFiles: 1
    });

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <input {...getInputProps()} />
                <p className="text-gray-600">
                    {isDragActive
                        ? "Drop the file here"
                        : "Drag & drop a file here, or click to select"}
                </p>
            </div>

            {selectedFile && (
                <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <FileIcon size={25} className="w-6 h-6 text-gray-500" />
                            <div>
                                <p className="font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        {!fileSending && (
                            <button
                                onClick={removeSelectedFile}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {fileSending && (
                        <div className="mt-4">
                            <ProgressBar 
                                progress={transferProgress} 
                                showLabel={true}
                                label="Sending..."
                            />
                        </div>
                    )}

                    {!fileSending && (
                        <button
                            onClick={sendFile}
                            disabled={false}
                            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg
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