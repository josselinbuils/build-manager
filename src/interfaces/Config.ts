import { HookConfig } from './HookConfig';
import { SSHConfig } from './SSHConfig';

export interface Config {
  auth: {
    password: string;
  };
  hook: HookConfig;
  repositories: string[];
  ssh: SSHConfig;
}
