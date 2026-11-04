import { Injectable } from '@angular/core';
import { SeriesState, restore } from './series';

const SERIES_KEY = 'workout.series';

/** Saves progress on this device only. */
@Injectable({ providedIn: 'root' })
export class StorageService {
  loadSeries(): SeriesState {
    try {
      return restore(JSON.parse(localStorage.getItem(SERIES_KEY) ?? 'null'));
    } catch {
      return restore(null);
    }
  }

  saveSeries(state: SeriesState): void {
    this.write(SERIES_KEY, JSON.stringify(state));
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or full storage: progress just won't survive a reload.
    }
  }
}
