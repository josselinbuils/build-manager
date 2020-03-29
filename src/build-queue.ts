import { Logger } from './logger';

export class BuildQueue {
  private busy: boolean;
  private readonly queue: (() => Promise<void>)[] = [];

  enqueue(build: () => Promise<void>): void {
    if (!this.busy) {
      this.exec(build);
    } else {
      this.queue.push(build);
    }
  }

  private async exec(build: () => Promise<void>): Promise<void> {
    this.busy = true;

    try {
      await build();
    } catch (error) {
      Logger.error(error.stack);
    }

    if (this.queue.length > 0) {
      await this.exec(this.queue.shift());
    } else {
      this.busy = false;
    }
  }
}
