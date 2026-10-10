/** Runtime capability detection (used by Settings and the compute layer). */
export interface Capabilities {
  cores: number;
  workers: boolean;
  offscreenCanvas: boolean;
  webgpu: boolean;
  webgl2: boolean;
  sharedArrayBuffer: boolean;
}

export function detectCapabilities(): Capabilities {
  let webgl2: boolean;
  try {
    webgl2 = !!document.createElement('canvas').getContext('webgl2');
  } catch {
    webgl2 = false;
  }
  return {
    cores: navigator.hardwareConcurrency || 1,
    workers: typeof Worker !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    webgpu: 'gpu' in navigator,
    webgl2,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined' && globalThis.crossOriginIsolated === true,
  };
}

/** Whether a WebGPU adapter can actually be obtained (async, may be false even if `navigator.gpu` exists). */
export async function probeWebGpu(): Promise<string | null> {
  const gpu = (
    navigator as Navigator & {
      gpu?: {
        requestAdapter(): Promise<{
          info?: { vendor?: string; architecture?: string };
        } | null>;
      };
    }
  ).gpu;
  if (!gpu) return null;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return null;
    const info = adapter.info;
    return [info?.vendor, info?.architecture].filter(Boolean).join(' ') || 'available';
  } catch {
    return null;
  }
}
