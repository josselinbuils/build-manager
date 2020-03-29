declare module 'githubhook' {
  import EventEmitter from 'events';

  export default class GithubHook extends EventEmitter {
    constructor(options: Options);
    listen(callback: () => void): void;
  }

  interface Options {
    port?: number;
    secret?: string;
    logger?: Logger;
    path?: string;
  }

  interface Logger {
    error(str: string): void;
    log(str: string): void;
  }
}
