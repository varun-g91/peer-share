import React from "react";

const Header = ({ peerId, copyPeerId, copied }) => {
    return (
        <>
            <header className="bg-[#6366F1] p-4 rounded-lg">
                <div className="flex justify-between items-center">
                    <h1 className="text-white font-bold text-2xl">
                        peer-share
                    </h1>
                </div>
            </header>

            {/* <nav className="mt-4 ml-5 flex space-x-4">
                <button className="bg-[#6366F1] text-white px-4 py-2 rounded-full">
                    Send
                </button>
                <button className="bg-white text-[#6366F1] border border-[#6366F1] px-4 py-2 rounded-full">
                    Receive
                </button>
            </nav> */}
        </>
    );
};

export default Header;
