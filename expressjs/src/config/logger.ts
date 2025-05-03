import winston from 'winston';
import path from 'path';
import { secret } from '@/config/secret';
import fs from 'fs';

// Define log levels with priorities
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format function to handle object logging properly
const formatMessage = (info: any) => {
  if (info.message && typeof info.message === 'object') {
    info.message = JSON.stringify(info.message);
  }
  return `${info.timestamp} ${info.level}: ${info.message}`;
};

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(formatMessage)
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Set up base transports for logging
const baseTransports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat
  }),
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat
  })
];

// Set the logging level based on the environment
const level = () => {
  return secret.nodeEnv === 'development' ? 'debug' : 'warn';
};

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: baseTransports,
  exitOnError: false
});

// Create error logger for express-winston
export const errorLogger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add HTTP logger for Morgan integration
export const httpLogger = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

export default logger;