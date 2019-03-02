import * as githubhook from 'githubhook';
import { Observable, Subject } from 'rxjs';

import { HookConfig } from './config';
import { Logger } from './logger';

export class HookServer {
  private readonly server;
  private readonly subject = new Subject<string>();

  constructor(private readonly config: HookConfig,
              private readonly repositories: string[]) {

    this.server = githubhook({
      ...config,
      logger: Logger,
    });
  }

  async start(): Promise<Observable<string>> {
    return new Promise<Observable<string>>(resolve => {
      this.server.on('push', (repos, ref) => {
        if (this.repositories.indexOf(repos) !== -1 && ref === 'refs/heads/master') {
          this.subject.next(repos);
        }
      });
      this.server.listen(() => resolve(this.subject));
    });
  }
}
