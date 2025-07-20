import pool from '../libs/db';

export async function getHistory(meetingId: string) {
  const { rows } = await pool.query(
    'SELECT seq, text FROM chunks WHERE meetingId=$1 ORDER BY seq',
    [meetingId]
  );
  return rows;
} 