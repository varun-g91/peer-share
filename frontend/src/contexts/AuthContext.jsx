import React, { createContext, useContext, useState, useEffect } from "react";
import { setCookie, getCookie, removeCookie } from "../utils/cookie";
import { initialAuthState } from "./authUtils";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(initialAuthState);

    useEffect(() => {
        const username = getCookie("username");
        if (username) {
            setAuthState((prev) => ({
                ...prev,
                user: { username },
                loading: false,
            }));
        } else {
            setAuthState((prev) => ({ ...prev, loading: false }));
        }
    }, []);

    const login = (username) => {
        setCookie("username", username, 24);
        setAuthState((prev) => ({ ...prev, user: { username } }));
    };

    const logout = () => {
        removeCookie("username");
        setAuthState((prev) => ({ ...prev, user: null, role: null }));
    };

    const setRole = (role) => {
        setAuthState((prev) => ({ ...prev, role }));
    };

    if (authState.loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading...
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ ...authState, login, logout, setRole }}>
            {children}
        </AuthContext.Provider>
    );
};
