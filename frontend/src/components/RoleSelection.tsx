import React from "react";
import { Download, Upload } from "lucide-react";
import { setRole } from "../store/peerSlice";
import { useDispatch } from "react-redux";

export function RoleSelection() {
    const dispatch = useDispatch();
    return (
        <div className="flex flex-col space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-center">
                Transfer History
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => {
                        console.log("Role selection triggered!");
                        dispatch(setRole("sender"))
                    }}
                    className="flex flex-col items-center p-4 border-2 border-[#8E1616] rounded-lg hover:bg-blue-50 transition-colors"
                >
                    <Upload size={24} className="text-[#8E1616] mb-2" />
                    <span className="font-medium">Send Files</span>
                </button>
                <button
                    onClick={() => dispatch(setRole("receiver"))}
                    className="flex flex-col items-center p-4 border-2 border-[#8E1616] rounded-lg hover:bg-green-50 transition-colors"
                >
                    <Download size={24} className="text-[#8E1616] mb-2" />
                    <span className="font-medium">Receive Files</span>
                </button>
            </div>
        </div>
    );
}