export type TransferStatus = 'pending' | 'completed' | 'rejected' | 'in_progress';
export type Role = 'sender' | 'receiver' | null;

export interface Peer {
    id: string;
    role: Role;
    isConnected: boolean;
    transfers: Transfer[];
    currentTransfer?: {
        progress: number;
        fileMetadata?: FileMetadata;
        status: TransferStatus;
    };
}

export interface PeerState {
    localPeer: Peer | null;
    remotePeer: Peer | null;
}

export interface FileMetadata {
    name: string;
    id: string;
    type: string;
    size: number;
}


export interface SignalState {
    peerId: string;
    sdp?: RTCSessionDescriptionInit;
    iceCandidates: RTCIceCandidate[];
    iceGatheringComplete: boolean;
}

export interface OfferData {
    peerId: string;
    offer: RTCSessionDescriptionInit;
}

export interface AnswerData {
    answer: RTCSessionDescriptionInit;
}

export interface CandiateData {
    
}

export interface IncomingFile {
    file: File | null;
    metadata: FileMetadata;
}


export interface Transfer {
    fileMetadata?: FileMetadata;
    timestamp: string;
    status: TransferStatus;
    direction: 'sent' | 'received';
}






