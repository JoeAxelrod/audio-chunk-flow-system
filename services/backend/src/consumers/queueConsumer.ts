import Redis from 'ioredis';
import pool from '../libs/db';
import { STREAM_PB, STREAM_CB, STREAM_BC } from '../../../../common/constants';
import { initLogger } from '../../../../common/logger';
import { ProcessingResultMessage, ConcatResultMessage } from '../../../../common/types';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
initLogger('consumer','cyan');

async function markProcessingDone(meetingId:string, seq:number, text:string, path:string){
  await pool.query(
    `UPDATE chunks SET text=$3, processing_status='done', path=$4
     WHERE meetingId=$1 AND seq=$2`,
    [meetingId, seq, text, path]
  );
  console.log(`[consumer] text stored seq=${seq}`);
}

async function markConcatDoneAndCascade(meetingId:string, seq:number, url:string){
  await pool.query(
    `UPDATE chunks SET concat_status='done' WHERE meetingId=$1 AND seq=$2`,
    [meetingId, seq]
  );
  console.log(`[consumer] concat done seq=${seq}`);

  // check if next chunk is ready for concat
  const nextSeq = seq + 1;
  const { rows } = await pool.query(
    `SELECT seq, path, concat_status, processing_status
       FROM chunks
      WHERE meetingId=$1 AND seq=$2`,
    [meetingId, nextSeq]
  );
  if (rows.length && rows[0].concat_status !== 'done' && rows[0].processing_status==='done'){
    // trigger concat for next seq
    await redis.xadd(
      STREAM_BC,
      '*',
      'meetingId', meetingId,
      'seq', nextSeq.toString(),
      'path', rows[0].path
    );
    console.log(`[consumer] triggered concat for seq=${nextSeq}`);
  }
}

async function consumeProcessing(){
  let id='0-0';
  for(;;){
    const res = await redis.xread('BLOCK',0,'STREAMS',STREAM_PB,id);
    if(!res) continue;
    for(const [,messages] of res as any[]){
      for(const [msgId,fields] of messages){
        id=msgId;
        const payload = JSON.parse(fields[1]) as ProcessingResultMessage;
        const {meetingId,seq,text,path}=payload as ProcessingResultMessage;
        if(meetingId&&seq&&text&&path){await markProcessingDone(meetingId,Number(seq),text,path);}        
      }
    }
  }
}

async function consumeConcat(){
  let id='0-0';
  for(;;){
    const res = await redis.xread('BLOCK',0,'STREAMS',STREAM_CB,id);
    if(!res) continue;
    for(const [,messages] of res as any[]){
      for(const [msgId,fields] of messages){
        id=msgId;
        const payload = JSON.parse(fields[1]) as ConcatResultMessage;
        const {meetingId,lastSeq,url}=payload as ConcatResultMessage;
        if(meetingId&&lastSeq&&url){await markConcatDoneAndCascade(meetingId,Number(lastSeq),url);}      
      }
    }
  }
}

export async function startConsumers(){
  console.log('Queue consumer started');
  await Promise.all([consumeProcessing(),consumeConcat()]);
} 