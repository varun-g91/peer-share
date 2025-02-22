import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export const SignupForm = () => {
    const [formState, setFormState] = useState({
        username: "",
        password: "",
        error: "",
        isLoading: false,
    });
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { username, password } = formState;

        setFormState((prev) => ({ ...prev, error: "", isLoading: true }));

        if (!username || !password) {
            setFormState((prev) => ({
                ...prev,
                error: "Please fill in all fields",
                isLoading: false,
            }));
            return;
        }

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            login(username);
        } catch (err) {
            setFormState((prev) => ({
                ...prev,
                error: "Failed to create account",
                isLoading: false,
            }));
        }
    };

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                Sign Up
            </h2>

            {formState.error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {formState.error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                    </label>
                    <input
                        type="text"
                        value={formState.username}
                        onChange={(e) =>
                            setFormState((prev) => ({
                                ...prev,
                                username: e.target.value,
                            }))
                        }
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter username"
                        disabled={formState.isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        type="password"
                        value={formState.password}
                        onChange={(e) =>
                            setFormState((prev) => ({
                                ...prev,
                                password: e.target.value,
                            }))
                        }
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter password"
                        disabled={formState.isLoading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={formState.isLoading}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                >
                    {formState.isLoading ? "Signing up..." : "Sign Up"}
                </button>
            </form>

            <p className="mt-4 text-sm text-gray-600 text-center">
                Your session will expire in 24 hours
            </p>
        </div>
    );
};
