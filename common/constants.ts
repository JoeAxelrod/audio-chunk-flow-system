import path from 'path';

export const CHUNK_SEC = 10 as const;
export const STREAM_KEY = 'zoom.chunks';
export const EVENTS_CHANNEL = 'events';
export const S3_ROOT = path.join(process.cwd(), 'data', 's3');
export const LOG_CHANNEL = 'logs';
export const STREAM_BP = 'queue.backend_to_processing';
export const STREAM_PB = 'queue.processing_to_backend';
export const STREAM_BC = 'queue.backend_to_concat';
export const STREAM_CB = 'queue.concat_to_backend';

export function chunkPath(meetingId: string, seq: number) {
  return path.join(S3_ROOT, meetingId, 'chunks', `${seq}.wav`);
} 