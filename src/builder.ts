import { BehaviorSubject, Observable } from 'rxjs';
import { Client } from 'ssh2';

import { SshConfig } from './config';

export enum BuildMode {
  Clean = 'clean',
  Update = 'update',
}

export class Builder {

  constructor(private readonly config: SshConfig) {}

  build(repos: string, mode: BuildMode = BuildMode.Update): Observable<string> {
    const service = repos.replace(/-/g, '').toLowerCase();
    const container = `docker_${service}_1`;
    let commands;

    switch (mode) {
      case BuildMode.Clean:
        commands = [
          'cd /home/ubuntu/docker',
          `docker-compose build --no-cache ${service}`,
          'docker-compose up -d',
          'docker system prune -f',
        ];
        break;

      case BuildMode.Update:
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
        throw new Error(`Unknown mode: ${mode}`);
    }

    const command = commands.join(' && ');
    const subject = new BehaviorSubject<string>(`-> ${command}`);
    const ssh = new Client();

    ssh.on('ready', () => {
      ssh.exec(command, { pty: true }, (error, stream) => {
        if (error) {
          subject.error(error);
          return;
        }
        stream
          .on('close', code => {
            if (code !== 0) {
              subject.error(new Error(`Non-zero exit code: ${code}`));
            } else {
              subject.complete();
            }
            ssh.end();
          })
          .on('data', data => subject.next(data))
          .stderr
          .on('data', data => subject.next(data));
      });
    }).connect(this.config);

    return subject;
  }
}
