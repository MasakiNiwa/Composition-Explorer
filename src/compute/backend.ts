/**
 * Compute backends. The UI talks to a ComputeBackend so the exploration engine
 * can run in local Web Workers today and on a Google Colab kernel (Python /
 * GPU) in the future without UI changes.
 */
import type { Candidate } from '@/core/exploration/explore';
import type { ExplorationSpec } from '@/core/exploration/spec';
import type { Composition } from '@/core/model/composition';

export interface ExploreProgress {
  done: number;
  total: number;
  rejected: number;
}

export interface ExploreResult {
  candidates: Candidate[];
  generated: number;
  rejected: number;
  elapsedMs: number;
  backend: string;
  workers: number;
}

export interface ComputeBackend {
  readonly name: string;
  explore(
    template: Composition,
    spec: ExplorationSpec,
    onProgress?: (p: ExploreProgress) => void,
    signal?: AbortSignal,
  ): Promise<ExploreResult>;
  dispose?(): void;
}
