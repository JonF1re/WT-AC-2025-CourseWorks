import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roadmapRoutes from './routes/roadmaps';
import stepRoutes from './routes/steps';
import resourceRoutes from './routes/resources';
import progressRoutes from './routes/progress';
import { errorHandler } from './middleware/error-handler';

export const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/roadmaps', roadmapRoutes);
app.use('/steps', stepRoutes);
app.use('/resources', resourceRoutes);
app.use('/progress', progressRoutes);

app.use(errorHandler);
