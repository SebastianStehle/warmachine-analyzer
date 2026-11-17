// Limits how many requests run at the same time and how fast they start.
// Start times are reserved synchronously, so parallel callers can never start closer than the interval.
export class RequestThrottle {
  private active = 0;
  private nextStart = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly minIntervalMs: number,
  ) {}

  async run<T>(action: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      const start = Math.max(Date.now(), this.nextStart);
      this.nextStart = start + this.minIntervalMs;

      const wait = start - Date.now();
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }

      return await action();
    } finally {
      this.releaseSlot();
    }
  }

  private async acquireSlot() {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return;
    }

    // The slot is handed over directly by releaseSlot, so the counter stays unchanged.
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private releaseSlot() {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.active--;
    }
  }
}

// Runs the action for every item with at most the given number of actions in parallel.
export async function runWithConcurrency<T>(items: T[], concurrency: number, action: (item: T) => Promise<void>) {
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const item = items[index++];
      await action(item);
    }
  };

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.max(1, Math.min(concurrency, items.length)); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
}
