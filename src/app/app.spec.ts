import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AppUpdateService } from './app-update.service';

describe('App', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the first exercise, ready to start', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.name')?.textContent).toContain('Levés de bras + pointes de pieds');
    expect(el.querySelector('.hint')?.textContent).toContain('11 min 35');
  });

  it('starts the preparation countdown on play', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.label')?.textContent).toContain('Prépare-toi');
    expect(el.querySelector('.ring__seconds')?.textContent?.trim()).toBe('5');
    expect(el.querySelector('.ctrl--main')?.getAttribute('aria-label')).toBe('Pause');
  });

  it('shows the exercise animation and its accessible description during preparation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    await fixture.whenStable();

    expect(el.querySelector('app-exercise-animation svg')).toBeTruthy();
    expect(el.querySelector('.sr-only')?.textContent).toContain('Lève les deux bras');
    expect(
      el.querySelector('.ring')!.compareDocumentPosition(el.querySelector('.timer')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows a grounded, lowered squat in reduced-motion mode', async () => {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
    localStorage.setItem(
      'workout.series',
      JSON.stringify({ phase: 'exercise', index: 8, remainingMs: 30_000 }),
    );
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const torso = el.querySelector('app-exercise-animation .body')!;
    const backLeg = el.querySelectorAll('app-exercise-animation .limb--back')[3];

    expect(Number(torso.getAttribute('y1'))).toBeGreaterThan(155);
    expect(Number(backLeg.getAttribute('y2'))).toBeCloseTo(227, 0);
  });

  it('keeps both feet grounded while the squat lowers and rises', async () => {
    localStorage.setItem(
      'workout.series',
      JSON.stringify({ phase: 'exercise', index: 8, remainingMs: 30_000 }),
    );
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const callbacks = new Map<number, FrameRequestCallback>();
    let requestId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.set(++requestId, callback);
      return requestId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      callbacks.delete(id);
    });
    vi.spyOn(window.performance, 'now').mockReturnValue(0);

    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    fixture.detectChanges();

    const frame = (time: number) => {
      const scheduled = [...callbacks.values()];
      callbacks.clear();
      expect(scheduled.length).toBeGreaterThan(0);
      scheduled.forEach((callback) => callback(time));
      fixture.detectChanges();
      const torso = el.querySelector('app-exercise-animation .body')!;
      const backFoot = el.querySelectorAll('app-exercise-animation .limb--back')[3];
      const frontFoot = el.querySelectorAll('app-exercise-animation .limb--front')[3];
      expect(Number(backFoot.getAttribute('y2'))).toBeCloseTo(227, 0);
      expect(Number(frontFoot.getAttribute('y2'))).toBeCloseTo(227, 0);
      return Number(torso.getAttribute('y1'));
    };

    const descending = frame(900);
    const lowest = frame(1800);
    const ascending = frame(2700);
    expect(descending).toBeGreaterThan(145);
    expect(lowest).toBeGreaterThan(descending);
    expect(ascending).toBeLessThan(lowest);
    fixture.destroy();
  });

  it('skips to the next preparation without resuming a paused series', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.ctrl--skip')!.click();
    await fixture.whenStable();

    expect(el.querySelector('.name')?.textContent).toContain('Balancements de bras de haut en bas');
    expect(el.querySelector('.ring__seconds')?.textContent?.trim()).toBe('5');
    expect(el.querySelector('.ctrl--main')?.getAttribute('aria-label')).toBe('Play');
    expect(el.querySelector('.ctrl--skip')?.hasAttribute('disabled')).toBe(false);
    expect(Number(el.querySelector('.ring__value')?.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      Math.PI * 120,
    );
  });

  it('keeps Passer unavailable before the series starts', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLButtonElement>('.ctrl--skip')?.disabled).toBe(true);
  });

  it('hides the next exercise and shows a resting figure during recovery', async () => {
    localStorage.setItem(
      'workout.series',
      JSON.stringify({ phase: 'recovery', index: 1, remainingMs: 10_000 }),
    );
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.label')?.textContent).toContain('Récupération');
    expect(el.querySelector('.name')).toBeNull();
    expect(el.querySelector('.animation--rest')).toBeTruthy();
    expect(el.querySelector<HTMLButtonElement>('.ctrl--skip')?.disabled).toBe(true);
  });

  it('plays the finish signal when the last exercise is skipped', async () => {
    const frequencies: number[] = [];
    class FakeAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume() {
        return Promise.resolve();
      }
      createOscillator() {
        const oscillator = {
          type: '',
          frequency: { value: 0 },
          connect: (node: unknown) => node,
          start: () => frequencies.push(oscillator.frequency.value),
          stop: () => {},
        };
        return oscillator;
      }
      createGain() {
        return {
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: (node: unknown) => node,
        };
      }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    localStorage.setItem(
      'workout.series',
      JSON.stringify({ phase: 'exercise', index: 9, remainingMs: 30_000 }),
    );
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.ctrl--skip').click();
    await fixture.whenStable();

    expect(frequencies).toEqual([523, 659, 784, 1047]);
    expect(fixture.nativeElement.textContent).toContain(
      'Série terminée — un ou plusieurs exercices ont été passés',
    );
  });

  it('asks for confirmation before resetting a started series', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    await fixture.whenStable();
    el.querySelectorAll<HTMLButtonElement>('.ctrl--small')[1].click();
    await fixture.whenStable();
    expect(el.querySelector('[role="alertdialog"]')).toBeTruthy();
    el.querySelector<HTMLButtonElement>('.btn--danger')!.click();
    await fixture.whenStable();
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(el.querySelector('.label')?.textContent).toContain('Prêt');
  });

  it('reloads automatically when an update is ready while idle', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const update = TestBed.inject(AppUpdateService);
    const applyUpdate = vi.spyOn(update, 'applyUpdate').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    update.reloadNeeded.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.update')).toBeNull();
    vi.advanceTimersByTime(1_499);
    expect(applyUpdate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('waits for a running series to remain paused before reloading with its progress saved', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const update = TestBed.inject(AppUpdateService);
    const applyUpdate = vi.spyOn(update, 'applyUpdate').mockImplementation(() => {});
    const playButton = el.querySelector<HTMLButtonElement>('.ctrl--main')!;
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    playButton.click();
    fixture.detectChanges();
    update.reloadNeeded.set(true);
    fixture.detectChanges();
    vi.advanceTimersByTime(2_000);
    expect(applyUpdate).not.toHaveBeenCalled();

    playButton.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(1_000);
    playButton.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(2_000);
    expect(applyUpdate).not.toHaveBeenCalled();

    playButton.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(1_500);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('workout.series') ?? 'null')).toMatchObject({
      phase: 'preparation',
      index: 0,
      running: false,
    });
    fixture.destroy();
  });

  it('does not reload over the reset confirmation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const update = TestBed.inject(AppUpdateService);
    const applyUpdate = vi.spyOn(update, 'applyUpdate').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    fixture.detectChanges();
    update.reloadNeeded.set(true);
    fixture.detectChanges();
    el.querySelectorAll<HTMLButtonElement>('.ctrl--small')[1].click();
    fixture.detectChanges();
    vi.advanceTimersByTime(2_000);
    expect(el.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(applyUpdate).not.toHaveBeenCalled();

    el.querySelector<HTMLButtonElement>('.btn--ghost')!.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(1_500);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('lets the finish sound play before reloading a completed series', async () => {
    localStorage.setItem(
      'workout.series',
      JSON.stringify({ phase: 'exercise', index: 9, remainingMs: 30_000 }),
    );
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const update = TestBed.inject(AppUpdateService);
    const applyUpdate = vi.spyOn(update, 'applyUpdate').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    fixture.detectChanges();
    update.reloadNeeded.set(true);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.ctrl--skip')!.click();
    fixture.detectChanges();

    vi.advanceTimersByTime(1_499);
    expect(applyUpdate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('workout.series') ?? 'null')).toMatchObject({
      phase: 'finished',
      skipped: true,
    });
    fixture.destroy();
  });

  it('retries an update instead of losing progress when saving fails', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const update = TestBed.inject(AppUpdateService);
    const applyUpdate = vi.spyOn(update, 'applyUpdate').mockImplementation(() => {});
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    fixture.detectChanges();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    update.reloadNeeded.set(true);
    fixture.detectChanges();
    vi.advanceTimersByTime(1_500);
    expect(applyUpdate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'Mise à jour reportée : impossible de sauvegarder la progression.',
    );

    setItem.mockRestore();
    vi.advanceTimersByTime(60_000);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('workout.series') ?? 'null')).toMatchObject({
      phase: 'preparation',
      running: false,
    });
    fixture.destroy();
  });
});
