/// <reference lib="webworker" />
import { expose } from 'comlink';
import { runChunk, type ChunkRequest } from '@/core/exploration/explore';

const api = {
  runChunk: (req: ChunkRequest) => runChunk(req),
};
export type ExploreWorkerApi = typeof api;

expose(api);
