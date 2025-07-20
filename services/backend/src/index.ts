import dotenv from 'dotenv';
dotenv.config();    
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
// import historyRoute from './routes/history';
import webhookRoute from './routes/webhook';
import { errorHandler } from './middlewares/errorHandler';
import { setupSocketIO } from './sockets/index';
import { initLogger } from '../../../common/logger';
import { startConsumers } from './consumers/queueConsumer';
import Redis from 'ioredis';


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });


// routes
app.use(express.json());
app.use('/webhook', webhookRoute);

// middlewares
app.use(errorHandler);

setupSocketIO(io);

// reset DB and Redis on startup (dev convenience)
async function resetState() {
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    await redis.flushall();
    redis.disconnect();
    const poolModule = await import('./libs/db');
    await (poolModule.default).query('TRUNCATE TABLE chunks CASCADE');
    console.log('[backend] state reset');
  } catch (err) {
    console.error('[backend] reset failed', err);
  }
}

resetState().then(startConsumers);

const port = Number((globalThis as any).process?.env?.PORT || 8080);
server.listen(port, () => {
    console.log('Backend listening on', port) 
});

initLogger('backend','blue');