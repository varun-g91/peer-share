import { useEffect, useState } from 'react';
import { Peer, PeerState, Role, Transfer, TransferStatus, FileMetadata } from '../types';

export const usePeerState = () => {
    const [peerState, setPeerState] = useState<PeerState>({
        localPeer: null,
        remotePeer: null
    });

    useEffect(() => {
        if (peerState.remotePeer) {
            console.log("Remote peer state updated:", {
                id: peerState.remotePeer.id,
                role: peerState.remotePeer.role
            });
        }
    }, [peerState.remotePeer]);

    const initializeLocalPeer = (id: string, role: Role) => {
        setPeerState(prev => ({
            ...prev,
            localPeer: {
                id,
                role,
                isConnected: false,
                transfers: []
            }
        }));
    };

    const initializeRemotePeer = (id: string, role: Role) => {
        setPeerState(prev => ({
            ...prev,
            remotePeer: {
                id,
                role,
                isConnected: false,
                transfers: []
            }
        }));
    };

    const updatePeerConnection = (peerId: string, isConnected: boolean) => {
        setPeerState(prev => {
            const isLocal = prev.localPeer?.id === peerId;
            const peer = isLocal ? 'localPeer' : 'remotePeer';

            if (!prev[peer]) return prev;

            return {
                ...prev,
                [peer]: {
                    ...prev[peer]!,
                    isConnected
                }
            };
        });
    };

    const startFileTransfer = (peerId: string, fileMetadata: FileMetadata) => {
        setPeerState(prev => {
            const isLocal = prev.localPeer?.id === peerId;
            const peer = isLocal ? 'localPeer' : 'remotePeer';

            if (!prev[peer]) return prev;

            return {
                ...prev,
                [peer]: {
                    ...prev[peer]!,
                    currentTransfer: {
                        fileMetadata,
                        progress: 0,
                        status: 'in_progress'
                    }
                }
            };
        });
    };

    const updateTransferProgress = (peerId: string, progress: number) => {
        setPeerState(prev => {
            const isLocal = prev.localPeer?.id === peerId;
            const peer = isLocal ? 'localPeer' : 'remotePeer';
            
            if (!prev[peer]?.currentTransfer) return prev;

            return {
                ...prev,
                [peer]: {
                    ...prev[peer]!,
                    currentTransfer: {
                        ...prev[peer]!.currentTransfer!,
                        progress
                    }
                }
            };
        });
    };

    const updateTransferStatus = (peerId: string, status: TransferStatus) => {
        setPeerState(prev => {
            const isLocal = prev.localPeer?.id === peerId;
            const peer = isLocal ? 'localPeer' : 'remotePeer';
            
            if (!prev[peer]?.currentTransfer) return prev;

            const transfer: Transfer = {
                fileMetadata: prev[peer]!.currentTransfer!.fileMetadata!,
                timestamp: new Date().toLocaleTimeString(),
                status,
                direction: isLocal ? 'sent' : 'received'
            };

            return {
                ...prev,
                [peer]: {
                    ...prev[peer]!,
                    transfers: [...prev[peer]!.transfers, transfer],
                    currentTransfer: status === 'completed' ? undefined : prev[peer]!.currentTransfer
                }
            };
        });
    };

    const resetPeerState = () => {
        setPeerState({
            localPeer: null,
            remotePeer: null
        });
    };

    return {
        peerState,
        initializeLocalPeer,
        initializeRemotePeer,
        updatePeerConnection,
        startFileTransfer,
        updateTransferProgress,
        updateTransferStatus,
        resetPeerState
    };
};