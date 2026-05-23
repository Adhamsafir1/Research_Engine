import React, { useState, useRef } from 'react';
import { MicIcon } from './Icons';

/**
 * VoiceButton — press-to-speak microphone button for the search bar.
 * Uses MediaRecorder to capture audio, sends it to /api/v1/voice/stt REST endpoint.
 */
export default function VoiceButton({ onTranscription }) {
  // 'idle' | 'listening' | 'processing'
  const [status, setStatus] = useState('idle');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop mic tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        chunksRef.current = [];

        if (audioBlob.size < 1000) {
          setStatus('idle');
          return;
        }

        setStatus('processing');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const res = await fetch('/api/v1/voice/stt', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (data.text && onTranscription) {
            onTranscription(data.text);
          }
        } catch (err) {
          console.error('STT failed:', err);
        }

        setStatus('idle');
      };

      mediaRecorder.start();
      setStatus('listening');
    } catch (err) {
      console.error('Mic access denied:', err);
      setStatus('idle');
    }
  };

  const handleClick = () => {
    if (status === 'idle') {
      startRecording();
    } else if (status === 'listening') {
      stopRecording();
    }
  };

  const label =
    status === 'listening'
      ? 'Click to stop'
      : status === 'processing'
      ? 'Transcribing...'
      : 'Voice search';

  return (
    <button
      type="button"
      className={`voice-btn voice-btn--${status}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
      disabled={status === 'processing'}
    >
      {status === 'listening' ? (
        <>
          <span className="voice-btn__pulse" />
          <MicIcon />
        </>
      ) : status === 'processing' ? (
        <span className="voice-btn__spinner" />
      ) : (
        <MicIcon />
      )}
    </button>
  );
}
