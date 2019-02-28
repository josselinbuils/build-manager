import * as express from 'express';
import * as contentLength from 'express-content-length-validator';
import * as helmet from 'helmet';
import * as path from 'path';
import * as serveStatic from 'serve-static';

import { HTTP_DEFAULT_PREFIX, MAX_CONTENT_LENGTH, PUBLIC_DIR } from './constants';
import { Logger } from './logger';

const CLIENT_PATH = path.join(process.cwd(), PUBLIC_DIR);
const HTTP_PREFIX = process.env.HTTP_PREFIX !== undefined ? process.env.HTTP_PREFIX : HTTP_DEFAULT_PREFIX;

export class HttpServer {
  private server = express();

  async start(port: number): Promise<void> {
    return new Promise<void>(resolve => {
      const server = this.server;

      server.use(helmet());
      server.use(contentLength.validateMax({ max: MAX_CONTENT_LENGTH }));
      server.use(HTTP_PREFIX, serveStatic(CLIENT_PATH));

      server.listen(port, () => {
        Logger.info(`HTTP server is listening on port ${port}`);
        resolve();
      });
    });
  }
}
