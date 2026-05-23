import { useState, useEffect, useCallback, useRef } from 'react';
// Handle Vite's CJS-to-ESM interop correctly
import VapiModule from '@vapi-ai/web';
const Vapi = typeof VapiModule === 'function' ? VapiModule : VapiModule?.default;
import { vapiApi } from '../lib/api';
import { trackEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import logger from "../lib/logger";

/* =========================
   GLOBAL SINGLETONS
========================= */
let vapiInstance = null;
let isInitialized = false;
let isCallStartInProgress = false;
let isSinkPatched = false;
let sharedAudioContext = null;

/* =========================
   AUDIO CONTEXT (REUSED)
========================= */
const getAudioContext = () => {
    if (!sharedAudioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        sharedAudioContext = new AudioContextClass();
    }
    return sharedAudioContext;
};

/* =========================
   SAFE AUDIO PATCH (ONCE)
========================= */
if (
    typeof window !== 'undefined' &&
    HTMLAudioElement?.prototype?.setSinkId &&
    !isSinkPatched
) {
    const original = HTMLAudioElement.prototype.setSinkId;

    HTMLAudioElement.prototype.setSinkId = function (sinkId) {
        return original.call(this, sinkId).catch(() => Promise.resolve());
    };

    isSinkPatched = true;
}

/* =========================
   MAIN HOOK
========================= */
export const useVapi = (publicKey, conversationId = null) => {

    const [isConnected, setIsConnected] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [callStartTime, setCallStartTime] = useState(null);

    const [volumeLevel, setVolumeLevel] = useState(0);
    const [activeTranscript, setActiveTranscript] = useState("");
    const [transcriptRole, setTranscriptRole] = useState("assistant");

    const transcriptClearTimerRef = useRef(null);
    const messagesRef = useRef([]);
    const conversationIdRef = useRef(conversationId);
    const sessionIdRef = useRef(null);
    const callStartTimeRef = useRef(null);
    const messageIdsRef = useRef(new Set());

    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    /* =========================
       PRECONNECT (non-blocking)
    ========================= */
    useEffect(() => {
        fetch("https://api.vapi.ai", { mode: "no-cors" }).catch(() => {});
    }, []);

    /* =========================
       INIT VAPI
    ========================= */
    useEffect(() => {
        if (!publicKey) {
            setError("Vapi public key is required");
            return;
        }

        if (!vapiInstance && !isInitialized) {
            try {
                vapiInstance = new Vapi(publicKey);
                isInitialized = true;
                logger.info("Vapi initialized");
            } catch (err) {
                setError(err.message);
                return;
            }
        }

        const vapi = vapiInstance;
        if (!vapi) return;

        /* ---------- EVENTS ---------- */

        const onCallStart = () => {
            setIsCallActive(true);
            setIsConnected(true);

            const start = Date.now();
            setCallStartTime(start);
            callStartTimeRef.current = start;

            const id = crypto.randomUUID();
            setSessionId(id);
            sessionIdRef.current = id;

            messageIdsRef.current.clear();

            if (conversationIdRef.current) {
                vapiApi.startSession({
                    conversation_id: conversationIdRef.current,
                    vapi_session_id: id,
                }).catch(logger.error);
            }
        };

        const onCallEnd = () => {
            setIsCallActive(false);
            setIsConnected(false);
            setIsSpeaking(false);
            setVolumeLevel(0);
            setActiveTranscript("");

            if (transcriptClearTimerRef.current) {
                clearTimeout(transcriptClearTimerRef.current);
            }

            const duration = callStartTimeRef.current
                ? (Date.now() - callStartTimeRef.current) / 1000
                : 0;

            if (sessionIdRef.current) {
                vapiApi.endSession({
                    vapi_session_id: sessionIdRef.current,
                    total_duration: duration,
                    status: "ended",
                }).catch(logger.error);
            }

            sessionIdRef.current = null;
            callStartTimeRef.current = null;
            messagesRef.current = [];
            messageIdsRef.current.clear();
            setSessionId(null);

            isCallStartInProgress = false;
        };

        const onSpeechStart = () => setIsSpeaking(true);

        const onSpeechEnd = () => {
            setIsSpeaking(false);
            setVolumeLevel(0);

            if (transcriptClearTimerRef.current) {
                clearTimeout(transcriptClearTimerRef.current);
            }

            transcriptClearTimerRef.current = setTimeout(() => {
                setActiveTranscript("");
            }, 1200);
        };

        const onVolumeLevel = (v) => setVolumeLevel(v);

        const onMessage = (message) => {
            // Partial transcript (live)
            if (message.type === "transcript" && message.transcriptType === "partial") {
                if (transcriptClearTimerRef.current) {
                    clearTimeout(transcriptClearTimerRef.current);
                }
                setActiveTranscript(message.transcript);
                setTranscriptRole(message.role === "user" ? "user" : "assistant");
                return;
            }

            const content = message.content || message.transcript || "";
            if (!content.trim()) return;

            // Stable dedup key
            const id = `${message.role}-${content.slice(0, 50)}`;

            if (messageIdsRef.current.has(id)) return;
            messageIdsRef.current.add(id);

            const newMsg = {
                role: message.role === "model" ? "assistant" : message.role,
                content,
                metadata: { id, timestamp: Date.now() },
            };

            setMessages((prev) => [...prev, newMsg]);
            messagesRef.current.push(newMsg);
        };

        const onError = (err) => {
            logger.error("Vapi Error:", err);
            setError(err.message || "Error");

            if (err?.error?.type === "ejected") {
                trackEvent("vapi_ejection", {
                    reason: err.error.msg,
                });
            }
        };

        vapi.on("call-start", onCallStart);
        vapi.on("call-end", onCallEnd);
        vapi.on("speech-start", onSpeechStart);
        vapi.on("speech-end", onSpeechEnd);
        vapi.on("message", onMessage);
        vapi.on("error", onError);
        vapi.on("volume-level", onVolumeLevel);

        return () => {
            vapi.off("call-start", onCallStart);
            vapi.off("call-end", onCallEnd);
            vapi.off("speech-start", onSpeechStart);
            vapi.off("speech-end", onSpeechEnd);
            vapi.off("message", onMessage);
            vapi.off("error", onError);
            vapi.off("volume-level", onVolumeLevel);
        };
    }, [publicKey]);

    /* =========================
       START CALL
    ========================= */
    const startCall = useCallback(async (assistantId = null, overrides = null) => {
        if (!vapiInstance) {
            setError("Vapi not initialized");
            return;
        }

        if (isCallStartInProgress) return;
        isCallStartInProgress = true;

        setError(null);
        setMessages([]);
        messagesRef.current = [];
        messageIdsRef.current.clear();
        setActiveTranscript("");

        try {
            // reuse audio context
            const ctx = getAudioContext();
            if (ctx.state === "suspended") await ctx.resume();

            const config = {
                model: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    temperature: 0.3,
                    max_tokens: 150,
                },
                voice: {
                    provider: "11labs",
                    voiceId: "21m00Tcm4TlvDq8ikWAM",
                },
                ...overrides,
            };

            return await vapiInstance.start(assistantId || config);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            isCallStartInProgress = false;
        }
    }, []);

    const stopCall = useCallback(() => {
        if (vapiInstance && isCallActive) {
            vapiInstance.stop();
        }
    }, [isCallActive]);
    
    const endTurn = useCallback(() => {
        if (vapiInstance && isCallActive) {
            vapiInstance.send({
                type: 'control',
                control: 'end-of-turn',
            });
            logger.info('Manually ended turn');
        }
    }, [isCallActive]);

    const sendMessage = useCallback((msg) => {
        if (vapiInstance && isCallActive) {
            vapiInstance.send({
                type: "add-message",
                message: { role: "user", content: msg },
            });
        }
    }, [isCallActive]);

    return {
        isConnected,
        isCallActive,
        isSpeaking,
        messages,
        error,
        sessionId,
        startCall,
        stopCall,
        endTurn,
        sendMessage,
        volumeLevel,
        activeTranscript,
        transcriptRole,
    };
};

export default useVapi;
