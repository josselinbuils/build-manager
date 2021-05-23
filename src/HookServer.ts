import GithubHook from 'githubhook';
import { HookConfig } from './interfaces';
import { Logger } from './Logger';

export class HookServer {
  private hookHandler = (() => {}) as (repos: string) => void;

  static create(config: HookConfig, repositories: string[]): HookServer {
    return new HookServer(config, repositories);
  }

  constructor(
    config: HookConfig,
    private readonly repositories: string[]
  ) {
    const server = new GithubHook({
      ...config,
      logger: Logger,
    });

    server
      .on('push', (repos, ref) => {
        if (
          this.repositories.indexOf(repos) !== -1 &&
          ref === 'refs/heads/master'
        ) {
          this.hookHandler(repos);
        }
      })
      .listen();
  }

  onHook(hookHandler: (repos: string) => void): HookServer {
    this.hookHandler = hookHandler;
    return this;
  }
}
