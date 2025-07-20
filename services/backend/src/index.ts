// index.ts
// import { parse } from 'dotenv';
// import { readFileSync } from 'fs';
// import path from 'path';

// // Absolute path to the .env file (adjust if it sits elsewhere)
// const envPath = path.resolve(__dirname, '../.env');

// console.log( path.resolve(__dirname, '../.env')     )

// // Read and parse .env
// const envVars = parse(readFileSync(envPath));

// // Pretty‑print ONLY the variables that came from .env
// console.log(envVars);




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


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });


// routes
app.use(express.json());
// app.use('/history', historyRoute);
app.use('/webhook', webhookRoute);

// middlewares
app.use(errorHandler);

setupSocketIO(io);

startConsumers();

const port = Number((globalThis as any).process?.env?.PORT || 8080);
server.listen(port, () => {
    console.log('Backend listening on', port)
    setInterval(() => {
        console.log('Backend is running');
    }, 10_000);    
});

initLogger('backend','blue');