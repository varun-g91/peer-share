import http from "http";
import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss  = new WebSocketServer({ server });
const peers = {};


app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});


wss.on("connection", (ws) => {
    console.log("New websocket connection established");

    console.log("Timestamp: ", new Date().toUTCString())
    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            console.log("Received message:", data);

            switch (data.type) {
                case "register":
                    peers[data.peerId] = ws;
                    ws.peerId = data.peerId;
                    console.log(`Peer registered: ${data.peerId}`);
                    break;

                case "offer":
                case "answer":
                case "candidate":
                    console.log("candidate: ", data.candidate)
                    if (peers[data.target]) {
                        peers[data.target].send(JSON.stringify(data));
                        console.log(`Message sent to peer: ${data.target}`);
                    } else {
                        console.log(`Target peer not found: ${data.target}`);
                    }
                    break;

                default:
                    console.log(`Unknown message type: ${data.type}`);
            }
        } catch (err) {
            console.error('Error processing WebSocket message:', err);
        }
    });

    ws.on("close", () => {
        if (ws.peerId) {
            console.log(`Peer disconnected: ${ws.peerId}`);
            delete peers[ws.peerId];
        }
    });

    ws.on("error", (err) => {
        console.error('WebSocket error:', err);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Signaling server running on port: ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});