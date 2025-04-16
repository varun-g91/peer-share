export type TransferStatus = 'pending' | 'completed' | 'rejected' | 'failed';
export type Role = 'sender' | 'receiver' | null;
export type PeerConnectionStatus = 'Connected' | 'Connecting' | 'Disconnected' | 'Error';

export interface Peer {
    id: string;
    role: Role;
    isConnected: boolean;
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

export interface IncomingFile {
    metadata: FileMetadata | null;
}

export interface Transfer {
    fileMetadata?: FileMetadata;
    timestamp: string;
    status: TransferStatus;
}