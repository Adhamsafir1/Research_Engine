import React, { useState, useEffect } from "react";
import { Mic, MicOff, Settings, Volume2, User, Activity, Loader2 } from "lucide-react";
import { useVapi } from "../hooks/useVapi";
import Avatar3D from "./Avatar3D";
import VoiceAvatar from "./VoiceAvatar";

const PERSONAS = [
    { id: "tutor", label: "Tutor", desc: "Patient teacher", prompt: "You are a helpful tutor." },
    { id: "researcher", label: "Researcher", desc: "Academic assistant", prompt: "You are a rigorous researcher." },
];

export default function VoiceAgent({ onBack }) {
    // Note: ensure VITE_VAPI_PUBLIC_KEY is correct
    const {
        isConnected,
        isCallActive,
        isSpeaking,
        messages,
        error,
        startCall,
        stopCall,
        endTurn,
        volumeLevel,
        activeTranscript,
        transcriptRole
    } = useVapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);

    const [isStarting, setIsStarting] = useState(false);
    const [selectedRole, setSelectedRole] = useState(PERSONAS[0]);
    const [avatarMode, setAvatarMode] = useState("hologram");

    // Handle user stopping mid-sentence
    useEffect(() => {
        if (!isCallActive || !activeTranscript || transcriptRole !== "user") return;
        const timer = setTimeout(() => {
            if (activeTranscript.trim().length > 4) {
                endTurn();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [activeTranscript, isCallActive, transcriptRole, endTurn]);

    const handleStartCall = async () => {
        setIsStarting(true);
        const overrides = {
            model: {
                provider: "openai",
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: selectedRole.prompt }],
                temperature: 0.3
            },
            voice: {
                provider: "11labs",
                voiceId: "21m00Tcm4TlvDq8ikWAM"
            }
        };
        try {
            await startCall(null, overrides);
        } catch (err) {
            console.error("Call failed to start", err);
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="dashboard-layout" style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="main-column" style={{ display: "flex", gap: "1.5rem" }}>
                
                {/* LEFT SIDE: CONTROLS */}
                <div className="glass-card" style={{ flex: "1", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem" }}>
                        <button onClick={onBack} className="btn-new-research" style={{ padding: "8px", marginRight: "10px" }}>
                            &larr; Back
                        </button>
                        <Activity color="var(--accent)" /> Research Engine Voice
                    </h2>
                    
                    {error && (
                        <div style={{ padding: "12px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--red)", borderRadius: "var(--radius-sm)", color: "var(--red)" }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <h3 style={{ marginBottom: "10px", color: "var(--text-dim)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>Select Persona</h3>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {PERSONAS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedRole(p)}
                                    className="btn-new-research"
                                    style={{ 
                                        flex: 1, 
                                        justifyContent: "center",
                                        borderColor: selectedRole.id === p.id ? "var(--accent-light)" : "var(--border)",
                                        background: selectedRole.id === p.id ? "rgba(99, 102, 241, 0.15)" : "transparent"
                                    }}
                                >
                                    <User size={16} /> {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 style={{ marginBottom: "10px", color: "var(--text-dim)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>Avatar Type</h3>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={() => setAvatarMode("hologram")}
                                className="btn-new-research"
                                style={{ flex: 1, justifyContent: "center", borderColor: avatarMode === "hologram" ? "var(--cyan)" : "var(--border)" }}
                            >
                                3D Hologram
                            </button>
                            <button
                                onClick={() => setAvatarMode("2d")}
                                className="btn-new-research"
                                style={{ flex: 1, justifyContent: "center", borderColor: avatarMode === "2d" ? "var(--cyan)" : "var(--border)" }}
                            >
                                2D Avatar
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: "auto" }}>
                        {!isCallActive ? (
                            <button
                                onClick={handleStartCall}
                                disabled={isStarting}
                                className="search-submit"
                                style={{ width: "100%", height: "60px", borderRadius: "100px", fontSize: "1.1rem", fontWeight: "600", display: "flex", gap: "12px", background: "linear-gradient(135deg, var(--accent), var(--cyan))" }}
                            >
                                {isStarting ? <Loader2 className="animate-spin" /> : <Mic />}
                                {isStarting ? "Connecting..." : `Start ${selectedRole.label} Session`}
                            </button>
                        ) : (
                            <button
                                onClick={stopCall}
                                className="search-submit"
                                style={{ width: "100%", height: "60px", borderRadius: "100px", fontSize: "1.1rem", fontWeight: "600", display: "flex", gap: "12px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid var(--red)", color: "var(--red)" }}
                            >
                                <MicOff /> End Session
                            </button>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: AVATAR & TRANSCRIPTS */}
                <div className="glass-card" style={{ flex: "2", padding: "1.5rem", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", minHeight: "500px" }}>
                    
                    {/* Live Indicator */}
                    {isCallActive && (
                        <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", display: "flex", alignItems: "center", gap: "8px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--green)", padding: "4px 12px", borderRadius: "999px", color: "var(--green)", fontSize: "0.85rem", fontWeight: "600", zIndex: 10 }}>
                            <div className="pulse-dot done"></div> LIVE
                        </div>
                    )}

                    {/* Avatar Container */}
                    <div style={{ width: "100%", height: "350px", position: "relative" }}>
                        {avatarMode === "hologram" ? (
                            <Avatar3D isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
                        ) : (
                            <VoiceAvatar isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
                        )}
                    </div>

                    {/* Subtitles Area */}
                    <div style={{ 
                        marginTop: "2rem", 
                        width: "100%", 
                        height: "100px", 
                        background: "rgba(0, 0, 0, 0.3)", 
                        borderRadius: "var(--radius)", 
                        padding: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--border)"
                    }}>
                        {!isCallActive ? (
                            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Start a session to begin speaking...</p>
                        ) : (
                            <div style={{ textAlign: "center" }}>
                                {activeTranscript ? (
                                    <>
                                        <span style={{ fontSize: "0.8rem", color: transcriptRole === 'user' ? "var(--cyan)" : "var(--accent-light)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "4px" }}>
                                            {transcriptRole === 'user' ? "You" : "Lumen"}
                                        </span>
                                        <p style={{ fontSize: "1.2rem", fontWeight: "500", color: "var(--text)" }}>{activeTranscript}</p>
                                    </>
                                ) : (
                                    <p style={{ color: "var(--text-muted)" }}>Listening...</p>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
