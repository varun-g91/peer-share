import { useEffect, useRef, useState } from "react";

export const useWebSocket = () => {
    const [peerId, setPeerId] = useState("");
    const [wsConnected, setWsConnected] = useState(false);
    const [status, setStatus] = useState("Disconnected");
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connectWebSocket = () => {
        try {
            const socket = new WebSocket("ws://localhost:8080");
            socketRef.current = socket;

            socket.onopen = () => {
                setWsConnected(true);
                setStatus("WebSocket Connected");
                const newPeerId = Math.random().toString(36).substring(7);
                setPeerId(newPeerId);
                socket.send(
                    JSON.stringify({ type: "register", peerId: newPeerId })
                );
            };

            socket.onclose = () => {
                setWsConnected(false);
                setStatus("WebSocket Disconnected");
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (
                        !socketRef.current ||
                        socketRef.current.readyState === WebSocket.CLOSED
                    ) {
                        connectWebSocket();
                    }
                }, 2000);
            };
            
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("WebSocket message received:", data);
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };
            
            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                setStatus("WebSocket Error");
            };
        } catch (error) {
            console.error("Error creating WebSocket:", error);
            setStatus("WebSocket Creation Error");
        }
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    return {
        peerId,
        wsConnected,
        status,
        setStatus,
        socketRef,
    };
};
