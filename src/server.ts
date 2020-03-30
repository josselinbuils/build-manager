import { Deferred } from '@josselinbuils/utils';
import { validate } from 'jsonschema';
import path from 'path';
import { Authenticator } from './Authenticator';
import { Builder, BuildMode } from './Builder';
import { BuildQueue } from './BuildQueue';
import configSchema from './config.schema.json';
import { CODE_NOT_FOUND, CODE_UNAUTHORIZED, PORT_WS } from './constants';
import { HookServer } from './HookServer';
import { Config } from './interfaces';
import { Logger, LogLevel } from './Logger';
import { hasOption } from './utils';
import { bold, green, red } from './utils/colors';
import { Command, MessageType, WsServer } from './WsServer';

Logger.info('Starts build manager server');

const rawConfig = require(path.join(process.cwd(), 'config.json'));
const config = validate(rawConfig, configSchema, { throwError: true })
  .instance as Config;

const { auth, hook, repositories, ssh } = config;
let logs = [] as Log[];

HookServer.create(hook, repositories).onHook(build);

const wsServer = WsServer.create(PORT_WS);
const authenticator = Authenticator.create(wsServer.banIP, auth.password);

wsServer.onMessage(async ({ type, value }, sendMessage, ip, closeClient) => {
  if (type !== MessageType.Command) {
    return;
  }
  const { args, command } = value;

  switch (command) {
    case Command.Build: {
      const { authToken } = value;
      const repos = args[0];

      if (!authenticator.isAuthenticated(ip, authToken)) {
        await sendMessage({
          type: MessageType.Error,
          value: {
            code: CODE_UNAUTHORIZED,
            message: 'Unauthorized, please login',
          },
        });
        closeClient();
        return;
      }

      if (!repositories.includes(repos)) {
        await sendMessage({
          type: MessageType.Error,
          value: {
            code: CODE_NOT_FOUND,
            message: 'Unknown repository',
          },
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
    }

    case Command.Login: {
      const password = args[0];
      const authToken = authenticator.authenticate(password, ip);

      if (authToken === undefined) {
        await sendMessage({
          type: MessageType.Error,
          value: {
            code: CODE_UNAUTHORIZED,
            message: 'Wrong password',
          },
        });
        closeClient();
      } else {
        await sendMessage({
          type: MessageType.AuthToken,
          value: authToken,
        });
        await sendMessage({
          type: MessageType.Success,
          value: 'Login success',
        });
        closeClient();
      }
      break;
    }

    case Command.Logs:
      sendMessage({ type: MessageType.Logs, value: logs });
      break;

    default:
      sendMessage({
        type: MessageType.Error,
        value: {
          code: CODE_NOT_FOUND,
          message: 'Unknown command',
        },
      }).then(closeClient);
  }
});

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
${bold(`⚙️ Builds ${repos}`)}`
    );

    Builder.create(ssh)
      .onError(async (error) => {
        await dispatchLog(LogLevel.Error, red(error.message));
        await dispatchLog(LogLevel.Error, red('\n✘ Fail'));
        buildDeferred.resolve();
      })
      .onComplete(async () => {
        await dispatchLog(LogLevel.Info, green('\n✔ Success'));
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

interface Log {
  level: LogLevel;
  data: string;
  time: number;
}
