export async function runWithConcurrency(items, handler, concurrency = 2) {
  const queue = [...items];
  const running = new Set();
  const results = [];

  async function runOne(item) {
    try {
      const res = await handler(item);
      results.push(res);
    } finally {
      running.delete(item);
    }
  }

  while (queue.length > 0 || running.size > 0) {
    while (queue.length > 0 && running.size < concurrency) {
      const next = queue.shift();
      running.add(next);
      runOne(next); // intentionally not awaited
    }
    if (running.size > 0) {
      await Promise.race([...running].map(() => new Promise(r => setTimeout(r, 20))));
    }
  }

  return results;
}


