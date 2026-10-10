import { useMemo } from 'react';
import { evaluate } from '@/core/evaluation/evaluate';
import { useCompositionStore } from './compositionStore';
import { useViewStore } from './viewStore';

/** Live evaluation of the current composition (cheap enough for the UI thread). */
export function useEvaluation() {
  const composition = useCompositionStore((s) => s.composition);
  const preset = useViewStore((s) => s.preset);
  return useMemo(() => evaluate(composition, preset), [composition, preset]);
}
