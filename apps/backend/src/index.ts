import 'express-async-errors';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { errorHandler, notFound } from './middleware';
import { logger } from './utils/logger';
import routes from './routes';

const app: Express = express();
const port = config.port;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// API Route
app.use(config.apiPrefix, routes);
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    app.listen(port, () => {
      logger.info(`伺服器正在運行: ${port}`);
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`啟動伺服器時出錯: ${error.message}`);
    } else {
      logger.error('啟動伺服器時出現未知錯誤');
    }
    process.exit(1);
  }
};

startServer(); 