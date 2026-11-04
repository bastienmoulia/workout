import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  let versionUpdates: Subject<VersionEvent>;
  let swUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<unknown>;
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

  it('flags a downloaded version and reloads into it on demand', async () => {
    const service = TestBed.inject(AppUpdateService);
    expect(service.updateReady()).toBe(false);

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    expect(service.updateReady()).toBe(true);

    await service.applyUpdate();
    expect(swUpdate.activateUpdate).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });

  it('does nothing when the service worker is disabled', () => {
    swUpdate.isEnabled = false;
    TestBed.inject(AppUpdateService);
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });
});
