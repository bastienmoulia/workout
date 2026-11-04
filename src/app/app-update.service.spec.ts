import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  let versionUpdates: Subject<VersionEvent>;
  let swUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<UnrecoverableStateEvent>;
    checkForUpdate: ReturnType<typeof vi.fn>;
    activateUpdate: ReturnType<typeof vi.fn>;
  };
  let reload: ReturnType<typeof vi.fn>;
  let visibility: DocumentVisibilityState;

  beforeEach(() => {
    versionUpdates = new Subject();
    swUpdate = {
      isEnabled: true,
      versionUpdates,
      unrecoverable: new Subject(),
      checkForUpdate: vi.fn().mockResolvedValue(false),
      activateUpdate: vi.fn().mockResolvedValue(true),
    };
    reload = vi.fn();
    visibility = 'visible';
    const realDocument = document;
    const fakeDocument = Object.create(realDocument, {
      visibilityState: { get: () => visibility },
      location: { value: { reload } },
      addEventListener: { value: realDocument.addEventListener.bind(realDocument) },
      removeEventListener: { value: realDocument.removeEventListener.bind(realDocument) },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        { provide: DOCUMENT, useValue: fakeDocument },
      ],
    });
  });

  it('checks for an update on start and when the app comes back to the foreground', () => {
    TestBed.inject(AppUpdateService);
    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);

    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('requests a reload for a downloaded version without activating it in the current page', () => {
    const service = TestBed.inject(AppUpdateService);
    expect(service.reloadNeeded()).toBe(false);

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(service.reloadNeeded()).toBe(false);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    expect(service.reloadNeeded()).toBe(true);

    service.applyUpdate();
    service.applyUpdate();
    expect(swUpdate.activateUpdate).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('requests a reload when an explicit check finds an update', async () => {
    swUpdate.checkForUpdate.mockResolvedValue(true);
    const service = TestBed.inject(AppUpdateService);

    await vi.waitFor(() => expect(service.reloadNeeded()).toBe(true));
  });

  it('reports a failed update check without requesting a reload', async () => {
    const error = new Error('Offline');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    swUpdate.checkForUpdate.mockRejectedValue(error);
    const service = TestBed.inject(AppUpdateService);

    await vi.waitFor(() =>
      expect(log).toHaveBeenCalledWith('Impossible de vérifier les mises à jour.', error),
    );
    expect(service.reloadNeeded()).toBe(false);
    log.mockRestore();
  });

  it('reports an installation failure without requesting a reload', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = TestBed.inject(AppUpdateService);

    versionUpdates.next({
      type: 'VERSION_INSTALLATION_FAILED',
      version: { hash: 'b' },
      error: 'Download failed',
    });

    expect(service.reloadNeeded()).toBe(false);
    expect(log).toHaveBeenCalledWith(
      'Impossible de télécharger la mise à jour.',
      'Download failed',
    );
    log.mockRestore();
  });

  it('requests a safe reload when the current version is unrecoverable', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = TestBed.inject(AppUpdateService);

    swUpdate.unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'Missing resource' });

    expect(service.reloadNeeded()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'La version actuelle ne peut pas être récupérée.',
      'Missing resource',
    );
    log.mockRestore();
  });

  it('does nothing when the service worker is disabled', () => {
    swUpdate.isEnabled = false;
    TestBed.inject(AppUpdateService);
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });
});
