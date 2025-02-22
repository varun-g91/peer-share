import { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import cors from "cors";

const PORT = 8080;

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });


const peers = {};


wss.on("connection", (ws) => {
    console.log("New websocket connection established");
    ws.on("message", (message) => {
        const data = JSON.parse(message);
        console.log("Received message:", data);

        switch (data.type) {
            case "register":
                peers[data.peerId] = ws;
                ws.peerId = data.peerId;
                break;

            case "offer":
            case "answer":
            case "candidate":
                if(peers[data.target]) {
                    peers[data.target].send(JSON.stringify(data));
                    console.log('message sent');
                }
            break;
        }
    });

    ws.on("close", () =>  {
        delete peers[ws.peerId];
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Signaling server running on port: " + PORT);
})

