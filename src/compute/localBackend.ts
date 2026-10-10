import { wrap, type Remote } from 'comlink';
import {
  CHUNK_SIZE,
  mergePools,
  poolSize,
  runChunk,
  selectCandidates,
  type Candidate,
  type ChunkResult,
} from '@/core/exploration/explore';
import type { ComputeBackend, ExploreResult } from './backend';
import type { ExploreWorkerApi } from './explore.worker';

interface Slot {
  worker: Worker;
  api: Remote<ExploreWorkerApi>;
}

/**
 * Runs exploration chunks on a pool of Web Workers (one per core by default).
 * Chunks have a fixed size, so the result is identical for any worker count.
 */
export class LocalWorkerBackend implements ComputeBackend {
  readonly name = 'web-workers';
  private slots: Slot[] = [];

  constructor(private readonly size: number) {}

  private ensure(): Slot[] {
    if (this.slots.length === 0 && typeof Worker !== 'undefined') {
      for (let i = 0; i < this.size; i++) {
        const worker = new Worker(new URL('./explore.worker.ts', import.meta.url), {
          type: 'module',
          name: `explore-${i}`,
        });
        this.slots.push({ worker, api: wrap<ExploreWorkerApi>(worker) });
      }
    }
    return this.slots;
  }

  async explore(
    ...[template, spec, onProgress, signal]: Parameters<ComputeBackend['explore']>
  ): Promise<ExploreResult> {
    const t0 = performance.now();
    const k = poolSize(spec);
    const starts: number[] = [];
    for (let s = 0; s < spec.candidates; s += CHUNK_SIZE) starts.push(s);
    const results: ChunkResult[] = new Array(starts.length);
    let next = 0;
    let done = 0;
    let rejected = 0;
    const slots = this.ensure();

    const runOne = async (exec: (req: Parameters<typeof runChunk>[0]) => Promise<ChunkResult>) => {
      while (next < starts.length) {
        if (signal?.aborted) throw new DOMException('Exploration cancelled', 'AbortError');
        const i = next++;
        const start = starts[i];
        const count = Math.min(CHUNK_SIZE, spec.candidates - start);
        const r = await exec({ template, spec, start, count, keep: k });
        results[i] = r;
        done += r.generated;
        rejected += r.rejected;
        onProgress?.({ done, total: spec.candidates, rejected });
      }
    };

    if (slots.length > 0) {
      await Promise.all(slots.map((s) => runOne((req) => s.api.runChunk(req))));
    } else {
      // Fallback: main thread, yielding between chunks to keep the UI responsive.
      await runOne(async (req) => {
        await new Promise((r) => setTimeout(r, 0));
        return runChunk(req);
      });
    }

    let pool: Candidate[] = mergePools(
      results.map((r) => r.pool),
      k,
    );
    // Nothing satisfies the constraints: show the closest candidates instead.
    if (pool.length === 0)
      pool = mergePools(
        results.map((r) => r.fallback),
        k,
      );
    return {
      candidates: selectCandidates(pool, spec),
      generated: spec.candidates,
      rejected,
      elapsedMs: performance.now() - t0,
      backend: slots.length ? this.name : 'main-thread',
      workers: slots.length || 1,
    };
  }

  dispose(): void {
    for (const s of this.slots) s.worker.terminate();
    this.slots = [];
  }
}

let shared: { size: number; backend: LocalWorkerBackend } | null = null;

/** Shared backend sized from settings (0 = auto). Recreated when the size changes. */
export function getLocalBackend(workerCount: number): LocalWorkerBackend {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  const size = workerCount > 0 ? workerCount : Math.max(1, Math.min(8, cores - 1));
  if (!shared || shared.size !== size) {
    shared?.backend.dispose();
    shared = { size, backend: new LocalWorkerBackend(size) };
  }
  return shared.backend;
}
