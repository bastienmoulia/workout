import { EXERCISE_MS, PREPARATION_MS, PROGRAM, RECOVERY_MS } from './program';

export type Phase = 'idle' | 'preparation' | 'exercise' | 'recovery' | 'finished';

export interface SeriesState {
  readonly phase: Phase;
  /** Exercise in progress, or the upcoming one during preparation and recovery. */
  readonly index: number;
  readonly remainingMs: number;
  readonly running: boolean;
}

export type SeriesEvent =
  | { readonly type: 'countdown'; readonly second: number }
  | { readonly type: 'phase'; readonly phase: Phase }
  | { readonly type: 'finished' };

export const INITIAL_STATE: SeriesState = {
  phase: 'idle',
  index: 0,
  remainingMs: PREPARATION_MS,
  running: false,
};

const COUNTDOWN_SECONDS = 3;

export function phaseDuration(phase: Phase): number {
  switch (phase) {
    case 'idle':
    case 'preparation':
      return PREPARATION_MS;
    case 'exercise':
      return EXERCISE_MS;
    case 'recovery':
      return RECOVERY_MS;
    case 'finished':
      return 0;
  }
}

export function play(state: SeriesState): SeriesState {
  switch (state.phase) {
    case 'finished':
      return state;
    case 'idle':
      return { phase: 'preparation', index: 0, remainingMs: PREPARATION_MS, running: true };
    default:
      return { ...state, running: true };
  }
}

export function pause(state: SeriesState): SeriesState {
  return state.running ? { ...state, running: false } : state;
}

export function togglePlay(state: SeriesState): SeriesState {
  return state.running ? pause(state) : play(state);
}

export function resetExercise(state: SeriesState): SeriesState {
  switch (state.phase) {
    case 'exercise':
      return { ...state, remainingMs: EXERCISE_MS, running: false };
    case 'recovery':
      return { phase: 'exercise', index: state.index - 1, remainingMs: EXERCISE_MS, running: false };
    case 'preparation':
      return { ...state, remainingMs: PREPARATION_MS, running: false };
    default:
      return state;
  }
}

export function resetSeries(): SeriesState {
  return INITIAL_STATE;
}

export function hasStarted(state: SeriesState): boolean {
  return state.phase !== 'idle';
}

function next(state: SeriesState): SeriesState {
  switch (state.phase) {
    case 'preparation':
      return { ...state, phase: 'exercise', remainingMs: EXERCISE_MS };
    case 'exercise':
      return state.index >= PROGRAM.length - 1
        ? { ...state, phase: 'finished', remainingMs: 0, running: false }
        : { ...state, phase: 'recovery', index: state.index + 1, remainingMs: RECOVERY_MS };
    case 'recovery':
      return { ...state, phase: 'exercise', remainingMs: EXERCISE_MS };
    default:
      return state;
  }
}

/** Advances a running series by `elapsedMs`, crossing as many intervals as needed. */
export function tick(
  state: SeriesState,
  elapsedMs: number,
): { state: SeriesState; events: SeriesEvent[] } {
  const events: SeriesEvent[] = [];
  if (!state.running || elapsedMs <= 0) return { state, events };

  let current = state;
  let budget = elapsedMs;
  while (current.running && budget > 0) {
    const consumed = Math.min(budget, current.remainingMs);
    const before = Math.ceil(current.remainingMs / 1000);
    const remainingMs = current.remainingMs - consumed;
    const after = Math.ceil(remainingMs / 1000);
    for (let s = Math.min(before - 1, COUNTDOWN_SECONDS); s >= Math.max(after, 1); s--) {
      events.push({ type: 'countdown', second: s });
    }
    budget -= consumed;
    current = { ...current, remainingMs };

    if (remainingMs <= 0) {
      current = next(current);
      events.push(
        current.phase === 'finished'
          ? { type: 'finished' }
          : { type: 'phase', phase: current.phase },
      );
    }
  }
  return { state: current, events };
}

/** Restores a persisted series, always paused. Falls back to the initial state on invalid data. */
export function restore(raw: unknown): SeriesState {
  if (typeof raw !== 'object' || raw === null) return INITIAL_STATE;
  const { phase, index, remainingMs } = raw as Record<string, unknown>;
  const phases: readonly Phase[] = ['idle', 'preparation', 'exercise', 'recovery', 'finished'];
  if (
    !phases.includes(phase as Phase) ||
    typeof index !== 'number' ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= PROGRAM.length ||
    typeof remainingMs !== 'number' ||
    remainingMs < 0 ||
    remainingMs > phaseDuration(phase as Phase)
  ) {
    return INITIAL_STATE;
  }
  return { phase: phase as Phase, index, remainingMs, running: false };
}
