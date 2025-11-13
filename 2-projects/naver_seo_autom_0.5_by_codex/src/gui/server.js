import http from 'http';
import { createApp } from './app.js';

const app = createApp();
const port = Number(process.env.PORT) || 3060;
const host = process.env.HOST || '127.0.0.1';

http.createServer(app).listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`GUI server listening on http://${host}:${port}`);
});
