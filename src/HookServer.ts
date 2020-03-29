import GithubHook from 'githubhook';
import { Observable, Subject } from 'rxjs';
import { HookConfig } from './interfaces';
import { Logger } from './Logger';

export class HookServer {
  private readonly server: GithubHook;
  private readonly subject = new Subject<string>();

  constructor(
    private readonly config: HookConfig,
    private readonly repositories: string[]
  ) {
    this.server = new GithubHook({
      ...config,
      logger: Logger,
    });
  }

  async start(): Promise<Observable<string>> {
    return new Promise<Observable<string>>((resolve) => {
      this.server.on('push', (repos, ref) => {
        if (
          this.repositories.indexOf(repos) !== -1 &&
          ref === 'refs/heads/master'
        ) {
          this.subject.next(repos);
        }
      });
      this.server.listen(() => resolve(this.subject));
    });
  }
}
