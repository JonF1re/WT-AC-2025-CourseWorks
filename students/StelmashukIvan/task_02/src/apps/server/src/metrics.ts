import express from 'express';
import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

export const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

export const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
});

export const websocketConnectionsTotal = new client.Gauge({
    name: 'websocket_connections_total',
    help: 'Current number of active WebSocket connections',
});

export const activeAlerts = new client.Gauge({
    name: 'alerts_active',
    help: 'Current number of active alerts',
    labelNames: ['level'],
});

export const metricsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route?.path || req.path;
        httpRequestDurationMicroseconds
            .labels(req.method, route, res.statusCode.toString())
            .observe(duration);
        httpRequestsTotal
            .labels(req.method, route, res.statusCode.toString())
            .inc();
    });
    next();
};

export const getMetrics = async (req: express.Request, res: express.Response) => {
    try {
        res.set('Content-Type', client.register.contentType);
        const metrics = await client.register.metrics();
        res.end(metrics);
    } catch (err) {
        res.status(500).end(err);
    }
};