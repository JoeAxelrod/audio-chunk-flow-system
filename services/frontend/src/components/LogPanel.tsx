import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_WS || `ws://${window.location.hostname}:8080`);

interface Entry { ts: number; service: string; msg: string }

const LogPanel: React.FC = () => {
  const [logs, setLogs] = useState<Entry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('log', (e: Entry) => {
      setLogs((prev) => [...prev, e]);
    });
    return () => {
      socket.off('log');
    };
  }, []);

  // auto-scroll to bottom whenever logs change
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const colorMap: Record<string, string> = {
    backend: '#007bff',      // blue
    concat: '#d63384',       // pink/magenta
    processing: '#28a745',   // green
    'fake-zoom': '#fd7e14',  // orange
    frontend: '#6f42c1',     // purple
  };

  const getColor = (service: string) => colorMap[service] || '#000';

  return (
    <div
      ref={containerRef}
      style={{ overflowY: 'auto', height: '100%' }}
    >
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontFamily: 'monospace' }}>
        {logs.map((l, i) => (
          <li key={i} style={{ whiteSpace: 'pre-wrap' }}>
            [{new Date(l.ts).toLocaleTimeString()}] {" "}
            <b style={{ color: getColor(l.service) }}>{l.service}</b>: {l.msg}
          </li>
        ))}
      </ul>
    </div>
  );
};
export default LogPanel; 