import { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const app = express();
const PORT = process.env.PORT

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Verify Twilio credentials are loaded
if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error('Missing Twilio credentials in environment variables');
    process.exit(1);
}

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const peers = {};

// Fixed API endpoint
app.get('/api/turn-credentials', async (req, res) => {
    console.log('Requesting Twilio TURN credentials...');

    try {
        const token = await client.tokens.create();
        console.log('Twilio token created:', token.iceServers ? 'Success' : 'No ICE servers');

        if (!token.iceServers) {
            throw new Error('No ICE servers received from Twilio');
        }

        res.json({ iceServers: token.iceServers });

    } catch (err) {
        console.error('Error getting Twilio credentials:', err);
        res.status(500).json({
            error: 'Failed to get TURN credentials',
            details: err.message
        });
    }
});

// Add a test endpoint to verify the server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

wss.on("connection", (ws) => {
    console.log("New websocket connection established");

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
    console.log(`TURN credentials endpoint: http://localhost:${PORT}/api/turn-credentials`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});