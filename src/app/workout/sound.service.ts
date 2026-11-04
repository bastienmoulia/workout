import { Injectable } from '@angular/core';

/** Short synthesized beeps; no audio files needed. */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private context?: AudioContext;

  /** Must be called from a user gesture so mobile browsers allow audio. */
  unlock(): Promise<void> {
    const AudioCtor = globalThis.AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!AudioCtor) return Promise.resolve();
    this.context ??= new AudioCtor();
    return this.context?.resume() ?? Promise.resolve();
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

  stretchingReminder(): void {
    this.tone(660, 0, 0.2, 0.12);
  }

  private tone(frequency: number, delay: number, duration: number, peakGain = 0.4): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}
