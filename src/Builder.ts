import { Client } from 'ssh2';
import { SSHConfig } from './interfaces';
import { bold } from './utils/colors';

const MAX_LINE_LENGTH = 500;

export enum BuildMode {
  Clean = 'clean',
  Update = 'update',
}

export class Builder {
  private completeHandler = (() => {}) as () => void;
  private errorHandler = (() => {}) as (error: Error) => void;
  private logHandler = (() => {}) as (log: string) => void;

  static create(config: SSHConfig): Builder {
    return new Builder(config);
  }

  constructor(private readonly config: SSHConfig) {}

  build(repos: string, mode: BuildMode): void {
    const service = repos.replace(/-/g, '').toLowerCase();
    const container = `docker_${service}_1`;
    let steps: { name: string; command: string }[];

    switch (mode) {
      case BuildMode.Clean:
        steps = [
          {
            name: 'Build image',
            command: `cd /home/ubuntu/docker && docker-compose build --no-cache ${service}`,
          },
          {
            name: 'Recreate container',
            command: 'cd /home/ubuntu/docker && docker-compose up -d',
          },
          {
            name: 'Clean',
            command: 'docker system prune -f',
          },
        ];
        break;

      case BuildMode.Update:
        steps = [
          {
            name: 'Update source code',
            command: `docker exec -t ${container} bash -c 'git checkout . && git pull'`,
          },
          {
            name: 'Install dependencies',
            command: `docker exec -t ${container} bash -c 'yarn install --frozen-lockfile'`,
          },
          {
            name: 'Build',
            command: `docker exec -t ${container} bash -c '([[ $(npm run | grep "build$") ]] && yarn build)\
 || echo No build command found'`,
          },
          {
            name: 'Restart container',
            command: `docker restart ${container}`,
          },
        ];
        break;

      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    const ssh = new Client();
    let lineData = ' ';

    const processData = (data: string | Buffer) => {
      if (data instanceof Buffer) {
        data = data.toString('utf8');
      }
      lineData += data;

      if (!/\r\n?|\n/.test(data)) {
        return;
      }
      if (lineData.length <= MAX_LINE_LENGTH) {
        this.logHandler(lineData);
      }
      lineData = ' ';
    };

    let promise = Promise.resolve() as Promise<void>;

    ssh
      .on('ready', () => {
        steps.forEach(({ name, command }, index) => {
          promise = promise.then(
            async () =>
              new Promise<void>((resolve, reject) => {
                this.logHandler(`\n${bold(`[${index + 1}] ${name}`)}\n\n`);

                ssh.exec(command, (error, stream) => {
                  if (error) {
                    reject(error);
                    return;
                  }
                  stream
                    .on('close', (code: number) => {
                      if (code !== 0) {
                        reject(new Error(`Non-zero exit code: ${code}`));
                      } else {
                        resolve();
                      }
                    })
                    .on('data', processData)
                    .stderr.on('data', processData);
                });
              })
          );
        });

        promise
          .then(() => this.completeHandler())
          .catch((error) => this.errorHandler(error))
          .finally(() => ssh.end());
      })
      .connect(this.config);
  }

  onComplete(completeHandler: () => void): Builder {
    this.completeHandler = completeHandler;
    return this;
  }

  onError(errorHandler: (error: Error) => void): Builder {
    this.errorHandler = errorHandler;
    return this;
  }

  onLog(logHandler: (log: string) => void): Builder {
    this.logHandler = logHandler;
    return this;
  }
}
