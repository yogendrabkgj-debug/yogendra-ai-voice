import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Room, RoomEvent, Track } from 'livekit-client';
import './style.css';

function App() {
  const [status, setStatus] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const roomRef = useRef(null);
  const audioBoxRef = useRef(null);

  const cleanup = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try { await room.disconnect(); } catch (_) { /* best-effort cleanup */ }
    }
    if (audioBoxRef.current) audioBoxRef.current.replaceChildren();
    setIsMuted(false);
    setStatus('idle');
  };

  useEffect(() => () => {
    const room = roomRef.current;
    if (room) room.disconnect();
  }, []);

  const startConversation = async () => {
    if (roomRef.current || status === 'connecting') return;
    setError('');
    setStatus('connecting');

    let room;
    try {
      const tokenResponse = await fetch('/.netlify/functions/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error || 'Could not create a secure voice session.');
      }
      if (!tokenData.serverUrl || !tokenData.participantToken) {
        throw new Error('The voice-session server returned incomplete connection details.');
      }

      room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, async (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio && audioBoxRef.current) {
          const audioElement = track.attach();
          audioElement.autoplay = true;
          audioElement.playsInline = true;
          audioElement.setAttribute('aria-label', `Audio from ${participant.name || 'YOGENDRA'}`);
          audioBoxRef.current.appendChild(audioElement);
          try { await audioElement.play(); } catch (_) { /* browser may need the initial click */ }
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const agentIsSpeaking = speakers.some((speaker) => speaker !== room.localParticipant);
        setStatus(agentIsSpeaking ? 'speaking' : 'listening');
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setStatus('listening');
      });

      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) {
          roomRef.current = null;
          if (audioBoxRef.current) audioBoxRef.current.replaceChildren();
          setIsMuted(false);
          setStatus('idle');
        }
      });

      await room.connect(tokenData.serverUrl, tokenData.participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);
      setStatus('listening');
    } catch (err) {
      if (room) {
        try { await room.disconnect(); } catch (_) { /* ignore cleanup error */ }
      }
      roomRef.current = null;
      setStatus('idle');
      const message = err?.message || 'Something went wrong while starting the call.';
      setError(message.includes('Permission') || message.includes('NotAllowed')
        ? 'Microphone permission is blocked. Please allow microphone access in your browser and try again.'
        : message);
    }
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const nextMuted = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
    } catch (err) {
      setError(err?.message || 'Could not change microphone setting.');
    }
  };

  const isActive = status === 'listening' || status === 'speaking';
  const orbClass = ['orb', status === 'speaking' ? 'is-speaking' : '', status === 'connecting' ? 'is-connecting' : ''].filter(Boolean).join(' ');
  const statusText = status === 'connecting'
    ? 'Connecting to Yogendra…'
    : status === 'speaking'
      ? 'Yogendra is speaking'
      : status === 'listening'
        ? 'I’m listening. Go ahead.'
        : 'Your AI assistant is ready';

  return (
    <div className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Yogendra AI home">
          <span className="brand-mark">Y</span>
          <span>YOGENDRA<span className="brand-ai"> AI</span></span>
        </a>
        <span className="online-pill"><i /> AI VOICE ASSISTANT</span>
      </header>

      <main className="main-content">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR IDEAS, IN A CONVERSATION <span className="eyebrow-line" /></div>
        <h1>Meet <span>Yogendra.</span></h1>
        <p className="subtitle">Your friendly AI assistant for websites, apps, online editors, and AI voice agents.</p>

        <section className={`voice-stage ${status}`} aria-live="polite">
          <div className="orb-wrap">
            <div className="orb-halo halo-a" />
            <div className="orb-halo halo-b" />
            <div className="orb-halo halo-c" />
            <div className={orbClass}>
              <div className="orb-glow" />
              <div className="orb-shine" />
              <div className="orb-core" />
            </div>
            <div className="orbit-dot dot-one" />
            <div className="orbit-dot dot-two" />
            <div className="orbit-dot dot-three" />
          </div>
          <div className={`voice-bars ${status === 'speaking' ? 'active' : ''}`} aria-hidden="true">
            <span /><span /><span /><span /><span /><span /><span />
          </div>
          <div className="status-row"><span className={`status-dot ${isActive ? 'active' : ''}`} />{statusText}</div>
        </section>

        {!isActive ? (
          <button className={`start-button ${status === 'connecting' ? 'loading' : ''}`} onClick={startConversation} disabled={status === 'connecting'}>
            <span className="button-pulse" />
            <span className="button-icon">{status === 'connecting' ? '⋯' : '◖'}</span>
            <span>{status === 'connecting' ? 'Connecting…' : 'Start Talking'}</span>
            {status !== 'connecting' && <span className="button-arrow">↗</span>}
          </button>
        ) : (
          <div className="call-controls">
            <button className={`control-button ${isMuted ? 'muted' : ''}`} onClick={toggleMute}>
              <span>{isMuted ? '◌' : '◖'}</span>{isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button className="end-button" onClick={cleanup}><span>×</span> End conversation</button>
          </div>
        )}

        {error && <div className="error-message" role="alert">{error}</div>}
        <p className="privacy-note">By starting, you agree to speak with an AI assistant. Please allow microphone access.</p>
      </main>

      <footer className="footer"><span>BUILT TO TURN IDEAS INTO REALITY</span><span className="footer-separator">•</span><span>POWERED BY LIVEKIT</span></footer>
      <div className="audio-mount" ref={audioBoxRef} aria-hidden="true" />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
