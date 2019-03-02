import { validate } from 'jsonschema';

import { Builder } from './builder';
import { Config } from './config';
import { LOG_CLEANING_INTERVAL, LOG_LIFETIME, PORT_WS } from './constants';
import { HookServer } from './hook-server';
import { Logger, LogLevel } from './logger';
import { WsServer } from './ws-server';

const configSchema = require('../config.schema.json');
const rawConfig = require('../config.json');
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

  const dispatchLog = (level: LogLevel, data: string) => {
    const log = { level, data, time: Date.now() };
    Logger.internalLog(level, data);
    logs.push(log);
    wsServer.send([log]);
  };

  hookObservable.subscribe(repos => {
    Logger.info(`Builds ${repos}`);

    builder
      .build(repos)
      .subscribe({
        complete: () => dispatchLog(LogLevel.Info, 'Success'),
        error: data => dispatchLog(LogLevel.Error, data),
        next: data => dispatchLog(LogLevel.Info, data),
      });
  });

  setInterval(() => {
    const now = Date.now();
    logs = logs.filter(log => (now - log.time) < LOG_LIFETIME);
  }, LOG_CLEANING_INTERVAL);

  Logger.info('Build manager server successfully started');
}

// tslint:disable-next-line
start();

interface Log {
  level: LogLevel;
  data: string;
  time: number;
}
