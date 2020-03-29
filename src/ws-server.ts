import { Observable, Subject } from 'rxjs';
import { OPEN, Server } from 'ws';
import { Logger } from './logger';

export class WsServer {
  private server: Server;

  send(data: object): void {
    this.server.clients.forEach(client => {
      if (client.readyState === OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  async start(port: number): Promise<Observable<WsSender>> {
    return new Promise<Observable<WsSender>>(resolve => {
      const subject = new Subject<WsSender>();

      this.server = new Server({ port }, () => {
        Logger.info(`WebSocket server is listening on port ${port}`);
        resolve(subject);
      });

      this.server.on('connection', client => {
        Logger.info('New websocket connection');
        subject.next(data => client.send(JSON.stringify(data)));
      });
    });
  }
}

export type WsSender = (data: object) => void;
