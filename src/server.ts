import chalk from 'chalk';
import { validate } from 'jsonschema';
import path from 'path';
import { Builder } from './Builder';
import { BuildQueue } from './BuildQueue';
import configSchema from './config.schema.json';
import { HookServer } from './HookServer';
import { Config } from './interfaces';
import { Logger, LogLevel } from './Logger';
import { WsServer } from './WsServer';

const PORT_WS = 9001;

const rawConfig = require(path.join(process.cwd(), 'config.json'));
const config = validate(rawConfig, configSchema, { throwError: true })
  .instance as Config;

async function start(): Promise<void> {
  Logger.info('Starts build manager server');

  const { hook, repositories, ssh } = config;
  let logs = [] as Log[];

  const builder = new Builder(ssh);
  const hookServer = new HookServer(hook, repositories);
  const wsServer = new WsServer();

  const hookObservable = await hookServer.start();
  const wsConnectionObservable = await wsServer.start(PORT_WS);

  wsConnectionObservable.subscribe((send) => send(logs));

  const dispatchLog = (level: LogLevel, data: string) => {
    const log = { level, data, time: Date.now() };
    console.log(log.data.replace(/[\n\r]$/, ''));
    logs.push(log);
    wsServer.send([log]);
  };

  const buildQueue = new BuildQueue();

  hookObservable.subscribe((repos) => {
    buildQueue.enqueue(
      async () =>
        new Promise<void>((resolve) => {
          Logger.info(`Builds ${repos}`);

          logs = [];

          dispatchLog(
            LogLevel.Info,
            `\
 _         _ _    _
| |__ _  _(_) |__| |  _ __  __ _ _ _  __ _ __ _ ___ _ _
| '_ \\ || | | / _\` | | '  \\/ _\` | ' \\/ _\` / _\` / -_) '_|
|_.__/\\_,_|_|_\\__,_| |_|_|_\\__,_|_||_\\__,_\\__, \\___|_|
                                          |___/
${chalk.bold(`⚙️ Builds ${repos}`)}`
          );

          builder.build(repos).subscribe({
            complete: () => {
              dispatchLog(LogLevel.Info, chalk.green('\n✔ Success'));
              resolve();
            },
            error: (error) => {
              dispatchLog(LogLevel.Error, chalk.red(error.message));
              dispatchLog(LogLevel.Error, chalk.red('\n❌ Fail'));
              resolve();
            },
            next: (data) => dispatchLog(LogLevel.Info, data),
          });
        })
    );
  });

  Logger.info('Build manager server successfully started');
}

start();

interface Log {
  level: LogLevel;
  data: string;
  time: number;
}
