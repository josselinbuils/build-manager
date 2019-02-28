import { OPEN, Server } from 'ws';

import { Logger } from './logger';

export class WsServer {
  private server: Server;

  async start(port: number): Promise<void> {
    return new Promise<void>(resolve => {
      this.server = new Server({ port }, () => {
        Logger.info(`WebSocket server is listening on port ${port}`);
        resolve();
      });

      this.server.on('connection', () => {
        Logger.info('New connection');
      });
    });
  }
}
