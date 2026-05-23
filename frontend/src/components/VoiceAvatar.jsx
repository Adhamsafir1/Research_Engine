import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function VoiceAvatar({ isSpeaking, volumeLevel = 0 }) {
    const [blink, setBlink] = useState(false);

    // Blinking logic
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setBlink(true);
            setTimeout(() => setBlink(false), 150);
        }, 4000 + Math.random() * 2000); // Blink every 4-6 seconds

        return () => clearInterval(blinkInterval);
    }, []);

    // Mouth animation logic
    const [simulatedVolume, setSimulatedVolume] = useState(0);

    useEffect(() => {
        let interval;
        if (isSpeaking && volumeLevel === 0) {
            interval = setInterval(() => {
                setSimulatedVolume(Math.random());
            }, 100);
        } else {
            setSimulatedVolume(0);
        }
        return () => clearInterval(interval);
    }, [isSpeaking, volumeLevel]);

    const effectiveMouthHeight = volumeLevel > 0
        ? Math.max(4, volumeLevel * 50)
        : isSpeaking ? Math.max(4, simulatedVolume * 25) : 4;


    return (
        <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Avatar Container */}
            <div style={{ position: "relative", width: "200px", height: "200px" }}>

                {/* Glow/Aura */}
                <motion.div
                    animate={{
                        scale: isSpeaking ? [1, 1.1, 1] : 1,
                        opacity: isSpeaking ? [0.3, 0.6, 0.3] : 0.2
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{
                        position: "absolute", inset: 0,
                        background: "var(--accent)", borderRadius: "50%", filter: "blur(40px)"
                    }}
                />

                {/* Head/Face Shape */}
                <div style={{
                    position: "absolute", inset: "10px",
                    background: "linear-gradient(to bottom, #ffffff, #e2e8f0)",
                    borderRadius: "40px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    border: "4px solid rgba(255, 255, 255, 0.1)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    overflow: "hidden"
                }}>

                    {/* Eyes Container */}
                    <div style={{ display: "flex", gap: "40px", marginBottom: "30px" }}>
                        {/* Left Eye */}
                        <div style={{ position: "relative", width: "16px", height: "48px", background: "#1e293b", borderRadius: "999px", overflow: "hidden" }}>
                            <motion.div
                                animate={{ height: blink ? 0 : '100%' }}
                                transition={{ duration: 0.1 }}
                                style={{ width: "100%", background: "#1e293b", position: "absolute", top: 0 }}
                            />
                            {/* Eye shine */}
                            <div style={{ position: "absolute", top: "8px", right: "4px", width: "6px", height: "12px", background: "rgba(255,255,255,0.3)", borderRadius: "999px" }} />
                        </div>

                        {/* Right Eye */}
                        <div style={{ position: "relative", width: "16px", height: "48px", background: "#1e293b", borderRadius: "999px", overflow: "hidden" }}>
                            <motion.div
                                animate={{ height: blink ? 0 : '100%' }}
                                transition={{ duration: 0.1 }}
                                style={{ width: "100%", background: "#1e293b", position: "absolute", top: 0 }}
                            />
                            <div style={{ position: "absolute", top: "8px", right: "4px", width: "6px", height: "12px", background: "rgba(255,255,255,0.3)", borderRadius: "999px" }} />
                        </div>
                    </div>

                    {/* Mouth */}
                    <motion.div
                        animate={{ height: effectiveMouthHeight, width: isSpeaking ? 30 : 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        style={{ background: "#1e293b", borderRadius: "999px" }}
                    />

                    {/* Cheeks (Blush) */}
                    <div style={{ position: "absolute", top: "55%", left: "30px", width: "24px", height: "16px", background: "rgba(254, 205, 211, 0.6)", borderRadius: "999px", filter: "blur(6px)" }} />
                    <div style={{ position: "absolute", top: "55%", right: "30px", width: "24px", height: "16px", background: "rgba(254, 205, 211, 0.6)", borderRadius: "999px", filter: "blur(6px)" }} />

                </div>
            </div>
        </div>
    );
}
