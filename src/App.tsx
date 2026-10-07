import { useCallback, useEffect, useMemo, useState } from 'react';
import { AiClient, type AiGateway } from './ai/client';
import { MockAiClient, type MockScenario } from './ai/mockClient';
import { MODEL_MANIFEST } from './ai/shared';
import { ScanFlow } from './scan/ScanFlow';
import type { CatReference, MatchingPolicy } from './scan/matching';
import { loadRuntimeCatalog } from './scan/referenceCatalog';
import { RELEASE_MATCHING_POLICY } from './evaluation/releasePolicy';
import { Scrapbook } from './scrapbook/Scrapbook';
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

  const [repository] = useState(() => new MeowfolioRepository());
  const [ai, setAi] = useState<AiGateway | null>(null);
  const [scanCats, setScanCats] = useState<CatReference[]>([]);
  const [scanCatUrls, setScanCatUrls] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scanning, setScanning] = useState(false);
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
      setScanCatUrls((current) => {
        for (const url of current) URL.revokeObjectURL(url);
        return [];
      });
      return;
    }

    try {
      const catalog = await loadRuntimeCatalog(repository, RELEASE_MATCHING_POLICY);
      setScanCats(catalog.cats);
      setScanCatUrls((current) => {
        for (const url of current) URL.revokeObjectURL(url);
        return catalog.objectUrls;
      });
    } catch {
      // Scrapbook rendering owns the visible read-error state. A failed reference
      // refresh simply leaves manual identity with no preloaded saved-cat choices.
      setScanCats([]);
      setScanCatUrls((current) => {
        for (const url of current) URL.revokeObjectURL(url);
        return [];
      });
    }
  }, [catalogMode, fixtureCats, repository]);

  useEffect(() => {
    void refreshScanCats();

    if (e2eEnabled) {
      window.__MEOWFOLIO_E2E_REPOSITORY__ = repository;
    }

    return () => {
      for (const url of scanCatUrls) URL.revokeObjectURL(url);
      repository.close();
      delete window.__MEOWFOLIO_E2E_REPOSITORY__;
    };
  }, [e2eEnabled, refreshScanCats, repository, scanCatUrls]);

  function completeWelcome(): void {
    setWelcomeComplete(true);
    try {
      window.localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      // Convenience only; inability to persist welcome state never blocks the app.
    }
  }

  async function startScan(): Promise<void> {
    await refreshScanCats();

    const gateway: AiGateway = mockScenario
      ? new MockAiClient(mockScenario as MockScenario)
      : new AiClient();

    setAi(gateway);
    setScanning(true);
  }

  function leaveScan(): void {
    setScanning(false);
    setAi((current) => {
      current?.dispose();
      return null;
    });
  }

  async function afterSave(): Promise<void> {
    setRefreshKey((value) => value + 1);
    await refreshScanCats();
  }

  if (!welcomeComplete) {
    return (
      <main className="mx-auto grid min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
        <section className="pixel-window overflow-hidden">
          <div className="pixel-window-title">
            <span>♥ MEOWFOLIO_SETUP.EXE</span>
            <span aria-hidden="true">_ □ ×</span>
          </div>
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="p-6 sm:p-9 lg:p-12">
              <p className="pixel-kicker">★ welcome to your local cat archive ★</p>
              <h1 className="pixel-heading mt-4 max-w-xl text-5xl sm:text-6xl">
                remember the cats you meet outside_♥
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#6d3454]">
                Meowfolio is a tiny private scrapbook for real cat encounters. Local visual AI
                finds the cat in your photo; <strong>you</strong> decide who the cat is.
              </p>

              <div className="pixel-note mt-7">
                <p className="pixel-kicker">privacy_readme.txt</p>
                <p className="mt-2 text-sm leading-6 text-[#54233d]">
                  No account. No hosted photo inference. Names, photos, embeddings, notes, and
                  optional location stay in this browser scrapbook. The first scan may download
                  local AI model files after you approve it.
                </p>
              </div>

              <button type="button" onClick={completeWelcome} className="pixel-primary mt-8">
                ♥ start my meowfolio ♥
              </button>
            </div>

            <div className="relative min-h-80 overflow-hidden border-t-2 border-[#7b3157] bg-[#ffc4e0] p-7 lg:border-l-2 lg:border-t-0">
              <div className="absolute left-4 top-3 text-xs font-bold text-[#9f1f62]">
                ☆ ☆ ☆ ONLINE MEMORY CARD ☆ ☆ ☆
              </div>
              <div className="pixel-window absolute bottom-8 left-7 right-14 rotate-[-2deg] bg-[#fff6fb]">
                <div className="pixel-window-title">
                  <span>CAT_001.JPG</span>
                  <span>×</span>
                </div>
                <div className="p-5">
                  <div className="grid aspect-[4/3] place-items-center border-2 border-[#7b3157] bg-[#ffd7ec] text-5xl">
                    ฅ^•ﻌ•^ฅ
                  </div>
                  <p className="pixel-heading mt-4 text-2xl">Mochi</p>
                  <p className="mt-1 text-xs text-[#7f4b67]">
                    STATUS: met again on evening walk ♥
                  </p>
                </div>
              </div>
              <div className="absolute right-4 top-14 rotate-[3deg] border-2 border-dashed border-[#a91f68] bg-[#fff3a8] px-4 py-3 text-xs font-bold text-[#6d3454] shadow-[3px_3px_0_#d96ca5]">
                DON’T FORGET:
                <br />
                orange cat by
                <br />
                garden wall!!
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (scanning && ai) {
    return (
      <ScanFlow
        ai={ai}
        repository={repository}
        cats={catalogMode ? fixtureCats : scanCats}
        matchingPolicy={matchingPolicy}
        onSaved={afterSave}
        onExit={leaveScan}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <header className="pixel-window">
        <div className="pixel-window-title">
          <span>♥ MEOWFOLIO.HTML</span>
          <span aria-hidden="true">_ □ ×</span>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="pixel-kicker">personal neighborhood cat scrapbook</p>
            <p className="pixel-heading mt-1 text-2xl">meowfolio // local save file</p>
          </div>
          <button type="button" className="pixel-primary" onClick={() => void startScan()}>
            + spot a cat
          </button>
        </div>
      </header>

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
