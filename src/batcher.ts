import { Fetcher } from './types';
import { resolveGlobalFetch, DEFAULT_FETCH_OPTIONS } from './utils';

interface BatchOptions {
  fetch?: Fetcher;
  timeout?: number;
}

const defaultOpts: BatchOptions = {
  fetch: resolveGlobalFetch(),
  timeout: 10
};

export function fetchWithBatch(opts?: BatchOptions): Fetcher {
  const { fetch, timeout } = Object.assign({}, defaultOpts, opts || {});
  if (!fetch) {
    throw new Error('Could not resolve global fetch, please provide a fetch polyfill');
  }

  let operations: { resolve: Function; body: string }[] = [];
  let scheduledConsume: any;

  return function batcher(url: any, init: any): Promise<Response> {
    return new Promise(resolve => {
      if (scheduledConsume) {
        clearTimeout(scheduledConsume);
      }

      const operationIndex = operations.length;
      operations.push({ resolve, body: init.body });
      scheduledConsume = setTimeout(async () => {
        const pending = operations;
        const body = `[${operations.map(o => o.body).join(',')}]`;
        operations = [];
        const res = await fetch(url, {
          method: DEFAULT_FETCH_OPTIONS.method,
          headers: {
            ...DEFAULT_FETCH_OPTIONS.headers
          },
          ...opts,
          body
        }).then(r => r.json());

        pending.forEach(o => {
          o.resolve({ json: async () => res[operationIndex] });
        });
      }, timeout);
    });
  };
}
