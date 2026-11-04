import { Injectable } from '@angular/core';
import { SeriesState, restore } from './series';

const SERIES_KEY = 'workout.series';
const SOUND_KEY = 'workout.sound';

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

  saveSeries(state: SeriesState): boolean {
    return this.write(SERIES_KEY, JSON.stringify(state));
  }

  loadSoundEnabled(): boolean {
    try {
      return localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      return true;
    }
  }

  saveSoundEnabled(enabled: boolean): void {
    this.write(SOUND_KEY, enabled ? 'on' : 'off');
  }

  private write(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}
