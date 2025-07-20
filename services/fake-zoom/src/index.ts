import { chunkPath } from '../../../common/constants';
import * as fs from 'fs';
import { dirname } from 'path';
import { fetch } from 'undici';
import shuffle from 'lodash/shuffle';
import { randomUUID } from 'crypto';
import { initLogger } from '../../../common/logger';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
const meetingId = process.env.MEETING_ID || randomUUID();
const totalChunks = Number(process.env.TOTAL_CHUNKS || 30);

// initialize logger without publishing to Redis
initLogger('ZOOM','yellow',false);

function generateAudio(seq: number): Buffer {
  return Buffer.from(`AUDIO_CHUNK_${seq}`);
}

async function main() {
  
  try {
    // clean previous run files just for make things nice and clean
    await fs.promises.rm(`${require('../../../common/constants').S3_ROOT}/${meetingId}`, { recursive: true, force: true });
  } catch {}

  const seqs = shuffle([...Array(totalChunks).keys()]);
  console.log(`producing ${totalChunks} chunks for meeting ${meetingId}`);
  for (const seq of seqs) {
    const audio = generateAudio(seq);
    const path = chunkPath(meetingId, seq);
    await fs.promises.mkdir(dirname(path), { recursive: true });
    await fs.promises.writeFile(path, audio);

    // fake signed URL (token TTL)
    const token = Math.random().toString(36).slice(2);
    const ttl = Date.now() + 60_000; // 1 min
    const url = `${path}?token=${token}&ttl=${ttl}`;

    try {
      await fetch(`${backendUrl}/webhook/chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, seq, path: url })
      });
    } catch (err) {
      console.error('Failed to POST chunk', seq, err);
    }
    console.log(`[${seq.toString().padStart(6,'0')}] produced`);
    await new Promise((r) => setTimeout(r, Math.random() * 2000 + 500));
  }
  console.log('done');
}

main(); 