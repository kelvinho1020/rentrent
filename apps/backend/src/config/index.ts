import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
    host: string;
    port: number;
  };
  mapbox: {
    apiKey: string;
  };
  logger: {
    level: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/rentrent?schema=public',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://redis:6379',
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  mapbox: {
    apiKey: process.env.MAPBOX_API_KEY || '',
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
}; 