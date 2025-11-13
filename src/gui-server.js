/**
 * GUI Server - Express web server for dashboard
 * SSE real-time logging, L1/L2/L3 process execution
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import configManager from './services/config-manager.js';
import logger from './lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize configuration
configManager.load();
const config = configManager.getAll();

const app = express();
const PORT = config.gui.port || 3000;
const HOST = config.gui.host || 'localhost';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SSE clients
const sseClients = [];

/**
 * SSE Endpoint - Real-time log streaming
 */
app.get('/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Add client to list
  const client = { res, id: Date.now() };
  sseClients.push(client);

  logger.info(`SSE client connected: ${client.id}`);

  // Hook into logger stream
  const logListener = (logEntry) => {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  };

  logger.stream.on('log', logListener);

  // Keep-alive ping
  const keepAlive = setInterval(() => {
    res.write(`:ping\n\n`);
  }, config.gui.sse.keepalive_interval || 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    const index = sseClients.findIndex(c => c.id === client.id);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
    logger.info(`SSE client disconnected: ${client.id}`);
  });
});

/**
 * L1 Process Endpoints
 */
app.post('/l1/process', async (req, res) => {
  const { placeIds } = req.body;

  if (!placeIds || !Array.isArray(placeIds)) {
    return res.status(400).json({ error: 'placeIds array required' });
  }

  logger.info(`L1 process started for ${placeIds.length} places`);

  res.json({
    status: 'started',
    message: 'L1 processing initiated',
    placeIds
  });

  // Process will be implemented in Phase 3
});

app.get('/l1/results', async (req, res) => {
  // Will be implemented in Phase 3
  res.json({ message: 'L1 results endpoint - to be implemented' });
});

/**
 * L2 Process Endpoints
 */
app.post('/l2/process', async (req, res) => {
  logger.info('L2 process started');

  res.json({
    status: 'started',
    message: 'L2 processing initiated'
  });

  // Process will be implemented in Phase 4
});

app.get('/l2/results', async (req, res) => {
  // Will be implemented in Phase 4
  res.json({ message: 'L2 results endpoint - to be implemented' });
});

/**
 * L3 Process Endpoints
 */
app.post('/l3/process', async (req, res) => {
  logger.info('L3 process started');

  res.json({
    status: 'started',
    message: 'L3 processing initiated'
  });

  // Process will be implemented in Phase 5
});

app.get('/l3/results', async (req, res) => {
  // Will be implemented in Phase 5
  res.json({ message: 'L3 results endpoint - to be implemented' });
});

/**
 * Logs Management Endpoints
 */
app.get('/logs/all', async (req, res) => {
  // Will be implemented - return log files
  res.json({ message: 'Logs endpoint - to be implemented' });
});

app.post('/logs/clear', async (req, res) => {
  // Will be implemented - clear log files
  res.json({ message: 'Clear logs endpoint - to be implemented' });
});

app.get('/logs/download', async (req, res) => {
  // Will be implemented - download log file
  res.json({ message: 'Download logs endpoint - to be implemented' });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      mockMode: {
        ai: configManager.isAiMockMode(),
        naver: configManager.isNaverMockMode()
      }
    }
  });
});

/**
 * Start server
 */
app.listen(PORT, HOST, () => {
  logger.info(`GUI Server started at http://${HOST}:${PORT}`);
  logger.info(`Mock Mode - AI: ${configManager.isAiMockMode()}, Naver: ${configManager.isNaverMockMode()}`);
  console.log(`\n🚀 GUI Server running at http://${HOST}:${PORT}`);
  console.log(`📊 SSE Logs: http://${HOST}:${PORT}/logs/stream`);
  console.log(`💚 Health: http://${HOST}:${PORT}/health\n`);
});

export default app;
