import { HookConfig } from './HookConfig';
import { SSHConfig } from './SSHConfig';

export interface Config {
  hook: HookConfig;
  repositories: string[];
  ssh: SSHConfig;
}
