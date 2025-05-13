import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    FileMetadata,
    IncomingFile,
    Peer,
    PeerConnectionStatus,
    PeerState,
    Role,
    Transfer,
    TransferStatus,
} from "../types";
import { WebSocketStatus } from "../hooks/useWebSocket";

interface ExtendedPeerState {
    remotePeer: Peer | null;
    localPeer: Peer | null;
    targetPeerId: string;
    peerId: string;
    wsConnected: boolean;
    wsStatus: WebSocketStatus;
    pcStatus: PeerConnectionStatus;
    isConnected: boolean;
    copied: boolean;
    incomingFile: IncomingFile | null;
    receiveProgress: number | null;
    role: Role;
    // dataChannel: RTCDataChannel | null;
    iceCandidates: RTCIceCandidate[];
    isInitiator: boolean;
    isReceivingFile: boolean;
}

const initialState: ExtendedPeerState = {
    remotePeer: null,
    localPeer: null,
    targetPeerId: "",
    peerId: "",
    wsConnected: false,
    wsStatus: "Disconnected",
    pcStatus: "Disconnected",
    isConnected: false,
    copied: false,
    incomingFile: null,
    receiveProgress: 0,
    role: null,
    iceCandidates: [],
    isInitiator: false,
    isReceivingFile: false,
};

const peerSlice = createSlice({
    name: "peer",
    initialState,
    reducers: {
        setLocalPeer(state, action: PayloadAction<Peer | null>) {
            state.localPeer = action.payload;
        },

        setRemotePeer(state, action: PayloadAction<Peer | null>) {
            state.remotePeer = action.payload;
        },

        setPeerId(state, action: PayloadAction<string>) {
            state.peerId = action.payload;
        },

        setRole(state, action: PayloadAction<Role>) {
            console.log("setting peer role: ", action.payload)
            state.role = action.payload;
        },

        setIsConnected: (state, action: PayloadAction<boolean>) => {
            console.log("Setting isConnected:", action.payload);
            state.isConnected = action.payload;
        },

        setTargetPeerId(state, action: PayloadAction<string>) {
            state.targetPeerId = action.payload;
        },

        setReceiveProgress(state, action: PayloadAction<number | null>) {
            state.receiveProgress = action.payload;
        },
            
        setIncomingFile(state, action: PayloadAction<IncomingFile | null>) {
            state.incomingFile = action.payload;
        },

        setIsReceivingFile(state, action: PayloadAction<boolean>) {
            state.isReceivingFile = action.payload;
        },

        setIsInitiator(state, action: PayloadAction<boolean>) {
                state.isInitiator = action.payload;
        },

        setPeerConnectionStatus: (state, action: PayloadAction<PeerConnectionStatus>) => {
            console.log("Setting peer connection status:", action.payload);
            state.pcStatus = action.payload;
        },

        resetPeerConnection(state) {
            state.localPeer = null;
            state.remotePeer = null;
            state.role = null;
            state.targetPeerId = "";
            state.peerId = "";
            state.wsConnected = false;
            state.pcStatus = "Disconnected";
            state.isConnected = false;
            state.incomingFile = null;
            state.receiveProgress = 0;
            state.iceCandidates = [];
        },
        
        setWebSocketConnected(state, action: PayloadAction<boolean>) {
            state.wsConnected = action.payload;
        },

        setWebSocketStatus(state, action: PayloadAction<WebSocketStatus>) {
            state.wsStatus = action.payload;
        }
    },
});

export const {
    setLocalPeer,
    setRemotePeer,
    setRole,
    setPeerId,
    setTargetPeerId,
    setReceiveProgress,
    setIncomingFile,
    setWebSocketStatus,
    setIsConnected,
    setWebSocketConnected,
    setIsInitiator,
    setPeerConnectionStatus,
    resetPeerConnection,
    setIsReceivingFile,
} = peerSlice.actions;

export default peerSlice.reducer;
