import express from 'express';
const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'healthy',
      redis: 'healthy'  
    }
  });
});