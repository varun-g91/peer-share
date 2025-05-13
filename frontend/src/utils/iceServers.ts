export const iceConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "9e32000a1b04a9c0d7bb4425",
            credential: "VUJvL9eXEdxKPMhu",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "9e32000a1b04a9c0d7bb4425",
            credential: "VUJvL9eXEdxKPMhu",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "9e32000a1b04a9c0d7bb4425",
            credential: "VUJvL9eXEdxKPMhu",
        },
        // {
        //     urls: "turns:global.relay.metered.ca:443?transport=tcp",
        //     username: "9e32000a1b04a9c0d7bb4425",
        //     credential: "VUJvL9eXEdxKPMhu",
        // }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
} as RTCConfiguration;