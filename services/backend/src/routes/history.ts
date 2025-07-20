import { Router } from 'express';
import { getHistory } from '../services/historyService';

const router = Router();

router.get('/:meetingId', async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const rows = await getHistory(meetingId);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router; 