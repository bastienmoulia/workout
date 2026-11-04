import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Detects new deployed versions of the PWA. An installed iOS PWA is resumed rather than
 * reloaded, so the service worker's navigation-time check rarely runs: check again
 * whenever the app comes back to the foreground.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);

  readonly updateReady = signal(false);

  constructor() {
    const sw = this.swUpdate;
    if (!sw?.isEnabled) return;

    const subscription = sw.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.updateReady.set(true);
    });
    const unrecoverable = sw.unrecoverable.subscribe(() => this.reload());

    const onVisibility = () => {
      if (this.document.visibilityState === 'visible') this.check();
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
    this.check();

    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      unrecoverable.unsubscribe();
      this.document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(timer);
    });
  }

  async applyUpdate(): Promise<void> {
    try {
      await this.swUpdate?.activateUpdate();
    } finally {
      this.reload();
    }
  }

  private check(): void {
    this.swUpdate
      ?.checkForUpdate()
      .catch((error) => console.error('Impossible de vérifier les mises à jour.', error));
  }

  private reload(): void {
    this.document.location.reload();
  }
}
