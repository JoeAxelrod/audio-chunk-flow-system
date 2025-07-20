import React from 'react';

interface Props {
  transcripts: { seq: number; text: string }[];
}

const TranscriptPanel: React.FC<Props> = ({ transcripts }) => {
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {transcripts
        .sort((a, b) => a.seq - b.seq)
        .map((t) => (
          <li key={t.seq}>{t.text}</li>
        ))}
    </ul>
  );
};

export default TranscriptPanel; 