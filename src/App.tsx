import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AiClient, type AiGateway } from './ai/client';
import { MockAiClient, type MockScenario } from './ai/mockClient';
import { MODEL_MANIFEST } from './ai/shared';
import { ScanFlow } from './scan/ScanFlow';
import type { CatReference, MatchingPolicy } from './scan/matching';
import { loadRuntimeCatalog } from './scan/referenceCatalog';
import { RELEASE_MATCHING_POLICY } from './evaluation/releasePolicy';
import { MatchingLab } from './evaluation/MatchingLab';
import { Scrapbook } from './scrapbook/Scrapbook';
import { StudioPage } from './story/StudioPage';
import { PendingPhotos } from './scrapbook/PendingPhotos';
import { BackupPanel } from './scrapbook/BackupPanel';
import { ProfilePanel } from './profile/ProfilePanel';
import { SiteNav, CREATOR_GITHUB_URL } from './navigation/SiteNav';
import { readLocalProfile, type LocalProfile } from './profile/localProfile';
import { MeowfolioRepository } from './storage/repository';

const WELCOME_KEY = 'meowfolio.welcome-complete';

declare global {
  interface Window {
    __MEOWFOLIO_E2E_REPOSITORY__?: MeowfolioRepository;
  }
}

function testCatalog(mode: string | null): CatReference[] {
  if (!mode) return [];

  const sharedSpace = {
    modelId: MODEL_MANIFEST.embedder.id,
    revision: MODEL_MANIFEST.embedder.revision,
    dtype: MODEL_MANIFEST.embedder.dtype.wasm,
    preprocessingVersion: 1,
    dimension: 384,
    pooling: 'cls-token' as const,
  };

  const matching = Array.from({ length: 384 }, (_, index) => (index === 0 ? 1 : 0));
  const different = Array.from({ length: 384 }, (_, index) => (index === 1 ? 1 : 0));

  return [
    {
      id: 'fixture-mochi',
      name: 'Mochi',
      encounterCount: 3,
      referenceEmbedding: mode === 'familiar' ? matching : different,
      embeddingSpace: sharedSpace,
    },
    {
      id: 'fixture-pepper',
      name: 'Pepper',
      encounterCount: 2,
      referenceEmbedding: different,
      embeddingSpace: sharedSpace,
    },
  ];
}

