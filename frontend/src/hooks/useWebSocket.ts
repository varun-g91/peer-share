import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { setWebSocketConnected, setPeerId, setWebSocketStatus, } from "../store/peerSlice";

export type WebSocketStatus = 'Connected' | 'Disconnected' | 'Error';

export const useWebSocket = () => {
    const socketRef = useRef<WebSocket | null>(null);
    
    const dispatch = useDispatch();

    const {
        wsConnected,
        wsStatus,
    } = useSelector((state: RootState) => state.peer);

    const WS_URL = import.meta.env.SIGNALING_SERVER_URL;

    const WS_PORT = import.meta.env.VITE_WS_PORT;

    const connectWebSocket = (): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            try {
                const socket = new WebSocket(`${WS_URL}:${WS_PORT}`);
    
                if (!socket) {
                    reject(new Error("Unable to establish connection to websocket at the moment "));
                    return;
                }
    
                socketRef.current = socket;
    
                socket.onopen = () => {
                    dispatch(setWebSocketConnected(true));
                    dispatch(setWebSocketStatus("Connected"));
                    const newPeerId = Math.random().toString(36).substring(7);
                    dispatch(setPeerId(newPeerId));
                    console.log("Sending register signal to signaling server")
                    socket.send(
                        JSON.stringify({ type: "register", peerId: newPeerId })
                    );
                    resolve(); // Resolve the promise when connection is established
                };
    
                socket.onclose = () => {
                    dispatch(setWebSocketConnected(false));
                    dispatch(setWebSocketStatus("Disconnected"));
                };
                
                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (!data) {
                            throw new Error("Error parsing data")
                        }
                        console.log("WebSocket message received:", data);
                    } catch (error) {
                        console.error("Error parsing WebSocket message:", error);
                    }
                };
                
                socket.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    dispatch(setWebSocketStatus("Error"));
                    reject(new Error("WebSocket connection failed"));
                };
    
            } catch (error) {
                console.error("Error creating WebSocket:", error);
                dispatch(setWebSocketStatus("Error"));
                reject(new Error("Failed to create WebSocket connection"));
            }
        });
    };

    

    return {
        wsStatus,
        wsConnected,
        socketRef,
        connectWebSocket,
    };
};
