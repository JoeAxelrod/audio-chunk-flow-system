import Redis from 'ioredis';
import pool from '../libs/db';
import { STREAM_PB, STREAM_CB, STREAM_BC } from '../../../../common/constants';
import { ProcessingResultMessage, ConcatResultMessage } from '../../../../common/types';
import { pub as eventsPub } from '../libs/pubsub';
import { EVENTS_CHANNEL } from '../../../../common/constants';

// Separate Redis connections:
// 1) redisPub   – for non-blocking publishing (xadd)
// 2) redisProc  – dedicated to the processing-result consumer (blocking XREAD on STREAM_PB)
// 3) redisConcat – dedicated to the concat-result consumer   (blocking XREAD on STREAM_CB)

const redisPub   = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const redisProc  = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const redisConcat = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function markProcessingDone(meetingId:string, seq:number, text:string, path:string){
  await pool.query(
    `UPDATE chunks SET text=$3, processing_status='done', path=$4
     WHERE meetingId=$1 AND seq=$2`,
    [meetingId, seq, text, path]
  );
  console.log(`[consumer] text stored seq=${seq}`);

  await maybeEmitReady(meetingId, seq);


    // // after processing done, check if this chunk is ready to be concatenated
    // const prevSeq = seq - 1;
    // let ready = seq === 0; // first chunk can always go when processed
    // if (!ready) {
    //   const { rows } = await pool.query(
    //     `SELECT concat_status FROM chunks WHERE meetingId=$1 AND seq=$2`,
    //     [meetingId, prevSeq]
    //   );
    //   ready = rows.length > 0 && rows[0].concat_status === 'done';
    // }
    // if (ready) {
    //   await queueConcat(meetingId, seq, path);
    // }


  // Removed direct concat queuing here to avoid duplicate scheduling.
}

async function markConcatDoneAndCascade(meetingId:string, seq:number, url:string){
  await pool.query(
    `UPDATE chunks SET concat_status='done' WHERE meetingId=$1 AND seq=$2`,
    [meetingId, seq]
  );
  console.log(`consumer concat done seq=${seq}`);

  await maybeEmitReady(meetingId, seq, url);

  // check if next chunk is ready for concat
  const nextSeq = seq + 1;
  const { rows } = await pool.query(
    `SELECT seq, path, concat_status, processing_status
       FROM chunks
      WHERE meetingId=$1 AND seq=$2`,
    [meetingId, nextSeq]
  );
  if (rows.length && rows[0].concat_status !== 'done'){
    await queueConcat(meetingId, nextSeq, rows[0].path);
  }
}

async function queueConcat(meetingId: string, seq: number, path: string) {
  // atomically set concat_status to 'running' only if currently 'queued'
  const { rowCount } = await pool.query(
    `UPDATE chunks
        SET concat_status = 'running'
      WHERE meetingId = $1
        AND seq = $2
        AND concat_status = 'queued' -- only if not already running/done
      RETURNING seq`,
    [meetingId, seq]
  );

  if (rowCount && rowCount > 0) {
    const msg = { meetingId, seq, path };
    await redisPub.xadd(
      STREAM_BC,
      '*',
      'json', JSON.stringify(msg)
    );
    console.log(`[consumer] queued concat for seq=${seq}`);
    return true;
  }

  // already running/done, do not enqueue again
  return false;
}

async function consumeProcessing(){
  let id='0-0';
  console.log('consumer Starting processing consumer...');
  for(;;){
    const res = await redisProc.xread('BLOCK',0,'STREAMS',STREAM_PB,id);
    if(!res) continue;
    for(const [,messages] of res as any[]){
      for(const [msgId,fields] of messages){
        id=msgId;
        // payload could be single json field or separate fields
        let obj: any;
        if (fields[0] === 'json') {
          obj = JSON.parse(fields[1]);
        } else {
          obj = Object.fromEntries(new Array(fields.length/2).fill(0).map((_,i)=>[fields[i*2],fields[i*2+1]]));
        }
        const {meetingId,seq,text,path}=obj as ProcessingResultMessage;
        if(meetingId&&seq&&text&&path){await markProcessingDone(meetingId,Number(seq),text,path);}        
      }
    }
  }
}

async function consumeConcat(){
  let id='0-0';
  console.log('[consumer] Starting concat consumer...');
  for(;;){
    const res = await redisConcat.xread('BLOCK',0,'STREAMS',STREAM_CB,id);
    if(!res) continue;
    for(const [,messages] of res as any[]){
      for(const [msgId,fields] of messages){
        id=msgId;
        let obj:any;
        if(fields[0]==='json'){
          obj = JSON.parse(fields[1]);
        }else{
          obj = Object.fromEntries(new Array(fields.length/2).fill(0).map((_,i)=>[fields[i*2],fields[i*2+1]]));
        }
        const {meetingId,lastSeq,url}=obj as ConcatResultMessage;
        if(meetingId&&lastSeq&&url){await markConcatDoneAndCascade(meetingId,Number(lastSeq),url);}      
      }
    }
  }
}

// Emit socket events when both statuses are done
async function maybeEmitReady(meetingId: string, seq: number, urlFromConcat?: string) {
  const { rows } = await pool.query(
    `SELECT text, path, processing_status, concat_status
       FROM chunks
      WHERE meetingId = $1 AND seq = $2`,
    [meetingId, seq]
  );
  if (!rows.length) return;
  const row = rows[0];
  if (row.processing_status === 'done' && row.concat_status === 'done') {
    const text: string = row.text;
    const url: string = urlFromConcat || row.path; // row.path should hold main.wav path after concat

    // transcript event
    eventsPub.publish(EVENTS_CHANNEL, JSON.stringify({
      type: 'chunk_ready',
      seq,
      text
    }));

    // audio update event
    if (url) {
      eventsPub.publish(EVENTS_CHANNEL, JSON.stringify({
        type: 'audio_update',
        lastSeq: seq,
        url
      }));
    }
  }
}

export async function startConsumers(){
  console.log('consumer Queue consumer started');
  await Promise.all([consumeProcessing(),consumeConcat()]);
} 