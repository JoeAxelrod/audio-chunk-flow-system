import path from 'path';

export const CHUNK_SEC = 10 as const;
export const STREAM_KEY = 'zoom.chunks';
export const EVENTS_CHANNEL = 'events';
const PROJECT_ROOT = path.resolve(__dirname, '..');
export const ZOOM_S3_ROOT = path.join(PROJECT_ROOT, 'zoom-data-s3');
export const CONCAT_S3_ROOT = path.join(PROJECT_ROOT, 'sumit-data-s3');
export const LOG_CHANNEL = 'logs';
export const STREAM_BP = 'queue.backend_to_processing';
export const STREAM_PB = 'queue.processing_to_backend';
export const STREAM_BC = 'queue.backend_to_concat';
export const STREAM_CB = 'queue.concat_to_backend';

export function chunkPath(meetingId: string, seq: number) {
  return path.join(ZOOM_S3_ROOT, meetingId, 'chunks', `${seq}.wav`);
} 