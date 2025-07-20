import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_WS || `ws://${window.location.hostname}:8080`);

interface Entry { ts: number; service: string; msg: string }

const LogPanel: React.FC = () => {
  const [logs, setLogs] = useState<Entry[]>([]);

  useEffect(() => {
    socket.on('log', (e: Entry) => {
      setLogs((prev) => [...prev, e]);
    });
    return () => {
      socket.off('log');
    };
  }, []);

  return (
    <ul style={{ listStyle: 'none', padding: 0, fontFamily: 'monospace' }}>
      {logs.map((l, i) => (
        <li key={i}>
          [{new Date(l.ts).toLocaleTimeString()}] <b>{l.service}</b>: {l.msg}
        </li>
      ))}
    </ul>
  );
};
export default LogPanel; 