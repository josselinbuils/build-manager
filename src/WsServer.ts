import { Observable, Subject } from 'rxjs';
import { OPEN, Server } from 'ws';
import { Logger } from './Logger';

export class WsServer {
  private server: Server;

  send(data: object): void {
    this.server.clients.forEach((client) => {
      if (client.readyState === OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  async start(port: number): Promise<Observable<WsDataSender>> {
    return new Promise<Observable<WsDataSender>>((resolve) => {
      const connectionSubject = new Subject<WsDataSender>();

      this.server = new Server({ port }, () => {
        Logger.info(`WebSocket server is listening on port ${port}`);
        resolve(connectionSubject);
      });

      this.server.on('connection', (client) => {
        Logger.info('New websocket connection');

        client.on('message', (data) => console.log(data));

        const clientDataSender = (data: any) =>
          client.send(JSON.stringify(data));
        connectionSubject.next(clientDataSender);
      });
    });
  }
}

type WsDataSender = (data: object) => void;
