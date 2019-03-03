import * as color from 'ansi-colors';
import { Observable, Subject } from 'rxjs';
import { Client } from 'ssh2';

import { SshConfig } from './config';

const MAX_LINE_LENGTH = 500;
const STEP_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

export enum BuildMode {
  Clean = 'clean',
  Update = 'update',
}

export class Builder {

  constructor(private readonly config: SshConfig) {}

  build(repos: string, mode: BuildMode = BuildMode.Update): Observable<string> {
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
            command: 'docker-compose up -d',
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
            command: `docker exec -t ${container} bash -c 'yarn install --production --frozen-lockfile'`,
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

    const subject = new Subject<string>();
    const ssh = new Client();

    let lineData = '';

    const processData = (data: string | Buffer) => {
      if (data instanceof Buffer) {
        data = data.toString('utf8');
      }
      lineData += data;

      if (!/\r\n?|\n/.test(data)) {
        return;
      }
      if (lineData.length <= MAX_LINE_LENGTH) {
        subject.next(lineData);
      }
      lineData = '';
    };

    let promise = Promise.resolve() as Promise<void>;

    ssh.on('ready', () => {
      steps.forEach(({ name, command }, index) => {
        promise = promise.then(() => new Promise<void>((resolve, reject) => {
          subject.next(`\n${color.bold(`${STEP_EMOJI[index]} ${name}`)}`);

          ssh.exec(command, (error, stream) => {
            if (error) {
              subject.error(error);
              return;
            }
            stream
              .on('close', code => {
                if (code !== 0) {
                  reject(new Error(`Non-zero exit code: ${code}`));
                } else {
                  resolve();
                }
              })
              .on('data', processData)
              .stderr
              .on('data', processData);
          });
        }));
      });

      promise
        .then(() => subject.complete())
        .catch(error => subject.error(error))
        .finally(() => ssh.end());

    }).connect(this.config);

    return subject;
  }
}
