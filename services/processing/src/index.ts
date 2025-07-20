import 'dotenv/config';
import Redis from 'ioredis';
import { STREAM_BP, STREAM_PB } from '../../../common/constants';
import { ProcessingResultMessage } from '../../../common/types';
import { initLogger } from '../../../common/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const pub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

initLogger('processing','green');

async function main() {
  let lastId = '0-0';
  console.log('worker waiting');  


  while (true) {
    const res = await redis.xread('BLOCK', 0, 'STREAMS', STREAM_BP, lastId);
    if (!res) continue;
    const [, messages] = res[0] as [string, Array<[string, string[]]>];
    for (const [id, fields] of messages) {
      lastId = id;
      const { json } = Object.fromEntries(new Array(fields.length/2).fill(0).map((_,i)=>[fields[i*2],fields[i*2+1]]));
      if(!json) continue;
      const msg = JSON.parse(json) as {meetingId:string,seq:number,path:string};
      const { meetingId, seq, path } = msg;
      const filePath = path.split('?')[0];

      // mock transcription
      const text = `Transcript for chunk ${seq}: lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

      // simulate processing time 0.5-3 s
      await new Promise(r => setTimeout(r, 500 + Math.random()*2500));

      const result: ProcessingResultMessage = { meetingId, seq, text, path: filePath };
      await pub.xadd(STREAM_PB, '*', 'json', JSON.stringify(result));
      const seqLabel = seq.toString().padStart(6,'0');
      console.log(`[${seqLabel}] result published`);
    }
  }
}

main(); 