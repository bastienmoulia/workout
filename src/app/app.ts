import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  PROGRAM,
  SERIES_TOTAL_MS,
  EXERCISE_MS,
  PREPARATION_MS,
  RECOVERY_MS,
} from './workout/program';
import {
  SeriesEvent,
  SeriesState,
  canSkipExercise,
  hasStarted,
  pause,
  phaseDuration,
  resetExercise,
  resetSeries,
  skipExercise as skipSeriesExercise,
  tick,
  togglePlay,
} from './workout/series';
import { ExerciseAnimation } from './workout/exercise-animation';
import { gestureFor } from './workout/gestures';
import { SoundService } from './workout/sound.service';
import { StorageService } from './workout/storage.service';
import { WakeLockService } from './workout/wake-lock.service';

const TICK_MS = 100;
const RING_RADIUS = 120;

@Component({
  selector: 'app-root',
  imports: [ExerciseAnimation],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '[class]': '"phase-" + state().phase' },
})
export class App {
  private readonly sound = inject(SoundService);
  private readonly storage = inject(StorageService);
  private readonly wakeLock = inject(WakeLockService);
  private readonly document = inject(DOCUMENT);

  protected readonly program = PROGRAM;
  protected readonly ringCircumference = 2 * Math.PI * RING_RADIUS;
  protected readonly ringRadius = RING_RADIUS;
  protected readonly confetti = Array.from({ length: 28 }, (_, i) => i);

  protected readonly state = signal<SeriesState>(this.storage.loadSeries());
  protected readonly soundEnabled = signal(this.storage.loadSoundEnabled());
  protected readonly confirmingReset = signal(false);

  protected readonly exercise = computed(() => PROGRAM[this.state().index]);
  protected readonly seconds = computed(() => Math.ceil(this.state().remainingMs / 1000));
  protected readonly ringOffset = computed(() => {
    const { phase, remainingMs } = this.state();
    const duration = phaseDuration(phase);
    const done = duration === 0 ? 1 : 1 - remainingMs / duration;
    return this.ringCircumference * done;
  });
  protected readonly totalLabel = formatDuration(SERIES_TOTAL_MS);
  protected readonly gesture = computed(() => gestureFor(this.exercise().name));
  protected readonly canSkip = computed(() => canSkipExercise(this.state()));

  constructor() {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      const current = this.state();
      if (!current.running) return;
      const result = tick(current, elapsed);
      this.state.set(result.state);
      this.play(result.events);
    }, TICK_MS);

    const onVisibility = () => {
      if (this.document.visibilityState === 'hidden') this.state.update(pause);
    };
    this.document.addEventListener('visibilitychange', onVisibility);

    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.document.removeEventListener('visibilitychange', onVisibility);
      void this.wakeLock.allowSleep();
    });

    effect(() => this.storage.saveSeries(this.state()));
    effect(() => this.storage.saveSoundEnabled(this.soundEnabled()));
    effect(() => {
      const running = this.state().running;
      untracked(() => (running ? this.wakeLock.keepAwake() : this.wakeLock.allowSleep()));
    });
  }

  protected togglePlay(): void {
    void this.sound.unlock();
    if (this.state().phase === 'finished') {
      this.state.set(resetSeries());
    }
    this.state.update(togglePlay);
  }

  protected resetExercise(): void {
    this.state.update(resetExercise);
  }

  protected skipExercise(): void {
    const previous = this.state();
    const next = skipSeriesExercise(previous);
    this.state.set(next);
    if (previous.phase !== 'finished' && next.phase === 'finished' && this.soundEnabled()) {
      void this.sound
        .unlock()
        .then(() => this.play([{ type: 'finished' }]))
        .catch((error) => console.error('Impossible de jouer le signal de fin.', error));
    }
  }

  protected askResetSeries(): void {
    const { phase } = this.state();
    if (hasStarted(this.state()) && phase !== 'finished') {
      this.state.update(pause);
      this.confirmingReset.set(true);
    } else {
      this.state.set(resetSeries());
    }
  }

  protected confirmResetSeries(confirmed: boolean): void {
    this.confirmingReset.set(false);
    if (confirmed) this.state.set(resetSeries());
  }

  protected toggleSound(): void {
    void this.sound.unlock();
    this.soundEnabled.update((enabled) => !enabled);
  }

  private play(events: SeriesEvent[]): void {
    if (!this.soundEnabled()) return;
    for (const event of events) {
      if (event.type === 'countdown') this.sound.countdown();
      else if (event.type === 'finished') this.sound.finished();
      else if (event.phase !== 'transition-preparation') this.sound.go();
    }
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes} min ${String(seconds).padStart(2, '0')}` : `${minutes} min`;
}
