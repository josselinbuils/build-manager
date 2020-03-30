import { v4 as uuidv4 } from 'uuid';
import {
  AUTHENTICATION_DURATION_MS,
  MAX_AUTHENTICATION_TENTATIVES_BY_IP,
} from './constants';

export class Authenticator {
  private readonly tentatives: { [ip: string]: number } = {};
  private readonly tokenIPMap: { [token: string]: string } = {};

  static create(banIP: (ip: string) => void, password: string): Authenticator {
    return new Authenticator(banIP, password);
  }

  constructor(
    private readonly banIP: (ip: string) => void,
    private readonly password: string
  ) {}

  authenticate(password: string, ip: string): string | undefined {
    const { tentatives, tokenIPMap } = this;

    if (tentatives[ip] === undefined) {
      tentatives[ip] = 1;
    } else {
      tentatives[ip]++;
    }

    if (password === this.password) {
      const token = uuidv4();

      tokenIPMap[token] = ip;
      delete tentatives[ip];
      setTimeout(() => delete tentatives[ip], AUTHENTICATION_DURATION_MS);

      return token;
    }

    if (tentatives[ip] >= MAX_AUTHENTICATION_TENTATIVES_BY_IP) {
      this.banIP(ip);
      delete tentatives[ip];
    }
  }

  isAuthenticated(ip: string, token: string): boolean {
    return this.tokenIPMap[token] === ip;
  }
}
