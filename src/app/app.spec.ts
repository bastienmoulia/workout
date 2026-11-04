import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
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
});
