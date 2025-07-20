import 'dotenv/config';
import Redis from 'ioredis';
import * as fs from 'fs';
import { dirname } from 'path';
import { STREAM_BC, S3_ROOT, STREAM_CB } from '../../../common/constants';
import { ChunkQueueMessage } from '../../../common/types';
import { ffconcat } from '../../../common/ffconcat';
import { initLogger } from '../../../common/logger';
import path from 'path';

const sub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const pub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function concatPiece(meetingId: string, chunkPath: string, seq: number) {
  // remove any query params from path
  const cleanChunk = chunkPath.split('?')[0];
  const mainPath = path.join(S3_ROOT, meetingId, 'main.wav');
  await fs.promises.mkdir(dirname(mainPath), { recursive: true });

  if (fs.existsSync(mainPath)) {
    const tmp = `${mainPath}.tmp`;
    ffconcat(mainPath, cleanChunk, tmp);
    await fs.promises.rename(tmp, mainPath);
  } else {
    await fs.promises.copyFile(cleanChunk, mainPath);
  }

  // simulate processing time 0.5-3 s
  await new Promise(r => setTimeout(r, 500 + Math.random()*2500));

  await pub.xadd(STREAM_CB, '*', 'meetingId', meetingId, 'lastSeq', seq.toString(), 'url', mainPath);
  const seqLabel = seq.toString().padStart(6,'0');
  console.log(`[${seqLabel}] audio_update`);
}

async function main() {
  let lastId = '0-0';
  console.log('worker ready');
  while (true) {
    const res = await sub.xread('BLOCK', 0, 'STREAMS', STREAM_BC, lastId);
    if (!res) continue;
    const [, messages] = res[0] as [string, Array<[string, string[]]>];
    for (const [id, fields] of messages) {
      lastId = id;
      const { json } = Object.fromEntries(new Array(fields.length/2).fill(0).map((_,i)=>[fields[i*2],fields[i*2+1]]));
      if (!json) continue;
      const msg = JSON.parse(json) as ChunkQueueMessage;
      await concatPiece(msg.meetingId, msg.path, msg.seq);
    }
  }
}

initLogger('concat','magenta');

main(); 