import { outputJsonSync, pathExistsSync, readJsonSync } from 'fs-extra';
import { validate } from 'jsonschema';

import { PORT_HTTP, PORT_WS } from './constants';
import { HookServer } from './hook-server';
import { HttpServer } from './http-server';
import { Logger } from './logger';
import { WsServer } from './ws-server';

const configSchema = require('./config.schema.json');
const rawConfig = require('./config.json');
const config = validate(rawConfig, configSchema, { throwError: true }).instance;

async function start(): Promise<void> {
  Logger.info('Starts build manager server');

  await (new HookServer(config)).start();
  await (new HttpServer()).start(PORT_HTTP);
  await (new WsServer()).start(PORT_WS);

  Logger.info('Build manager server successfully started');
}

// noinspection JSIgnoredPromiseFromCall
start();
