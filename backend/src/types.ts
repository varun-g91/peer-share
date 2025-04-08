import { WebSocket } from "ws";

export interface PeerWebSocket extends WebSocket {
    peerId?: string; 
}

export interface SignalData {
    peerId: string;
    type: 'register' | 'offer' | 'answer' | 'candidate';
}
