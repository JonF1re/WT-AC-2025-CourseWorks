import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const customFormat = printf(({ level, message, timestamp, stack, context, ...metadata }) => {
  let msg = `${timestamp} [${context || 'App'}] ${level}: ${message}`;
  
  // Add stack trace for errors
  if (stack) {
    msg += `\n${stack}`;
  }
  
  // Add metadata if present
  const metadataStr = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
  if (metadataStr) {
    msg += `\n${metadataStr}`;
  }
  
  return msg;
});

export const winstonConfig = {
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        customFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        winston.format.json()
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      ),
    }),
  ],
};

export const createLogger = () => WinstonModule.createLogger(winstonConfig);
