import { Download, Upload } from "lucide-react";

export function RoleSelection({ setRole }) {
    return (
        <div className="flex flex-col space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-center">
                Transfer History    
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setRole("sender")}
                    className="flex flex-col items-center p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                >
                    <Upload size={24} className="text-blue-500 mb-2" />
                    <span className="font-medium">Send Files</span>
                </button>
                <button
                    onClick={() => setRole("receiver")}
                    className="flex flex-col items-center p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
                >
                    <Download size={24} className="text-green-500 mb-2" />
                    <span className="font-medium">Receive Files</span>
                </button>
            </div>
        </div>
    );
}
