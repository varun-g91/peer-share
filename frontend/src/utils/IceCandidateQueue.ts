export interface IIceCandidateQueue {
    iceCandidates: RTCIceCandidate[];
    enqueue: (candidate: RTCIceCandidate) => void;
    dequeue: (candidate: RTCIceCandidate) => void;
    clear: () => void;
    getAllCandidates: () => RTCIceCandidate[];
}

export class IceCandidateQueue implements IIceCandidateQueue {
    iceCandidates: RTCIceCandidate[] = [];

    enqueue(candidate: RTCIceCandidate) {
        this.iceCandidates.push(candidate);
    }

    dequeue(candidate: RTCIceCandidate)  {
        const index = this.iceCandidates.indexOf(candidate);
        if (index > -1) {
            this.iceCandidates.splice(index, 1)
        }
    }

    clear() {
        this.iceCandidates = [];
    }

    getAllCandidates(): RTCIceCandidate[] {
        const candidates = [...this.iceCandidates];
        this.clear();
        return candidates;
    }
}