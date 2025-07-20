import { Router, Request, Response, NextFunction } from 'express';
import { pub } from '../libs/pubsub';
import { STREAM_BP, STREAM_BC } from '../../../../common/constants';
import pool from '../libs/db';
import { ChunkQueueMessage } from '../../../../common/types';

const router = Router();

router.post('/chunk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { meetingId, seq, path } = req.body as { meetingId?: string; seq?: number; path?: string };
    if (meetingId === undefined || seq === undefined || path === undefined) {
      return res.status(400).json({ error: 'meetingId, seq, path required' });
    }
    console.log(`Webhook received seq=${seq}`);

    // upsert DB with initial statuses
    await pool.query(
      `INSERT INTO chunks(meetingId, seq, path, processing_status, concat_status)
       VALUES($1,$2,$3,'queued','queued')
       ON CONFLICT (meetingId,seq) DO UPDATE SET path=EXCLUDED.path`,
      [meetingId, seq, path]
    );

    // always send to processing queue
    const msg: ChunkQueueMessage = { meetingId, seq, path };
    await pub.xadd(
      STREAM_BP,
      '*',
      'json', JSON.stringify(msg)
    );
    // console.log(`Queued seq=${seq} to processing queue`);

    // send to concat only if this is first chunk
    // or the immediate previous seq already exists in DB
    let ready = +seq === 0;           // first chunk can always go

    if (!ready) {
      const { rowCount } = await pool.query(
        `SELECT 1
           FROM chunks
          WHERE meetingId = $1
            AND seq       = $2          -- previous chunk
            AND concat_status = 'done'  -- already appended
          LIMIT 1`,
        [meetingId, +seq - 1]
      );
      ready = rowCount === 1;
    }

    if (ready) {
      // atomically update concat_status -> running so we don't queue duplicates later
      await pool.query(
        `UPDATE chunks SET concat_status='running'
          WHERE meetingId=$1 AND seq=$2
            AND concat_status='queued'`,
        [meetingId, seq]
      );
      await pub.xadd(
        STREAM_BC,
        '*',
        'json', JSON.stringify(msg)
      );
      console.log(`Queued seq=${seq} to concat queue`);
    } 

    res.json({ status: 'queued' });
  } catch (err) {
    next(err);
  }
});

export default router;