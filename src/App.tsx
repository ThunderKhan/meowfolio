import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { cropImageBlob } from './browser/images';
import { AiClient } from './ai/client';
import {
  MODEL_MANIFEST,
  type Detection,
  type ExecutionProvider,
  type WorkerResponse,
} from './ai/shared';

type ProviderChoice = 'auto' | ExecutionProvider;

interface SpikeMetrics {
  initializationMs?: number;
  detectionMs?: number;
  embeddingMs?: number;
  provider?: ExecutionProvider;
  dimension?: number;
}

function formatMs(value?: number): string {
  return value === undefined ? '—' : Math.round(value) + ' ms';
}

function shortRevision(value: string): string {
  return value.slice(0, 8);
}

export function App() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderChoice>('auto');
  const [status, setStatus] = useState('Choose a cat photo to begin.');
  const [needsConsent, setNeedsConsent] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [metrics, setMetrics] = useState<SpikeMetrics>({});
  const [networkLog, setNetworkLog] = useState<string[]>([]);
  const [client, setClient] = useState<AiClient | null>(null);

  useEffect(() => {
    const nextClient = new AiClient((message: WorkerResponse) => {
      if (message.type === 'MODEL_PROGRESS') {
        const suffix =
          typeof message.progress === 'number'
            ? ' ' + Math.round(message.progress) + '%'
            : message.file
              ? ' ' + message.file
              : '';
        setStatus('Preparing ' + message.model + '…' + suffix);
      }

      if (message.type === 'PROCESSING_STAGE') {
        setStatus(
          message.stage === 'detecting'
            ? 'Looking for cats locally…'
            : message.stage === 'embedding'
              ? 'Creating the visual fingerprint locally…'
              : 'Reading the photo locally…',
        );
      }

      if (message.type === 'NETWORK_ACTIVITY') {
        try {
          const url = new URL(message.url);
          setNetworkLog((current) => [
            ...current.slice(-7),
            (message.allowed ? '✓ ' : '✕ ') + message.category + ' · ' + url.host + url.pathname,
          ]);
        } catch {
          // Diagnostic-only; ignore malformed URLs.
        }
      }

      if (message.type === 'ERROR') setStatus(message.message);
    });

    setClient(nextClient);
    return () => nextClient.dispose();
  }, []);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    return () => {
      if (cropUrl) URL.revokeObjectURL(cropUrl);
    };
  }, [cropUrl]);

  const providerLabel = useMemo(() => {
    if (provider === 'auto') return 'Auto (prefer WebGPU)';
    return provider === 'webgpu' ? 'WebGPU' : 'WASM / CPU';
  }, [provider]);

  function resetForPhoto(file: File | null): void {
    setPhoto(file);
    setDetections([]);
    setNeedsConsent(false);
    setMetrics({});
    setStatus(file ? 'Photo ready. Nothing has been uploaded.' : 'Choose a cat photo to begin.');
    if (cropUrl) {
      URL.revokeObjectURL(cropUrl);
      setCropUrl(null);
    }
  }

  async function runDetection(): Promise<void> {
    if (!photo || !client) return;
    setStatus('Looking for cats locally…');
    const result = await client.detect(photo);
    setDetections(result.detections);
    setMetrics((current) => ({ ...current, detectionMs: result.elapsedMs }));
    setStatus(
      result.detections.length === 0
        ? 'No cat detected. Try a clearer photo where the cat fills more of the frame.'
        : result.detections.length === 1
          ? 'One cat found. Use the crop to prove the embedding path.'
          : result.detections.length + ' cats found. Choose the cat you mean.',
    );
  }

  async function startFindCat(): Promise<void> {
    if (!photo || !client || busy) return;
    setBusy(true);
    setNetworkLog([]);
    try {
      if (!modelsReady) {
        setStatus('Checking the real browser cache…');
        const cache = await client.checkAssets(provider);
        if (!cache.ready) {
          setNeedsConsent(true);
          setStatus('Local AI files are missing. Download permission is required.');
          return;
        }
        setModelsReady(true);
        setMetrics((current) => ({ ...current, provider: cache.provider }));
      }
      await runDetection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not prepare local AI.';
      if (message.includes('CONSENT_REQUIRED')) {
        setNeedsConsent(true);
        setStatus('Local AI files are missing. Download permission is required.');
      } else {
        setStatus(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function downloadAndContinue(): Promise<void> {
    if (!photo || !client || busy) return;
    setBusy(true);
    setNetworkLog([]);
    try {
      setStatus('Downloading and initializing local AI…');
      const ready = await client.loadModels(provider, true);
      setModelsReady(true);
      setNeedsConsent(false);
      setMetrics((current) => ({
        ...current,
        initializationMs: ready.elapsedMs,
        provider: ready.provider,
      }));
      await runDetection();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Model preparation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function embedDetection(detection: Detection): Promise<void> {
    if (!photo || !client || busy) return;
    setBusy(true);
    try {
      const crop = await cropImageBlob(photo, detection.box);
      if (cropUrl) URL.revokeObjectURL(cropUrl);
      setCropUrl(URL.createObjectURL(crop));
      const result = await client.embed(crop);
      setMetrics((current) => ({
        ...current,
        embeddingMs: result.elapsedMs,
        provider: result.provider,
        dimension: result.dimension,
      }));
      setStatus(
        'Local pipeline complete: cat crop → normalized ' +
          result.dimension +
          '-value DINOv2 embedding.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Embedding failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#2f6b4f]">
          Meowfolio · local-AI feasibility spike
        </p>
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-6xl">
          Prove the cat pipeline before building the scrapbook.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#6d625a]">
          Your photo stays in this browser. The first run may download pinned AI files only after
          you explicitly allow it.
        </p>
      </header>

      <section className="paper-shadow grid gap-6 rounded-[28px] border border-black/10 bg-white p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="cat-photo">
            Cat photo
          </label>
          <input
            id="cat-photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="block min-h-12 w-full rounded-xl border border-black/15 bg-[#faf7f0] px-3 py-2"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              resetForPhoto(event.target.files?.[0] ?? null)
            }
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-[#f2eee5]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Selected cat encounter preview"
                className="max-h-[520px] w-full object-contain"
              />
            ) : (
              <div className="grid min-h-64 place-items-center px-6 text-center text-[#6d625a]">
                Choose or take a photo. No model downloads happen just by opening Meowfolio.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              aria-label="Execution provider"
              value={provider}
              disabled={busy}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setProvider(event.target.value as ProviderChoice);
                setModelsReady(false);
              }}
              className="min-h-12 rounded-xl border border-black/15 bg-white px-3"
            >
              <option value="auto">Auto · prefer WebGPU</option>
              <option value="webgpu">WebGPU</option>
              <option value="wasm">WASM / CPU</option>
            </select>
            <button
              type="button"
              disabled={!photo || !client || busy}
              onClick={startFindCat}
              className="min-h-12 flex-1 rounded-xl bg-[#2f6b4f] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? 'Working locally…' : 'Find the cat'}
            </button>
          </div>

          {needsConsent && (
            <div className="mt-5 rounded-2xl border border-[#c96b4b]/30 bg-[#fff8f4] p-4">
              <h2 className="font-serif text-xl font-semibold">Preparing local AI</h2>
              <p className="mt-2 leading-6 text-[#6d625a]">
                Required detector and visual-embedding files are not fully cached. Downloading
                them can use noticeable data. The photo itself is not sent to Hugging Face for
                inference.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={downloadAndContinue}
                className="mt-4 min-h-12 rounded-xl bg-[#c96b4b] px-5 py-3 font-semibold text-white"
              >
                Download models &amp; continue
              </button>
            </div>
          )}

          <p
            aria-live="polite"
            className="mt-5 rounded-xl border border-black/10 bg-[#faf7f0] px-4 py-3 text-sm leading-6"
          >
            {status}
          </p>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-black/10 bg-[#faf7f0] p-4">
            <h2 className="font-serif text-2xl font-semibold">Spike evidence</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-[#6d625a]">Requested provider</dt>
              <dd className="text-right font-medium">{providerLabel}</dd>
              <dt className="text-[#6d625a]">Actual provider</dt>
              <dd className="text-right font-medium">{metrics.provider ?? '—'}</dd>
              <dt className="text-[#6d625a]">Initialization</dt>
              <dd className="text-right font-medium">{formatMs(metrics.initializationMs)}</dd>
              <dt className="text-[#6d625a]">Detection</dt>
              <dd className="text-right font-medium">{formatMs(metrics.detectionMs)}</dd>
              <dt className="text-[#6d625a]">Embedding</dt>
              <dd className="text-right font-medium">{formatMs(metrics.embeddingMs)}</dd>
              <dt className="text-[#6d625a]">Embedding dimension</dt>
              <dd className="text-right font-medium">{metrics.dimension ?? '—'}</dd>
            </dl>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <h2 className="font-serif text-xl font-semibold">Detected cats</h2>
            {detections.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-[#6d625a]">No crop is available yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {detections.map((detection, index) => (
                  <button
                    key={detection.id}
                    type="button"
                    disabled={busy}
                    onClick={() => embedDetection(detection)}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl border border-black/10 px-3 py-2 text-left hover:bg-[#faf7f0]"
                  >
                    <span>Cat {index + 1}</span>
                    <span className="text-sm text-[#6d625a]">
                      detector score {detection.score.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {cropUrl && (
              <img
                src={cropUrl}
                alt="Selected detected cat crop"
                className="mt-4 max-h-64 w-full rounded-xl border border-black/10 object-contain"
              />
            )}
          </div>

          <details className="rounded-2xl border border-black/10 bg-white p-4">
            <summary className="cursor-pointer font-semibold">Pinned model candidates</summary>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#6d625a]">
              <p>
                Detector: {MODEL_MANIFEST.detector.id} @{' '}
                {shortRevision(MODEL_MANIFEST.detector.revision)}
              </p>
              <p>{MODEL_MANIFEST.detector.releaseNote}</p>
              <p>
                Embedder: {MODEL_MANIFEST.embedder.id} @{' '}
                {shortRevision(MODEL_MANIFEST.embedder.revision)}
              </p>
            </div>
          </details>

          <details className="rounded-2xl border border-black/10 bg-white p-4">
            <summary className="cursor-pointer font-semibold">AI network audit</summary>
            <p className="mt-2 text-xs leading-5 text-[#6d625a]">
              These are model/runtime requests observed through the configured Transformers.js
              fetch boundary. DevTools Network remains the final audit because runtime downloads
              can bypass library hooks.
            </p>
            <ul className="mt-3 space-y-1 break-all font-mono text-[11px] leading-5">
              {networkLog.length === 0 ? <li>No requests recorded yet.</li> : null}
              {networkLog.map((entry, index) => (
                <li key={index}>{entry}</li>
              ))}
            </ul>
          </details>
        </aside>
      </section>
    </main>
  );
}
