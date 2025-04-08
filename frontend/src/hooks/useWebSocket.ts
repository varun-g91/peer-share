import { useEffect, useRef, useState } from "react";

export type WebSocketStatus = 'Connected' | 'Disconnected' | 'Error';

export const useWebSocket = () => {
    const [peerId, setPeerId] = useState<string>("");
    const [wsConnected, setWsConnected] = useState<boolean>(false);
    const [wsStatus, setWsStatus] = useState<WebSocketStatus>("Disconnected");
    const socketRef = useRef<WebSocket | null>(null);
    

    const WS_PORT = import.meta.env.VITE_WS_PORT || '8080';

    const connectWebSocket = (): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            try {
                const socket = new WebSocket(`ws://${window.location.hostname}:${WS_PORT}`);
    
                if (!socket) {
                    reject(new Error("Unable to establish connection to websocket at the moment "));
                    return;
                }
    
                socketRef.current = socket;
    
                socket.onopen = () => {
                    setWsConnected(true);
                    setWsStatus("Connected");
                    const newPeerId = Math.random().toString(36).substring(7);
                    setPeerId(newPeerId);
                    socket.send(
                        JSON.stringify({ type: "register", peerId: newPeerId })
                    );
                    resolve(); // Resolve the promise when connection is established
                };
    
                socket.onclose = () => {
                    setWsConnected(false);
                    setWsStatus("Disconnected");
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
                    setWsStatus("Error");
                    reject(new Error("WebSocket connection failed"));
                };
    
            } catch (error) {
                console.error("Error creating WebSocket:", error);
                setWsStatus("Error");
                reject(new Error("Failed to create WebSocket connection"));
            }
        });
    };

    useEffect(() => {
        connectWebSocket().catch(error => {
            console.error("Failed to connect to signaling server");
        });
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    return {
        peerId,
        wsConnected,
        wsStatus,
        setWsStatus,
        socketRef,
        connectWebSocket,
    };
};
