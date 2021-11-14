import WebSocket, { OPEN, Server } from 'ws';
import { CODE_BAD_REQUEST, CODE_FORBIDDEN } from './constants';
import { Logger } from './Logger';

export enum Command {
  Build = 'build',
  Login = 'login',
  Logs = 'logs',
}

export enum MessageType {
  AuthToken = 'authToken',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Command = 'command',
  Error = 'error',
  Logs = 'logs',
  Success = 'success',
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
      const sendMessage = async (msg: WsMessage) =>
        new Promise<void>((resolve) => {
          client.send(JSON.stringify(msg), resolve as () => void);
        });

      if (ip === undefined) {
        Logger.error('Unable to retrieve client ip, close connection');
        sendMessage({
          type: MessageType.Error,
          value: {
            code: CODE_BAD_REQUEST,
            value: 'Ghostbuster 👻',
          },
        }).then(closeClient);
        return;
      }

      if (this.bannedIPs.includes(ip)) {
        Logger.error('Banned IP, close connection');
        sendMessage({
          type: MessageType.Error,
          value: {
            code: CODE_FORBIDDEN,
            message: 'Banned IP, too many failed login attempts',
          },
        }).then(closeClient);
        return;
      }

      this.clientIPMap[ip] = client;

      client.on('close', () => delete this.clientIPMap[ip]);

      client.on('message', (data) => {
        Logger.info(`Received message: ${data}`);
        try {
          const message = JSON.parse(data as unknown as string);
          this.messageHandler(message, sendMessage, ip, closeClient);
        } catch (error: any) {
          Logger.error(error.stack);
        }
      });
    });

    this.server = server;
  }

  banIP = (ip: string): void => {
    this.bannedIPs.push(ip);
  };

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

  async send(message: WsMessage): Promise<void> {
    const sentPromises = [] as Promise<void>[];

    this.server.clients.forEach((client) => {
      if (client.readyState === OPEN) {
        sentPromises.push(
          new Promise((resolve) => {
            client.send(JSON.stringify(message), resolve as () => void);
          })
        );
      }
    });

    await Promise.all(sentPromises);
  }
}

type WsSender = (message: WsMessage) => Promise<void>;

interface WsMessage {
  type: MessageType;
  value: any;
}

function noop(): void {}
