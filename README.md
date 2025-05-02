# 🔁 Browser-Based P2P File Sharing App (WebRTC)

A fully decentralized file sharing system built using **WebRTC** and **React.js** – transfers files directly between browsers with zero server involvement post-handshake.

## ✨ Features

- 📦 Direct peer-to-peer file transfer (no intermediate server)
- 📡 WebRTC DataChannel for fast binary data exchange
- 🧠 Minimal signaling server (Node.js + WebSocket) for initial peer connection
- 📊 Transfer progress indicators
- 🧪 Currently tested on local networks
- 🌐 STUN/TURN ready for NAT traversal

## 📌 Tech Stack

- **Frontend:** React.js (with TypeScript), WebRTC API
- **Backend (Signaling Server):** Node.js, WebSocket API

## 🔧 How It Works

1. User A on selecting role (sender/receiver) gets a unique peer ID that can be shared to anyone
2. User B uses the peer ID to connect to User A (signalling server handles peer discovery)
3. File is transferred directly via WebRTC’s DataChannel
4. No file data passes through any server

## 🚧 Roadmap

- [ ] Cross-network testing with TURN fallback
- [ ] End-to-end encryption
- [ ] Chunked transfers + resume support
- [ ] UI/UX refinements, cross browser compatability and mobile optimizations

## 🤝 Contributing

Contributions, feedback, and testing help are welcome!  
Feel free to fork the repo and open a PR.

## 📜 License

MIT License

---

**Built with privacy in mind and no cloud dependency.**

