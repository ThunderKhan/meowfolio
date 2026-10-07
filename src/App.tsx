import { useEffect, useMemo, useState } from 'react';
import { AiClient, type AiGateway } from './ai/client';
import { MockAiClient, type MockScenario } from './ai/mockClient';
import { MODEL_MANIFEST } from './ai/shared';
import { ScanFlow } from './scan/ScanFlow';
import type { CatReference, MatchingPolicy } from './scan/matching';

const WELCOME_KEY = 'meowfolio.welcome-complete';

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

  const [ai] = useState<AiGateway>(() =>
    mockScenario
      ? new MockAiClient(mockScenario as MockScenario)
      : new AiClient(),
  );
  const [welcomeComplete, setWelcomeComplete] = useState(() => {
    if (e2eEnabled && params.get('skipWelcome') === '1') return true;
    try {
      return window.localStorage.getItem(WELCOME_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [scanning, setScanning] = useState(false);

  const cats = useMemo(() => testCatalog(catalogMode), [catalogMode]);
  const matchingPolicy: MatchingPolicy = useMemo(
    () =>
      e2eEnabled && catalogMode === 'familiar'
        ? { enabled: true, threshold: 0.9, minimumMargin: 0.05 }
        : { enabled: false },
    [catalogMode, e2eEnabled],
  );

  useEffect(() => () => ai.dispose(), [ai]);

  function completeWelcome(): void {
    setWelcomeComplete(true);
    try {
      window.localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      // The welcome preference is convenience only; storage failure never blocks use.
    }
  }

  if (!welcomeComplete) {
    return (
      <main className="mx-auto grid min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
        <section className="paper-shadow overflow-hidden rounded-[34px] border border-black/10 bg-[#fffdf8]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2f6b4f]">
                Meowfolio
              </p>
              <h1 className="mt-4 max-w-xl font-serif text-5xl font-semibold leading-[1.04] sm:text-6xl">
                Remember the cats you meet outside.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#6d625a]">
                Build a private scrapbook of real cat encounters. Meowfolio uses local visual AI
                to find the cat in your photo and help you connect later meetings. You always
                decide who the cat is.
              </p>
              <div className="mt-8 rounded-2xl border border-[#2f6b4f]/20 bg-[#f3f8f4] p-4 text-sm leading-6 text-[#4d5f54]">
                <strong className="text-[#1f1a17]">Private by default.</strong> Photos, embeddings,
                names, and optional encounter details stay in your browser scrapbook. The first
                scan may need to download local AI model files.
              </div>
              <button
                type="button"
                onClick={completeWelcome}
                className="mt-8 min-h-12 rounded-xl bg-[#2f6b4f] px-6 py-3 font-semibold text-white"
              >
                Start my Meowfolio
              </button>
            </div>

            <div className="relative min-h-72 overflow-hidden bg-[#e8efe8] p-8 lg:min-h-full">
              <div className="absolute -right-10 top-10 h-44 w-44 rounded-full border-[24px] border-[#c96b4b]/15" />
              <div className="absolute bottom-8 left-8 rotate-[-4deg] rounded-2xl bg-white p-5 shadow-xl">
                <p className="font-serif text-3xl">🐈</p>
                <p className="mt-8 font-serif text-2xl font-semibold">Mochi</p>
                <p className="mt-1 text-sm text-[#6d625a]">Met again on your evening walk</p>
              </div>
              <div className="absolute right-8 top-16 rotate-[5deg] rounded-2xl border border-black/10 bg-[#faf7f0] px-5 py-4 shadow-lg">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f6b4f]">
                  Field note
                </p>
                <p className="mt-2 max-w-40 font-serif text-xl">The orange one by the garden wall.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (scanning) {
    return (
      <ScanFlow
        ai={ai}
        cats={cats}
        matchingPolicy={matchingPolicy}
        onExit={() => setScanning(false)}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2f6b4f]">
            Meowfolio
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Your cat scrapbook</h1>
        </div>
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="min-h-12 rounded-xl bg-[#2f6b4f] px-5 py-3 font-semibold text-white"
        >
          Spot a cat
        </button>
      </header>

      <section className="paper-shadow mt-8 rounded-[30px] border border-black/10 bg-[#fffdf8] p-6 sm:p-10">
        <div className="mx-auto max-w-xl py-10 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e8efe8] text-4xl">
            🐾
          </div>
          <h2 className="mt-6 font-serif text-3xl font-semibold">
            {cats.length === 0 ? 'Your first cat is still out there.' : 'Your test scrapbook is ready.'}
          </h2>
          <p className="mt-3 leading-7 text-[#6d625a]">
            {cats.length === 0
              ? 'Next time you spot one, take a photo. Meowfolio will find the cat locally, then you decide how to remember them.'
              : 'Controlled browser fixtures are active for this verification build.'}
          </p>
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="mt-6 min-h-12 rounded-xl bg-[#2f6b4f] px-6 py-3 font-semibold text-white"
          >
            Spot a cat
          </button>
        </div>
      </section>

      <footer className="mt-6 text-center text-xs leading-5 text-[#83766d]">
        No account. No public map. No hosted photo inference.
      </footer>
    </main>
  );
}
