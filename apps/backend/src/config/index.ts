import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  logger: {
    level: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api',
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
}; 