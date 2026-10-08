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
import { PendingPhotos } from './scrapbook/PendingPhotos';
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
  const [ai, setAi] = useState<AiGateway | null>(null);
  const reusableAiRef = useRef<AiGateway | null>(null);
  const [scanCats, setScanCats] = useState<CatReference[]>([]);
  const scanCatUrlsRef = useRef<string[]>([]);
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
    if (catalogMode) {
      setScanCats(fixtureCats);
      for (const url of scanCatUrlsRef.current) URL.revokeObjectURL(url);
      scanCatUrlsRef.current = [];
      return;
    }

    try {
      const catalog = await loadRuntimeCatalog(repository, RELEASE_MATCHING_POLICY);
      setScanCats(catalog.cats);
      for (const url of scanCatUrlsRef.current) URL.revokeObjectURL(url);
      scanCatUrlsRef.current = catalog.objectUrls;
    } catch {
      // Scrapbook rendering owns the visible read-error state. A failed reference
      // refresh simply leaves manual identity with no preloaded saved-cat choices.
      setScanCats([]);
      for (const url of scanCatUrlsRef.current) URL.revokeObjectURL(url);
      scanCatUrlsRef.current = [];
    }
  }, [catalogMode, fixtureCats, repository]);

  useEffect(() => {
    void refreshScanCats();

    if (e2eEnabled) {
      window.__MEOWFOLIO_E2E_REPOSITORY__ = repository;
    }

    return () => {
      for (const url of scanCatUrlsRef.current) URL.revokeObjectURL(url);
      scanCatUrlsRef.current = [];
      repository.close();
      reusableAiRef.current?.dispose();
      reusableAiRef.current = null;
      delete window.__MEOWFOLIO_E2E_REPOSITORY__;
    };
  }, [e2eEnabled, refreshScanCats, repository]);

  function completeWelcome(): void {
    setWelcomeComplete(true);
    try {
      window.localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      // Convenience only; inability to persist welcome state never blocks the app.
    }
  }

  async function startScan(photo: File | null = null, pendingId: string | null = null): Promise<void> {
    await refreshScanCats();

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
    setScanning(false);
    setInitialScanPhoto(null);
    setInitialPendingId(null);
    setAi(null);
    // The AI worker stays alive for another scan within this page session.
    // ScanFlow invalidates outstanding requests on unmount.
  }

  function onQuickCameraPhoto(event: ChangeEvent<HTMLInputElement>): void {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!photo) return;
    completeWelcome();
    void startScan(photo);
  }

  async function afterSave(): Promise<void> {
    if (initialPendingId) {
      await repository.deletePendingPhoto(initialPendingId);
    }
    setRefreshKey((value) => value + 1);
    await refreshScanCats();
  }

  async function afterSavedForLater(): Promise<void> {
    setRefreshKey((value) => value + 1);
    leaveScan();
  }

  if (matchingLabEnabled) {
    return <MatchingLab onExit={() => window.location.assign(window.location.pathname)} />;
  }

  if (!welcomeComplete) {
    return (
      <main className="welcome-screen">
        <section className="pixel-window welcome-card" aria-labelledby="welcome-title">
          <div className="pixel-window-title">
            <span>♥ MEOWFOLIO.EXE</span>
            <span aria-hidden="true">_ □ ×</span>
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
                <label htmlFor="welcome-camera" className="pixel-primary welcome-camera-button">
                  <span aria-hidden="true">📷</span> Open camera
                </label>
                <input
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
          <div className="welcome-footer" aria-hidden="true">♥ local-first · made for spontaneous cat sightings ♥</div>
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
        onExit={leaveScan}
      />
    );
  }

  return (
    <main className="home-page mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <header className="pixel-window home-header">
        <div className="pixel-window-title">
          <span>♥ MEOWFOLIO.HTML</span>
          <span aria-hidden="true">_ □ ×</span>
        </div>
        <div className="home-header-body flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="home-desktop-brand">
            <p className="pixel-kicker">personal neighborhood cat scrapbook</p>
            <p className="pixel-heading mt-1 text-2xl">meowfolio // local save file</p>
          </div>
          <div className="home-mobile-brand">
            <p className="pixel-kicker">✦ your neighborhood cat diary</p>
            <p className="pixel-heading">meowfolio<span className="home-brand-heart"> ♥</span></p>
            <p>tiny encounters, forever remembered.</p>
          </div>
          <div className="home-capture-actions">
            <label htmlFor="home-camera" className="pixel-primary welcome-camera-button">
              <span aria-hidden="true">📷</span>
              <span className="home-action-desktop">Quick camera</span>
              <span className="home-action-mobile">Camera</span>
            </label>
            <input
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
            <label htmlFor="home-gallery" className="pixel-secondary home-mobile-gallery">
              <span className="home-action-mobile">Add photo</span>
            </label>
            <input
              id="home-gallery"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onQuickCameraPhoto}
            />
          </div>
        </div>
      </header>

      <PendingPhotos
        repository={repository}
        refreshKey={refreshKey}
        onProcess={(photo, id) => void startScan(photo, id)}
      />
      <Scrapbook
        repository={repository}
        refreshKey={refreshKey}
        onSpotCat={() => void startScan()}
      />

      <footer className="mt-9 border-t-2 border-dashed border-[#b7588b] py-5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#82405f]">
        ♥ local-first · no account · no public map · no hosted photo inference ♥
      </footer>
    </main>
  );
}
