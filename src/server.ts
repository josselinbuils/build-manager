import { Deferred } from '@josselinbuils/utils';
import chalk from 'chalk';
import { validate } from 'jsonschema';
import path from 'path';
import { Builder, BuildMode } from './Builder';
import { BuildQueue } from './BuildQueue';
import configSchema from './config.schema.json';
import { HookServer } from './HookServer';
import { Config } from './interfaces';
import { Logger, LogLevel } from './Logger';
import { hasOption } from './utils';
import { Command, MessageType, WsServer } from './WsServer';

const MAX_AUTHENTICATION_TENTATIVES_BY_IP = 3;
const PORT_WS = 9001;

Logger.info('Starts build manager server');

const rawConfig = require(path.join(process.cwd(), 'config.json'));
const config = validate(rawConfig, configSchema, { throwError: true })
  .instance as Config;

const authentication = {} as {
  [ip: string]: { authenticated: boolean; tentatives: number };
};

const { hook, repositories, ssh } = config;
let logs = [] as Log[];

HookServer.create(hook, repositories).onHook(build);

const wsServer = WsServer.create(PORT_WS).onMessage(
  async ({ type, value }, sendMessage, ip, closeClient) => {
    if (type !== MessageType.Command) {
      return;
    }
    const { args, command } = value;

    switch (command) {
      case Command.Build:
        const repos = args[0];

        if (!isAuthenticated(ip)) {
          await sendMessage({
            type: MessageType.Error,
            value: 'Unauthorized, please login',
          });
          closeClient();
          return;
        }

        if (!repositories.includes(repos)) {
          await sendMessage({
            type: MessageType.Error,
            value: 'Unknown repository',
          });
          closeClient();
          return;
        }

        const buildMode = hasOption(args, 'clean')
          ? BuildMode.Clean
          : BuildMode.Update;

        await build(repos, buildMode);
        closeClient();
        break;

      case Command.Login:
        const password = args[0];

        if (isAuthenticated(ip)) {
          await sendMessage({
            type: MessageType.Info,
            value: 'Already logged in',
          });
          closeClient();
          return;
        }

        if (!authenticate(password, ip)) {
          await sendMessage({
            type: MessageType.Error,
            value: 'Wrong password',
          });
          closeClient();
        } else {
          await sendMessage({ type: MessageType.Info, value: 'Login success' });
          closeClient();
        }
        break;

      case Command.Logs:
        sendMessage({ type: MessageType.Logs, value: logs });
        break;

      default:
        sendMessage({ type: MessageType.Error, value: 'Unknown command' }).then(
          closeClient
        );
    }
  }
);

const buildQueue = new BuildQueue();

Logger.info('Build manager server successfully started');

async function build(
  repos: string,
  buildMode: BuildMode = BuildMode.Update
): Promise<void> {
  const buildDeferred = new Deferred<void>();

  buildQueue.enqueue(async () => {
    Logger.info(`Builds ${repos}`);

    logs = [];

    await dispatchLog(
      LogLevel.Info,
      `\
 _         _ _    _
| |__ _  _(_) |__| |  _ __  __ _ _ _  __ _ __ _ ___ _ _
| '_ \\ || | | / _\` | | '  \\/ _\` | ' \\/ _\` / _\` / -_) '_|
|_.__/\\_,_|_|_\\__,_| |_|_|_\\__,_|_||_\\__,_\\__, \\___|_|
                                          |___/
${chalk.bold(`⚙️ Builds ${repos}`)}`
    );

    Builder.create(ssh)
      .onError(async (error) => {
        await dispatchLog(LogLevel.Error, chalk.red(error.message));
        await dispatchLog(LogLevel.Error, chalk.red('\n❌ Fail'));
        buildDeferred.resolve();
      })
      .onComplete(async () => {
        await dispatchLog(LogLevel.Info, chalk.green('\n✔ Success'));
        buildDeferred.resolve();
      })
      .onLog((log) => dispatchLog(LogLevel.Info, log))
      .build(repos, buildMode);

    return buildDeferred.promise;
  });

  return buildDeferred.promise;
}

async function dispatchLog(level: LogLevel, data: string): Promise<void> {
  const log = { level, data, time: Date.now() };
  console.log(log.data.replace(/[\n\r]$/, ''));
  logs.push(log);
  return wsServer.send({ type: MessageType.Logs, value: [log] });
}

function isAuthenticated(ip: string): boolean {
  return authentication[ip]?.authenticated || false;
}

function authenticate(password: string, ip: string): boolean {
  if (authentication[ip] === undefined) {
    authentication[ip] = {
      authenticated: false,
      tentatives: 1,
    };
  } else {
    authentication[ip].tentatives++;
  }

  if (password === ssh.password) {
    authentication[ip].authenticated = true;
    return true;
  }

  if (authentication[ip].tentatives >= MAX_AUTHENTICATION_TENTATIVES_BY_IP) {
    wsServer.banIP(ip);
  }

  return false;
}

interface Log {
  level: LogLevel;
  data: string;
  time: number;
}
