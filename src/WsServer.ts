import WebSocket, { OPEN, Server } from 'ws';
import { Logger } from './Logger';

export enum Command {
  Build = 'build',
  Login = 'login',
  Logs = 'logs',
}

export enum MessageType {
  Command = 'command',
  Error = 'error',
  Info = 'info',
  Logs = 'logs',
}

export class WsServer {
  private readonly bannedIPs = [] as string[];
  private readonly clientIPMap = {} as { [ip: string]: WebSocket };
  private messageHandler = noop as (
    message: WsMessage,
    sendMessage: WsSender,
    ip: string,
    closeClient: () => void
  ) => void;
  private readonly server: Server;

  static create(port: number): WsServer {
    return new WsServer(port);
  }

  constructor(port: number) {
    const server = new Server({ port }, () => {
      Logger.info(`WebSocket server is listening on port ${port}`);
    });

    server.on('connection', (client, { socket }) => {
      Logger.info('New websocket connection');

      const ip = socket.remoteAddress;
      const closeClient = () => client.close();
      const sendMessage = (msg: WsMessage) => client.send(JSON.stringify(msg));

      if (ip === undefined) {
        Logger.error('Unable to retrieve client ip, close connection');
        sendMessage({ type: MessageType.Error, value: 'Ghostbuster' });
        client.close();
        return;
      }

      if (this.bannedIPs.includes(ip)) {
        Logger.error('Banned IP, close connection');
        sendMessage({
          type: MessageType.Error,
          value: 'Banned IP, too many failed login attempts',
        });
        client.close();
        return;
      }

      this.clientIPMap[ip] = client;

      client.on('close', () => delete this.clientIPMap[ip]);

      client.on('message', (data) => {
        try {
          const message = JSON.parse(data as string);
          this.messageHandler(message, sendMessage, ip, closeClient);
        } catch (error) {
          Logger.error(error.stack);
        }
      });
    });

    this.server = server;
  }

  banIP(ip: string): void {
    this.bannedIPs.push(ip);
  }

  onMessage(
    messageHandler: (
      message: WsMessage,
      sendMessage: WsSender,
      ip: string,
      closeClient: () => void
    ) => void
  ): WsServer {
    this.messageHandler = messageHandler;
    return this;
  }

  send(message: WsMessage): void {
    this.server.clients.forEach((client) => {
      if (client.readyState === OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

type WsSender = (message: WsMessage) => void;
interface WsMessage {
  type: MessageType;
  value: any;
}

function noop(): void {}
