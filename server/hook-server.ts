import * as githubhook from 'githubhook';
import * as ssh from 'ssh-exec';

import { Logger } from './logger';

enum Mode {
  Clean = 'clean',
  Update = 'update',
}

const DEFAULT_BUILD_MODE = Mode.Update;

export class HookServer {
  private server;

  constructor(private config: Config) {
    this.server = githubhook({
      ...config.hook,
      logger: Logger,
    });
  }

  build(repos: string, mode: Mode): void {
    Logger.info(`Builds ${repos} using ${mode} mode...`);

    const service = repos.replace(/-/g, '').toLowerCase();
    const container = `docker_${service}_1`;
    let commands;

    switch (mode) {
      case Mode.Clean:
        commands = [
          'cd /home/ubuntu/docker',
          `docker-compose build --no-cache ${service}`,
          'docker-compose up -d',
          'docker system prune -f',
        ];
        break;

      case Mode.Update:
        const dockerCommands = [
          'git checkout .',
          'git pull',
          'yarn install --production --frozen-lockfile',
          '([[ $(npm run | grep "^ *build *$") ]] && yarn build)',
          'exit',
        ];
        commands = [
          `docker exec ${container} bash -c '${dockerCommands.join(' && ')}'`,
          `docker restart ${container}`,
        ];
        break;

      default:
        console.error(`Unknown mode: ${mode}`);
    }

    const command = commands.join(' && ');

    Logger.info(`-> ${command}`);

    ssh(command, this.config.ssh, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);

        if (stderr.includes('not running')) {
          Logger.info('Docker container seems to be stopped, retry in clean mode');
          this.build(repos, Mode.Clean);
        }
      } else {
        Logger.info('Success');
      }
    }).pipe(process.stdout);
  }

  async start(): Promise<void> {
    return new Promise<void>(resolve => {
      this.server.on('push', (repos, ref) => {
        if (this.config.repositories.indexOf(repos) !== -1 && ref === 'refs/heads/master') {
          this.build(repos, DEFAULT_BUILD_MODE);
        }
      });
      this.server.listen(resolve);
    });
  }
}

interface Config {
  hook: {
    path: string;
    port: number;
    secret: string;
  };
  repositories: string[];
  ssh: {
    host: string;
    password: string;
    user: string;
  };
}
