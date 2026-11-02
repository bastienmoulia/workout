import { Injectable } from '@angular/core';

/** Keeps the screen awake while the series is playing, when the browser supports it. */
@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private sentinel?: WakeLockSentinel;
  private wanted = false;

  async keepAwake(): Promise<void> {
    this.wanted = true;
    if (this.sentinel || !('wakeLock' in navigator)) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.wanted) {
        await sentinel.release();
        return;
      }
      this.sentinel = sentinel;
      sentinel.addEventListener('release', () => (this.sentinel = undefined));
    } catch {
      // Not allowed (battery saver, hidden page...): the timer still works.
    }
  }

  async allowSleep(): Promise<void> {
    this.wanted = false;
    const sentinel = this.sentinel;
    this.sentinel = undefined;
    await sentinel?.release().catch(() => undefined);
  }
}
