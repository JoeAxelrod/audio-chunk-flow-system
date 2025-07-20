import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import TranscriptPanel from '../components/TranscriptPanel';
import LogPanel from '../components/LogPanel';

const socket = io(import.meta.env.VITE_BACKEND_WS || `ws://${window.location.hostname}:8080`);

const Home: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [transcripts, setTranscripts] = useState<{ seq: number; text: string }[]>([]);

  useEffect(() => {
    socket.on('transcript', (e: any) => {
      setTranscripts((prev) => [...prev, { seq: e.seq, text: e.text }]);
    });

    socket.on('audio', (e: any) => {
      const audio = audioRef.current;
      if (!audio) return;
      const cur = audio.currentTime;
      audio.src = `${e.url}?v=${e.lastSeq}`;
      audio.currentTime = cur;
    });

    return () => {
      socket.off('transcript');
      socket.off('audio');
    };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, padding: 20 }}>
        <audio ref={audioRef} controls style={{ width: '100%' }} />
        <TranscriptPanel transcripts={transcripts} />
      </div>
      <div style={{ width: '40%', borderLeft: '1px solid #ccc', padding: 20, overflowY: 'auto' }}>
        <LogPanel />
      </div>
    </div>
  );
};

export default Home; 