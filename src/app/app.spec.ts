import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
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