export function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const e2eEnabled = import.meta.env.VITE_E2E === '1';
  const mockScenario = e2eEnabled ? params.get('mockAi') : null;
  const catalogMode = e2eEnabled ? params.get('catalog') : null;
  const matchingLabEnabled =
    params.get('matchingLab') === '1' && (import.meta.env.DEV || e2eEnabled);

  const [repository] = useState(() => new MeowfolioRepository());
  const welcomeCameraRef = useRef<HTMLInputElement>(null);
  const homeCameraRef = useRef<HTMLInputElement>(null);
  const homeGalleryRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(readLocalProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navigation, setNavigation] = useState<{ target: 'home' | 'cats'; serial: number }>({
    target: 'home', serial: 0,
  });
  const [studioCatId, setStudioCatId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/studio\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const [ai, setAi] = useState<AiGateway | null>(null);
  const reusableAiRef = useRef<AiGateway | null>(null);
  const [scanCats, setScanCats] = useState<CatReference[]>([]);
  const scanCatUrlsRef = useRef<string[]>([]);
  const catalogRefreshVersionRef = useRef(0);
  const scanStartVersionRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [initialScanPhoto, setInitialScanPhoto] = useState<File | null>(null);
  const [initialPendingId, setInitialPendingId] = useState<string | null>(null);
  const [welcomeComplete, setWelcomeComplete] = useState(() => {
    if (e2eEnabled && params.get('skipWelcome') === '1') return true;
    try {
      return window.localStorage.getItem(WELCOME_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handlePop = () => {
      const match = window.location.pathname.match(/^\/studio\/([^/]+)\/?$/);
      setStudioCatId(match ? decodeURIComponent(match[1]) : null);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  function openStudio(catId: string) {
    window.history.pushState({ screen: 'studio', catId }, '', '/studio/' + encodeURIComponent(catId) + window.location.search);
    setStudioCatId(catId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function closeStudio() {
    // Preserve the browser Back/Forward chain rather than pushing a duplicate
    // home entry that would immediately reopen Studio on the next Back.
    if (window.history.state?.screen === 'studio') {
      window.history.back();
    } else {
      // Directly opened or restored Studio URL has no in-app predecessor.
      window.history.replaceState({ screen: 'scrapbook' }, '', '/' + window.location.search);
      setStudioCatId(null);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const fixtureCats = useMemo(() => testCatalog(catalogMode), [catalogMode]);
  const matchingPolicy: MatchingPolicy = useMemo(
    () =>
      e2eEnabled && catalogMode === 'familiar'
        ? {
            enabled: true,
            strategy: 'centroid',
            threshold: 0.9,
            minimumMargin: 0.05,
          }
        : RELEASE_MATCHING_POLICY,
    [catalogMode, e2eEnabled],
  );

  const refreshScanCats = useCallback(async () => {
    // Save, import and Scan can refresh simultaneously. Only the last
    // invocation may publish its catalog; stale loads release their Blob URLs.
    const version = ++catalogRefreshVersionRef.current;
    const replaceCatalog = (cats: CatReference[], urls: string[]) => {
      if (version !== catalogRefreshVersionRef.current) {
        for (const url of urls) URL.revokeObjectURL(url);
        return;
      }
      setScanCats(cats);
      for (const url of scanCatUrlsRef.current) URL.revokeObjectURL(url);
      scanCatUrlsRef.current = urls;
    };
    if (catalogMode) {
      replaceCatalog(fixtureCats, []);
      return;
    }

    try {
      const catalog = await loadRuntimeCatalog(repository, RELEASE_MATCHING_POLICY);
      replaceCatalog(catalog.cats, catalog.objectUrls);
    } catch {
      // Scrapbook displays the storage error; a failed latest refresh falls
      // back to manual identity without destroying a newer successful result.
      replaceCatalog([], []);
    }
  }, [catalogMode, fixtureCats, repository]);

  useEffect(() => {
    void refreshScanCats();

    if (e2eEnabled) {
      window.__MEOWFOLIO_E2E_REPOSITORY__ = repository;
    }

    return () => {
      catalogRefreshVersionRef.current += 1;
      scanStartVersionRef.current += 1;
      for (const url of scanCatUrlsRef.current) URL.revokeObjectURL(url);
      scanCatUrlsRef.current = [];
      repository.close();
      reusableAiRef.current?.dispose();
      reusableAiRef.current = null;
      delete window.__MEOWFOLIO_E2E_REPOSITORY__;
    };
  }, [e2eEnabled, refreshScanCats, repository]);

  function navigateHome(): void {
    setProfileOpen(false);
    setNavigation((current) => ({ target: 'home', serial: current.serial + 1 }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function navigateCats(): void {
    setProfileOpen(false);
    setNavigation((current) => ({ target: 'cats', serial: current.serial + 1 }));
  }

  function navigateFromStudio(target: 'home' | 'cats'): void {
    setNavigation((current) => ({ target, serial: current.serial + 1 }));
    closeStudio();
  }

  function completeWelcome(): void {
    setWelcomeComplete(true);
    try {
      window.localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      // Convenience only; inability to persist welcome state never blocks the app.
    }
  }

  async function startScan(photo: File | null = null, pendingId: string | null = null): Promise<void> {
    const version = ++scanStartVersionRef.current;
    await refreshScanCats();
    // The user may have selected a newer photo while the catalog was loading.
    if (version !== scanStartVersionRef.current) return;

    // Retain the worker/models between encounters; do not force each scan to
    // reinitialize the same large models or re-download existing assets.
    const gateway: AiGateway =
      reusableAiRef.current ??
      (mockScenario ? new MockAiClient(mockScenario as MockScenario) : new AiClient());
    reusableAiRef.current = gateway;

    setInitialScanPhoto(photo);
    setInitialPendingId(pendingId);
    setAi(gateway);
    setScanning(true);
  }

  function leaveScan(): void {
    scanStartVersionRef.current += 1;
    setScanning(false);
    setInitialScanPhoto(null);
    setInitialPendingId(null);
    setAi(null);
    // The AI worker stays alive for another scan within this page session.
    // ScanFlow invalidates outstanding requests on unmount.
  }

  function resetAiAfterTimeout(): void {
    reusableAiRef.current?.dispose();
    const gateway = mockScenario
      ? new MockAiClient(mockScenario as MockScenario)
      : new AiClient();
    reusableAiRef.current = gateway;
    setAi(gateway);
  }

  function openCameraOrScan(): void {
    if (window.matchMedia('(max-width: 760px)').matches) {
      const input = document.getElementById('home-camera') as HTMLInputElement | null;
      if (input) {
        input.click();
        return;
      }
    }
    void startScan();
  }

  function onQuickCameraPhoto(event: ChangeEvent<HTMLInputElement>): void {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!photo) return;
    completeWelcome();
    void startScan(photo);
  }

  async function afterSave(processedPendingId: string | null): Promise<void> {
    // The encounter has already been committed. A failed inbox cleanup must
    // never turn an actually successful save into a false "save failed" UI.
    if (processedPendingId) {
      try {
        await repository.deletePendingPhoto(processedPendingId);
      } catch {
        // Leave the pending photo recoverable rather than misreport success.
      }
    }
    setRefreshKey((value) => value + 1);
    await refreshScanCats().catch(() => {});
  }

  async function afterSavedForLater(): Promise<void> {
    setRefreshKey((value) => value + 1);
    leaveScan();
  }

  if (matchingLabEnabled) {
    return <MatchingLab onExit={() => window.location.assign(window.location.pathname)} />;
  }

  if (studioCatId) {
    return (
      <StudioPage
        repository={repository}
        catId={studioCatId}
        ownerName={profile?.displayName ?? null}
        onBack={closeStudio}
        onHome={() => navigateFromStudio('home')}
        onCats={() => navigateFromStudio('cats')}
      />
    );
  }

  if (!welcomeComplete) {
    return (
      <main id="main-content" tabIndex={-1} className="welcome-screen">
        <section className="pixel-window welcome-card" aria-labelledby="welcome-title">
          <div className="pixel-window-title">
            <span>♥ MEOWFOLIO.EXE</span>
            <span className="pixel-window-hint">Meowfolio</span>
          </div>

          <div className="welcome-content">
            <div className="welcome-copy">
              <p className="pixel-kicker welcome-eyebrow">✦ your pocket cat scrapbook ✦</p>
              <h1 id="welcome-title" className="pixel-heading welcome-title">
                little cats,<br />big memories<span aria-hidden="true"> ♥</span>
              </h1>
              <p className="welcome-description">
                Spot a cat? Snap a photo, give them a name, and keep every meeting in your own
                tiny scrapbook.
              </p>

              <div className="welcome-mini-sticker" aria-hidden="true">
                <span className="welcome-mini-cat">ฅ^•ﻌ•^ฅ</span>
                <span>your next memory is one tap away!</span>
                <span>✦</span>
              </div>

              <div className="welcome-actions">
                <button type="button" className="pixel-primary welcome-camera-button"
                  onClick={() => welcomeCameraRef.current?.click()}>
                  <span aria-hidden="true">📷</span> Open camera
                </button>
                <input
                  ref={welcomeCameraRef}
                  id="welcome-camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onQuickCameraPhoto}
                />
                <button type="button" className="pixel-secondary welcome-browse-button" onClick={completeWelcome}>
                  Open my scrapbook
                </button>
              </div>

              <details className="welcome-privacy">
                <summary>♡ Privacy &amp; local AI</summary>
                <p>
                  No account and no hosted photo inference. Your saved cats stay in this
                  browser. If models are missing, we'll ask before downloading them.
                </p>
              </details>
            </div>

            <aside className="welcome-art" aria-hidden="true">
              <div className="welcome-art-stars">★ ✦ ♡ ★</div>
              <div className="welcome-art-card">
                <span className="welcome-art-tag">CAT_001.JPG</span>
                <div className="welcome-art-cat">ฅ^•ﻌ•^ฅ</div>
                <div className="welcome-art-name">mochi ♡</div>
                <p>a little friend, remembered forever.</p>
              </div>
              <div className="welcome-art-caption">cute encounters.zip ✿</div>
            </aside>
          </div>
          <div className="welcome-footer">Photos and memories stay in this browser.</div>
        </section>
      </main>
    );
  }

  if (scanning && ai) {
    return (
      <ScanFlow
        initialPhoto={initialScanPhoto}
        initialPendingId={initialPendingId}
        ai={ai}
        repository={repository}
        cats={catalogMode ? fixtureCats : scanCats}
        matchingPolicy={matchingPolicy}
        onSaved={afterSave}
        onSavedForLater={afterSavedForLater}
        onResetAi={resetAiAfterTimeout}
        onExit={leaveScan}
      />
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="home-page mx-auto min-h-screen max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8 sm:py-9">
      <header className="pixel-window home-header">
        <div className="pixel-window-title meow-header-titlebar">
          <span className="meow-titlebar-id">
            <span className="meow-titlebar-full">♥ MEOWFOLIO.HTML</span>
            <span className="meow-titlebar-mini" aria-hidden="true">♥</span>
          </span>
          <SiteNav onHome={navigateHome} onCats={navigateCats}
            onAddCat={() => void startScan()} current={navigation.target} />
        </div>
        <div className="home-header-body flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="home-desktop-brand">
            <p className="pixel-kicker">personal neighborhood cat scrapbook</p>
            <h1 className="pixel-heading mt-1 text-2xl">meowfolio // local save file</h1>
            <button type="button" className="profile-shortcut mt-3" onClick={() => setProfileOpen((value) => !value)}>
              {profile ? profile.avatar + '  ' + profile.displayName + ' · edit my space' : '♡ Create my local profile'}
            </button>
          </div>
          <div className="home-mobile-brand">
            <p className="pixel-kicker">✦ your neighborhood cat diary</p>
            <h1 className="pixel-heading">meowfolio<span className="home-brand-heart"> ♥</span></h1>
            <p>tiny encounters, forever remembered.</p>
            <button type="button" className="profile-shortcut mt-2" onClick={() => setProfileOpen((value) => !value)}>
              {profile ? profile.avatar + '  ' + profile.displayName + ' · edit' : '♡ Create my space'}
            </button>
          </div>
          <div className="home-capture-actions">
            <button type="button" className="pixel-primary welcome-camera-button"
              onClick={() => homeCameraRef.current?.click()}>
              <span aria-hidden="true">📷</span>
              <span className="home-action-desktop">Quick camera</span>
              <span className="home-action-mobile">Camera</span>
            </button>
            <input
              ref={homeCameraRef}
              id="home-camera"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onQuickCameraPhoto}
            />
            <button type="button" className="pixel-secondary home-desktop-spot" onClick={() => void startScan()}>
              <span className="home-action-desktop">Spot a cat</span>
            </button>
            <button type="button" className="pixel-secondary home-mobile-gallery"
              onClick={() => homeGalleryRef.current?.click()}>
              <span className="home-action-mobile">Add photo</span>
            </button>
            <input
              ref={homeGalleryRef}
              id="home-gallery"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onQuickCameraPhoto}
            />
          </div>
        </div>
      </header>

      {profileOpen && (
        <ProfilePanel profile={profile} onSaved={setProfile} onClose={() => setProfileOpen(false)} />
      )}
      <PendingPhotos
        repository={repository}
        refreshKey={refreshKey}
        onProcess={(photo, id) => void startScan(photo, id)}
      />
      <Scrapbook
        repository={repository}
        refreshKey={refreshKey}
        onSpotCat={openCameraOrScan}
        ownerName={profile?.displayName ?? null}
        onCreateStory={openStudio}
        navigation={navigation}
      />

      <BackupPanel
        repository={repository}
        onImported={() => {
          setRefreshKey((value) => value + 1);
          void refreshScanCats();
        }}
      />

      <footer className="mt-9 border-t-2 border-dashed border-[#b7588b] py-5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#82405f]">
        <span className="meow-footer-copy">Your cats and memories are saved in this browser. No cloud account required.</span>
        <span className="meow-footer-credit">
          Made with ♡ by <a href={CREATOR_GITHUB_URL} target="_blank" rel="noopener noreferrer">@ThunderKhan ↗</a>
        </span>
      </footer>
    </main>
  );
}
