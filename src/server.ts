import { validate } from 'jsonschema';

import * as rawConfig from '../config.json';
import * as configSchema from '../config.schema.json';

import { Builder } from './builder';
import { Config } from './config';
import { HookServer } from './hook-server';
import { Logger, LogLevel } from './logger';
import { WsServer } from './ws-server';

const PORT_WS = 9001;

const config = validate(rawConfig, configSchema, { throwError: true }).instance as Config;

async function start(): Promise<void> {
  Logger.info('Starts build manager server');

  const { hook, repositories, ssh } = config;
  let logs: Log[] = [];

  const builder = new Builder(ssh);
  const hookServer = new HookServer(hook, repositories);
  const wsServer = new WsServer();

  const hookObservable = await hookServer.start();
  const wsConnectionObservable = await wsServer.start(PORT_WS);

  wsConnectionObservable.subscribe(send => send(logs));

  const dispatchLog = (level: LogLevel, data: string | Buffer) => {
    if (data instanceof Buffer) {
      data = data.toString('utf8');
    }

    if (typeof data !== 'string') {
      return;
    }

    data = data.replace(/\s$/, '');

    const log = { level, data, time: Date.now() };
    logs.push(log);
    wsServer.send([log]);
  };

  hookObservable.subscribe(repos => {
    Logger.info(`Builds ${repos}`);

    logs = [];

    dispatchLog(LogLevel.Info, `\
 _         _ _    _
| |__ _  _(_) |__| |  _ __  __ _ _ _  __ _ __ _ ___ _ _
| '_ \\ || | | / _\` | | '  \\/ _\` | ' \\/ _\` / _\` / -_) '_|
|_.__/\\_,_|_|_\\__,_| |_|_|_\\__,_|_||_\\__,_\\__, \\___|_|
                                          |___/
Builds ${repos}\n\n`);

    builder
      .build(repos)
      .subscribe({
        complete: () => dispatchLog(LogLevel.Info, 'Success'),
        error: data => dispatchLog(LogLevel.Error, data),
        next: data => dispatchLog(LogLevel.Info, data),
      });
  });

  Logger.info('Build manager server successfully started');
}

// tslint:disable-next-line
start();

interface Log {
  level: LogLevel;
  data: string;
  time: number;
}
