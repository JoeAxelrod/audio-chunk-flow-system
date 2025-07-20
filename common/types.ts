export interface ChunkQueueMessage {
  meetingId: string;
  seq: number;
  path: string;
}

export interface ProcessingResultMessage {
  meetingId: string;
  seq: number;
  text: string;
  path: string;
}

export interface ConcatResultMessage {
  meetingId: string;
  lastSeq: number;
  url: string;
} 