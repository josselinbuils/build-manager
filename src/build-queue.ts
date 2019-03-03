export class BuildQueue {
  private busy: boolean;
  private readonly queue: (() => Promise<void>)[] = [];

  enqueue(build: () => Promise<void>): void {
    if (!this.busy) {
      // tslint:disable-next-line
      this.exec(build);
    } else {
      this.queue.push(build);
    }
  }

  private async exec(build: () => Promise<void>): Promise<void> {
    this.busy = true;
    await build();

    if (this.queue.length > 0) {
      await this.exec(this.queue.shift());
    } else {
      this.busy = false;
    }
  }
}
