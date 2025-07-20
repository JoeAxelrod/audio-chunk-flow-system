import { Server } from 'socket.io';
import { sub } from '../libs/pubsub';
import { EVENTS_CHANNEL, LOG_CHANNEL } from '../../../../common/constants';

export function setupSocketIO(io: Server) {
  sub.subscribe(EVENTS_CHANNEL);
  sub.subscribe(LOG_CHANNEL);
  sub.on('message', (_channel, message) => {
    const evt = JSON.parse(message);
    if (evt.type === 'chunk_ready') io.emit('transcript', evt);
    if (evt.type === 'audio_update') io.emit('audio', evt);
    if (evt.service) io.emit('log', evt);
  });
} 