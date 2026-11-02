import { Injectable } from '@angular/core';

/** Short synthesized beeps; no audio files needed. */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private context?: AudioContext;

  /** Must be called from a user gesture so mobile browsers allow audio. */
  unlock(): void {
    const AudioCtor = globalThis.AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!AudioCtor) return;
    this.context ??= new AudioCtor();
    void this.context?.resume();
  }

  countdown(): void {
    this.tone(880, 0, 0.12);
  }

  go(): void {
    this.tone(1320, 0, 0.35);
  }

  finished(): void {
    [523, 659, 784, 1047].forEach((freq, i) => this.tone(freq, i * 0.16, i === 3 ? 0.6 : 0.16));
  }

  private tone(frequency: number, delay: number, duration: number): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}
