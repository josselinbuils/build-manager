import { green, red } from './utils/colors';

export class Logger {
  static error(str: string): void {
    this.internalLog(LogLevel.Error, str);
  }

  static info(str: string): void {
    this.internalLog(LogLevel.Info, str);
  }

  static log(str: string): void {
    this.info(str);
  }

  static internalLog(level: LogLevel, str: string): void {
    let prefix = `[${new Date().toDateString()} ${new Date().toLocaleTimeString()}]`;

    switch (level) {
      case LogLevel.Error:
        prefix = `${prefix} ${red(level)}`;
        break;

      case LogLevel.Info:
        prefix = `${prefix} [${green(level)}]`;
        break;

      default:
        throw new Error('Unknown level');
    }

    console.log(`${prefix} ${str}`);
  }
}

export enum LogLevel {
  Error = 'ERROR',
  Info = 'INFO',
}
