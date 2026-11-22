import { EXERCISE_MS, PREPARATION_MS, PROGRAM, RECOVERY_MS, SERIES_TOTAL_MS } from './program';
import {
  INITIAL_STATE,
  SeriesState,
  canGoBack,
  hasStarted,
  goBack,
  pause,
  play,
  resetSeries,
  restore,
  skipExercise,
  tick,
  togglePlay,
} from './series';

const running = (patch: Partial<SeriesState>): SeriesState => ({
  ...INITIAL_STATE,
  running: true,
  ...patch,
});

describe('series', () => {
  it('lasts 11 min 35 including preparation', () => {
    expect(PROGRAM.length).toBe(10);
    expect(SERIES_TOTAL_MS).toBe((11 * 60 + 35) * 1000);
  });

  it('starts with a 5 second preparation on play', () => {
    expect(play(INITIAL_STATE)).toEqual({
      phase: 'preparation',
      index: 0,
      remainingMs: PREPARATION_MS,
      running: true,
      skipped: false,
    });
  });

  it('pauses and resumes exactly where it was', () => {
    const paused = pause(running({ phase: 'recovery', index: 3, remainingMs: 8200 }));
    expect(paused).toEqual({
      phase: 'recovery',
      index: 3,
      remainingMs: 8200,
      running: false,
      skipped: false,
    });
    expect(tick(paused, 1000).state).toBe(paused);
    expect(togglePlay(paused)).toEqual({ ...paused, running: true });
  });

  it('chains preparation, exercises and recoveries, without a final recovery', () => {
    let state = play(INITIAL_STATE);
    state = tick(state, PREPARATION_MS).state;
    expect(state).toMatchObject({ phase: 'exercise', index: 0, remainingMs: EXERCISE_MS });
    state = tick(state, EXERCISE_MS).state;
    expect(state).toMatchObject({ phase: 'recovery', index: 1, remainingMs: RECOVERY_MS });
    state = tick(state, RECOVERY_MS / 2).state;
    expect(state).toMatchObject({
      phase: 'transition-preparation',
      index: 1,
      remainingMs: PREPARATION_MS,
    });
    state = tick(state, RECOVERY_MS / 2).state;
    expect(state).toMatchObject({ phase: 'exercise', index: 1, remainingMs: EXERCISE_MS });

    const last = running({ phase: 'exercise', index: PROGRAM.length - 1, remainingMs: 500 });
    const { state: end, events } = tick(last, 500);
    expect(end).toMatchObject({ phase: 'finished', running: false });
    expect(events).toContainEqual({ type: 'finished' });
  });

  it('completes the whole series in exactly the total duration', () => {
    let state = play(INITIAL_STATE);
    state = tick(state, SERIES_TOTAL_MS - 1).state;
    expect(state.phase).toBe('exercise');
    state = tick(state, 1).state;
    expect(state.phase).toBe('finished');
  });

  it('emits countdown beeps for the last 3 seconds of each interval', () => {
    const state = running({ phase: 'recovery', index: 2, remainingMs: RECOVERY_MS });
    const { events } = tick(state, RECOVERY_MS);
    expect(events).toEqual([
      { type: 'phase', phase: 'transition-preparation' },
      { type: 'countdown', second: 3 },
      { type: 'countdown', second: 2 },
      { type: 'countdown', second: 1 },
      { type: 'phase', phase: 'exercise' },
    ]);
    expect(tick(running({ phase: 'exercise', remainingMs: 10_000 }), 3000).events).toEqual([]);
  });

  it('returns to the current exercise preparation when stepping back during an exercise', () => {
    const state = running({ phase: 'exercise', index: 4, remainingMs: 12_000 });
    expect(goBack(state)).toEqual({
      ...state,
      phase: 'preparation',
      remainingMs: PREPARATION_MS,
      running: false,
    });
  });

  it('returns to the preceding exercise preparation from later preparations and recovery', () => {
    for (const phase of ['preparation', 'recovery', 'transition-preparation'] as const) {
      expect(goBack(running({ phase, index: 4, remainingMs: 2_500 }))).toMatchObject({
        phase: 'preparation',
        index: 3,
        remainingMs: PREPARATION_MS,
        running: false,
      });
    }
  });

  it('disables stepping back when there is no previous exercise', () => {
    expect(canGoBack(INITIAL_STATE)).toBe(false);
    expect(canGoBack({ ...INITIAL_STATE, phase: 'preparation' })).toBe(false);
    expect(goBack({ ...INITIAL_STATE, phase: 'preparation' })).toMatchObject({
      phase: 'preparation',
      index: 0,
    });
    expect(canGoBack({ ...INITIAL_STATE, phase: 'exercise' })).toBe(true);
    expect(canGoBack({ ...INITIAL_STATE, phase: 'finished' })).toBe(false);
  });

  it('keeps the ten-second transition ring continuous at its midpoint', () => {
    const state = running({ phase: 'recovery', index: 1, remainingMs: RECOVERY_MS });
    const halfway = tick(state, RECOVERY_MS / 2).state;
    expect(halfway.phase).toBe('transition-preparation');
    expect(halfway.remainingMs).toBe(5000);
    expect(halfway.remainingMs / RECOVERY_MS).toBe(0.5);
  });

  it('skips to the next exercise preparation without changing the running state', () => {
    const playing = skipExercise(running({ phase: 'exercise', index: 2, remainingMs: 12_000 }));
    expect(playing).toMatchObject({
      phase: 'transition-preparation',
      index: 3,
      remainingMs: 5000,
      running: true,
      skipped: true,
    });

    const paused = skipExercise({ ...playing, running: false });
    expect(paused).toMatchObject({ phase: 'transition-preparation', running: false });
  });

  it('finishes immediately when skipping the final exercise', () => {
    expect(
      skipExercise(running({ phase: 'exercise', index: PROGRAM.length - 1, remainingMs: 12_000 })),
    ).toMatchObject({ phase: 'finished', remainingMs: 0, running: false, skipped: true });
  });

  it('does not skip when the next exercise is hidden during recovery', () => {
    const state = running({ phase: 'recovery', index: 3, remainingMs: RECOVERY_MS });
    expect(skipExercise(state)).toBe(state);
  });

  it('restores legacy progress and preserves whether an exercise was skipped', () => {
    expect(restore({ phase: 'exercise', index: 2, remainingMs: 30_000 })).toMatchObject({
      phase: 'exercise',
      index: 2,
      remainingMs: 30_000,
      skipped: false,
    });
    expect(
      restore({ phase: 'transition-preparation', index: 2, remainingMs: 2500, skipped: true }),
    ).toMatchObject({ phase: 'transition-preparation', remainingMs: 2500, skipped: true });
    expect(restore({ phase: 'recovery', index: 2, remainingMs: 2500 })).toMatchObject({
      phase: 'transition-preparation',
      remainingMs: 2500,
    });
  });

  it('resets the whole series to the start, stopped', () => {
    const state = running({ phase: 'exercise', index: 7, remainingMs: 1000 });
    expect(hasStarted(state)).toBe(true);
    expect(resetSeries()).toEqual(INITIAL_STATE);
    expect(hasStarted(resetSeries())).toBe(false);
  });

  it('restores a saved series paused, and rejects invalid data', () => {
    expect(restore({ phase: 'exercise', index: 2, remainingMs: 30_000, running: true })).toEqual({
      phase: 'exercise',
      index: 2,
      remainingMs: 30_000,
      running: false,
      skipped: false,
    });
    expect(restore(null)).toEqual(INITIAL_STATE);
    expect(restore({ phase: 'exercise', index: 42, remainingMs: 1 })).toEqual(INITIAL_STATE);
    expect(restore({ phase: 'recovery', index: 1, remainingMs: 99_999 })).toEqual(INITIAL_STATE);
    expect(restore({ phase: 'transition-preparation', index: 2, remainingMs: 8000 })).toEqual(
      INITIAL_STATE,
    );
    expect(restore({ phase: 'recovery', index: 0, remainingMs: 8000 })).toEqual(INITIAL_STATE);
    expect(restore({ phase: 'exercise', index: 2, remainingMs: NaN })).toEqual(INITIAL_STATE);
  });
});
