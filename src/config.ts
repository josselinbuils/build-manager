export interface Config {
  hook: HookConfig;
  repositories: string[];
  ssh: SshConfig;
}

export interface HookConfig {
  path: string;
  port: number;
  secret: string;
}

export interface SshConfig {
  host: string;
  password: string;
  user: string;
}
