import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import type { AiGateway } from '../ai/client';
import { cropImageBlob } from '../browser/images';
import type { Detection } from '../ai/shared';
import {
  DISABLED_MATCHING_POLICY,
  findFamiliarSuggestion,
  type CatReference,
  type MatchingPolicy,
} from './matching';
import {
  createScanState,
  scanReducer,
  validateCatName,
  type EmbeddingResult,
  type ScanState,
} from './state';

interface ScanFlowProps {
  ai: AiGateway;
  cats?: CatReference[];
  matchingPolicy?: MatchingPolicy;
  onExit: () => void;
}

function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}

function ActionButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
}) {
  const classes =
    variant === 'primary'
      ? 'bg-[#2f6b4f] text-white'
      : variant === 'danger'
        ? 'bg-[#8d3f31] text-white'
        : variant === 'secondary'
          ? 'border border-black/15 bg-white text-[#1f1a17]'
          : 'bg-transparent text-[#2f6b4f]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        'min-h-12 rounded-xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ' +
        classes
      }
    >
      {children}
    </button>
  );
}

function CatPhoto({
  src,
  alt,
  className = '',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={
          'grid place-items-center rounded-2xl border border-dashed border-black/15 bg-[#f3eee4] text-sm text-[#6d625a] ' +
          className
        }
      >
        Saved cat photo
      </div>
    );
  }

  return <img src={src} alt={alt} className={'rounded-2xl object-cover ' + className} />;
}

export function ScanFlow({
  ai,
  cats = [],
  matchingPolicy = DISABLED_MATCHING_POLICY,
  onExit,
}: ScanFlowProps) {
  const [state, dispatch] = useReducer(scanReducer, undefined, () => createScanState());
  const [modelsReady, setModelsReady] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stateRef = useRef<ScanState>(state);
  const activeRequestRef = useRef<string | null>(null);
  const timersRef = useRef<number[]>([]);
  const previewUrl = useObjectUrl(state.photo);
  const cropUrl = useObjectUrl(state.crop);

  stateRef.current = state;

  const chosenCat = useMemo(() => {
    const identity = state.identity;
    if (!identity || identity.kind !== 'existing') return null;
    return cats.find((cat) => cat.id === identity.catId) ?? null;
  }, [cats, state.identity]);

  const newNameError =
    state.identity?.kind === 'new' ? validateCatName(state.newCatName) : null;

  function clearWarmTimers(): void {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  }

  function cancelActive(): void {
    const requestId = activeRequestRef.current;
    if (!requestId) return;
    activeRequestRef.current = null;
    ai.cancel(requestId);
  }

  function armWarmDeadline(generation: number, elapsedMs: number): void {
    clearWarmTimers();
    const slowIn = 10_000 - elapsedMs;
    const expireIn = 20_000 - elapsedMs;

    if (slowIn <= 0) {
      dispatch({ type: 'SLOW_WARNING', generation });
    } else {
      timersRef.current.push(
        window.setTimeout(() => {
          dispatch({ type: 'SLOW_WARNING', generation });
        }, slowIn),
      );
    }

    const expire = () => {
      if (stateRef.current.generation !== generation) return;
      cancelActive();
      dispatch({
        type: 'ASYNC_ERROR',
        generation,
        message:
          'This scan took too long. Your photo is still here, so you can try again or choose another photo.',
      });
    };

    if (expireIn <= 0) {
      expire();
    } else {
      timersRef.current.push(window.setTimeout(expire, expireIn));
    }
  }

  function ignoreCancelled(error: unknown, generation: number): boolean {
    if (stateRef.current.generation !== generation) return true;
    return error instanceof Error && error.message.includes('CANCELLED');
  }

  async function processDetection(
    photo: File,
    detection: Detection,
    elapsedBeforeMs: number,
    generation: number,
  ): Promise<void> {
    if (stateRef.current.generation !== generation) return;

    dispatch({ type: 'SELECT_DETECTION', detection });
    dispatch({ type: 'EMBEDDING' });
    armWarmDeadline(generation, elapsedBeforeMs);
    const phaseStarted = performance.now();

    try {
      const crop = await cropImageBlob(photo, detection.box);
      if (stateRef.current.generation !== generation) return;
      dispatch({ type: 'CROP_READY', generation, detection, crop });

      const requestId = crypto.randomUUID();
      activeRequestRef.current = requestId;
      const result = await ai.embed(crop, requestId);
      if (activeRequestRef.current === requestId) activeRequestRef.current = null;
      if (stateRef.current.generation !== generation) return;

      clearWarmTimers();
      const embedding: EmbeddingResult = {
        values: result.embedding,
        space: result.space,
      };
      const suggestion = findFamiliarSuggestion(embedding, cats, matchingPolicy);
      dispatch({ type: 'EMBEDDING_READY', generation, embedding, suggestion });

      // Keep this measured locally for the deadline even though the score/timing
      // is not exposed as identity evidence to the user.
      void (elapsedBeforeMs + (performance.now() - phaseStarted));
    } catch (error) {
      clearWarmTimers();
      if (ignoreCancelled(error, generation)) return;
      dispatch({
        type: 'ASYNC_ERROR',
        generation,
        message: 'I couldn’t finish the local visual check. Try again with the same photo.',
      });
    }
  }

  async function runDetection(photo: File, generation: number): Promise<void> {
    dispatch({ type: 'DETECTING' });
    armWarmDeadline(generation, 0);
    const started = performance.now();
    const requestId = crypto.randomUUID();
    activeRequestRef.current = requestId;

    try {
      const result = await ai.detect(photo, 0.25, requestId);
      if (activeRequestRef.current === requestId) activeRequestRef.current = null;
      if (stateRef.current.generation !== generation) return;

      const elapsedMs = performance.now() - started;
      clearWarmTimers();
      dispatch({
        type: 'DETECTIONS_READY',
        generation,
        detections: result.detections,
        width: result.width,
        height: result.height,
        elapsedMs,
      });

      if (result.detections.length === 1) {
        await processDetection(photo, result.detections[0], elapsedMs, generation);
      }
    } catch (error) {
      clearWarmTimers();
      if (ignoreCancelled(error, generation)) return;
      dispatch({
        type: 'ASYNC_ERROR',
        generation,
        message:
          'I couldn’t find the cat because local processing failed. Your photo is still here.',
      });
    }
  }

  async function beginProcessing(photo: File, generation: number): Promise<void> {
    if (modelsReady) {
      await runDetection(photo, generation);
      return;
    }

    dispatch({ type: 'PREPARING' });
    const requestId = crypto.randomUUID();
    activeRequestRef.current = requestId;

    try {
      const cache = await ai.checkAssets('wasm', requestId);
      if (activeRequestRef.current === requestId) activeRequestRef.current = null;
      if (stateRef.current.generation !== generation) return;

      if (!cache.ready) {
        dispatch({ type: 'NEEDS_CONSENT' });
        return;
      }

      setModelsReady(true);
      await runDetection(photo, generation);
    } catch (error) {
      if (ignoreCancelled(error, generation)) return;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('CONSENT_REQUIRED')) {
        dispatch({ type: 'NEEDS_CONSENT' });
        return;
      }
      dispatch({
        type: 'ASYNC_ERROR',
        generation,
        message: 'Meowfolio couldn’t start the local AI. Your photo is still here.',
      });
    }
  }

  async function downloadAndContinue(): Promise<void> {
    const photo = state.photo;
    const generation = state.generation;
    if (!photo) return;

    dispatch({ type: 'PREPARING' });
    const requestId = crypto.randomUUID();
    activeRequestRef.current = requestId;

    try {
      await ai.loadModels('wasm', true, requestId);
      if (activeRequestRef.current === requestId) activeRequestRef.current = null;
      if (stateRef.current.generation !== generation) return;
      setModelsReady(true);
      await runDetection(photo, generation);
    } catch (error) {
      if (ignoreCancelled(error, generation)) return;
      dispatch({
        type: 'ASYNC_ERROR',
        generation,
        message:
          'Meowfolio couldn’t prepare the local AI. You can try again without losing this photo.',
      });
    }
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    clearWarmTimers();
    cancelActive();
    dispatch({ type: 'SET_PHOTO', photo: file });
  }

  function goBack(): void {
    clearWarmTimers();
    cancelActive();
    const current = stateRef.current;
    if (current.step === 'preview') {
      if (current.photo) setDiscardOpen(true);
      else onExit();
      return;
    }
    dispatch({ type: 'BACK' });
  }

  function discard(): void {
    clearWarmTimers();
    cancelActive();
    dispatch({ type: 'DISCARD' });
    setDiscardOpen(false);
    onExit();
  }

  async function retrySamePhoto(): Promise<void> {
    if (!state.photo) return;
    const nextGeneration = state.generation + 1;
    dispatch({ type: 'RETRY' });
    await beginProcessing(state.photo, nextGeneration);
  }

  async function chooseDetection(detection: Detection): Promise<void> {
    if (!state.photo) return;
    await processDetection(
      state.photo,
      detection,
      state.detectionElapsedMs,
      state.generation,
    );
  }

  useEffect(() => {
    const marker = { meowfolioScan: true };
    window.history.pushState(marker, '', window.location.href);

    const onPopState = () => {
      goBack();
      window.history.pushState(marker, '', window.location.href);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      clearWarmTimers();
      cancelActive();
      if (window.history.state?.meowfolioScan) {
        window.history.replaceState(null, '', window.location.href);
      }
    };
    // The state ref keeps browser Back behavior current without rebuilding the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photoPanel = previewUrl ? (
    <div className="overflow-hidden rounded-[24px] border border-black/10 bg-[#eee8dd]">
      <img
        src={previewUrl}
        alt="Cat encounter preview"
        className="max-h-[62vh] w-full object-contain"
      />
    </div>
  ) : (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="grid min-h-72 w-full place-items-center rounded-[24px] border border-dashed border-black/20 bg-white px-7 text-center"
    >
      <span>
        <span className="block font-serif text-2xl font-semibold">Photograph a cat you met</span>
        <span className="mt-2 block text-sm leading-6 text-[#6d625a]">
          Take a photo or choose one from your phone. Nothing is uploaded for inference.
        </span>
      </span>
    </button>
  );

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <input
        ref={fileInputRef}
        id="cat-photo"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onPhotoChange}
      />

      <header className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="min-h-11 rounded-xl px-3 font-semibold text-[#2f6b4f]"
        >
          ← Back
        </button>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6d625a]">
          New encounter
        </p>
        <button
          type="button"
          onClick={() => setDiscardOpen(true)}
          className="min-h-11 rounded-xl px-3 font-semibold text-[#8d3f31]"
        >
          Cancel
        </button>
      </header>

      {state.slowWarning && (
        <section className="mb-5 rounded-2xl border border-[#c96b4b]/35 bg-[#fff7f2] p-4">
          <p className="font-semibold">This is taking longer than expected.</p>
          <p className="mt-1 text-sm leading-6 text-[#6d625a]">
            Local processing can continue, but this scan still has the original 20-second limit.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton variant="secondary" onClick={() => dispatch({ type: 'KEEP_WAITING' })}>
              Keep waiting
            </ActionButton>
            <ActionButton variant="quiet" onClick={goBack}>
              Cancel and go back
            </ActionButton>
          </div>
        </section>
      )}

      {state.step === 'preview' && (
        <section className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Spot a cat
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Add this meeting to your scrapbook.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#6d625a]">
            Meowfolio looks for the cat locally on this device. You decide who the cat is.
          </p>
          <div className="mt-6">{photoPanel}</div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <ActionButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
              {state.photo ? 'Choose another photo' : 'Take or choose photo'}
            </ActionButton>
            <ActionButton
              disabled={!state.photo}
              onClick={() => {
                if (state.photo) void beginProcessing(state.photo, state.generation);
              }}
            >
              Find the cat
            </ActionButton>
          </div>
        </section>
      )}

      {state.step === 'preparation-consent' && (
        <section className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c96b4b]">
            First local scan
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Preparing local AI</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#6d625a]">
            The detector and visual model files are not fully cached yet. Downloading them can use
            noticeable data. Your cat photo is not sent to a hosted inference service.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ActionButton onClick={() => void downloadAndContinue()}>
              Download models &amp; continue
            </ActionButton>
            <ActionButton variant="secondary" onClick={goBack}>
              Back to photo
            </ActionButton>
          </div>
        </section>
      )}

      {(state.step === 'preparing' ||
        state.step === 'detecting' ||
        state.step === 'embedding') && (
        <section className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7">
          <div className="mx-auto max-w-xl py-10 text-center">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full border-4 border-[#2f6b4f]/20 border-t-[#2f6b4f]" />
            <h1 className="mt-6 font-serif text-3xl font-semibold">
              {state.step === 'preparing'
                ? 'Getting local AI ready'
                : state.step === 'detecting'
                  ? 'Looking for the cat'
                  : 'Remembering what this cat looks like'}
            </h1>
            <p className="mt-3 leading-7 text-[#6d625a]">
              {state.step === 'preparing'
                ? 'Model work stays on this device once the required files are available.'
                : 'This photo is being processed locally. Identity is never decided automatically.'}
            </p>
            <div className="mt-6">
              <ActionButton variant="secondary" onClick={goBack}>
                Back to photo
              </ActionButton>
            </div>
          </div>
        </section>
      )}

      {state.step === 'select-cat' && previewUrl && (
        <section className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            More than one cat
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Which cat are you adding?</h1>
          <p className="mt-3 leading-7 text-[#6d625a]">
            Choose the cat this encounter is about. Only that crop continues to the visual check.
          </p>

          <div className="relative mt-6 overflow-hidden rounded-[24px] border border-black/10 bg-[#eee8dd]">
            <img src={previewUrl} alt="Photo with detected cats" className="w-full object-contain" />
            {state.sourceWidth > 0 &&
              state.sourceHeight > 0 &&
              state.detections.map((detection, index) => {
                const left = (detection.box.xmin / state.sourceWidth) * 100;
                const top = (detection.box.ymin / state.sourceHeight) * 100;
                const width =
                  ((detection.box.xmax - detection.box.xmin) / state.sourceWidth) * 100;
                const height =
                  ((detection.box.ymax - detection.box.ymin) / state.sourceHeight) * 100;
                return (
                  <button
                    key={detection.id}
                    type="button"
                    aria-label={'Choose cat ' + (index + 1)}
                    onClick={() => void chooseDetection(detection)}
                    className="absolute rounded-xl border-4 border-white bg-[#2f6b4f]/10 shadow-[0_0_0_2px_#2f6b4f]"
                    style={{ left: left + '%', top: top + '%', width: width + '%', height: height + '%' }}
                  >
                    <span className="absolute left-1 top-1 rounded-full bg-[#2f6b4f] px-2 py-1 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {state.detections.map((detection, index) => (
              <ActionButton
                key={detection.id}
                variant="secondary"
                onClick={() => void chooseDetection(detection)}
              >
                Continue with cat {index + 1}
              </ActionButton>
            ))}
          </div>
        </section>
      )}

      {state.step === 'recoverable-error' && (
        <section className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c96b4b]">
            Try another look
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">We can recover from this.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#6d625a]">{state.error}</p>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Selected encounter"
              className="mt-6 max-h-80 w-full rounded-2xl border border-black/10 object-contain"
            />
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton onClick={() => void retrySamePhoto()} disabled={!state.photo}>
              Try again
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Choose another photo
            </ActionButton>
            <ActionButton variant="quiet" onClick={goBack}>
              Back
            </ActionButton>
          </div>
        </section>
      )}

      {state.step === 'identity' && (
        <section
          data-testid="identity-screen"
          data-embedding-dimension={state.embedding?.values.length ?? ''}
          className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7"
        >
          {cats.length === 0 ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                First page
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold">This looks like a new cat.</h1>
              <p className="mt-3 leading-7 text-[#6d625a]">
                There are no cats in your scrapbook yet, so there is nothing to compare this
                encounter with.
              </p>
              {cropUrl && (
                <img
                  src={cropUrl}
                  alt="Detected cat crop"
                  className="mt-6 max-h-96 w-full rounded-2xl border border-black/10 object-contain"
                />
              )}
              <div className="mt-6">
                <ActionButton onClick={() => dispatch({ type: 'CHOOSE_NEW' })}>
                  Name this cat
                </ActionButton>
              </div>
            </>
          ) : state.suggestion ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                Possible familiar face
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold">
                Is this {state.suggestion.name}?
              </h1>
              <p className="mt-3 leading-7 text-[#6d625a]">
                This cat looks visually similar to one you have met before. You make the identity
                decision.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold">Today</p>
                  <CatPhoto src={cropUrl} alt="Cat from this encounter" className="h-64 w-full object-contain" />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">
                    {state.suggestion.name} · met {state.suggestion.encounterCount}{' '}
                    {state.suggestion.encounterCount === 1 ? 'time' : 'times'}
                  </p>
                  <CatPhoto
                    src={state.suggestion.coverUrl}
                    alt={'Saved photo of ' + state.suggestion.name}
                    className="h-64 w-full"
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ActionButton
                  onClick={() =>
                    dispatch({ type: 'CHOOSE_EXISTING', catId: state.suggestion!.catId })
                  }
                >
                  Yes, it’s {state.suggestion.name}
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => dispatch({ type: 'CHOOSE_NEW' })}>
                  No, this is a new cat
                </ActionButton>
                <ActionButton
                  variant="quiet"
                  onClick={() => dispatch({ type: 'OPEN_EXISTING_PICKER' })}
                >
                  Choose another saved cat
                </ActionButton>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
                Your call
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold">No familiar cat suggested.</h1>
              <p className="mt-3 leading-7 text-[#6d625a]">
                That is a normal outcome. If you recognize this cat, choose them from your
                scrapbook. Otherwise add a new cat.
              </p>
              {cropUrl && (
                <img
                  src={cropUrl}
                  alt="Detected cat crop"
                  className="mt-6 max-h-96 w-full rounded-2xl border border-black/10 object-contain"
                />
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ActionButton onClick={() => dispatch({ type: 'OPEN_EXISTING_PICKER' })}>
                  Choose an existing cat
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => dispatch({ type: 'CHOOSE_NEW' })}>
                  Add as a new cat
                </ActionButton>
              </div>
            </>
          )}
        </section>
      )}

      {state.step === 'existing-picker' && (
        <section className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Your scrapbook
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Which cat is this?</h1>
          <p className="mt-3 leading-7 text-[#6d625a]">
            Photos and encounter counts help distinguish cats even when names are the same.
          </p>
          <div className="mt-6 grid gap-3">
            {cats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => dispatch({ type: 'CHOOSE_EXISTING', catId: cat.id })}
                className="flex min-h-20 items-center gap-4 rounded-2xl border border-black/10 bg-white p-3 text-left"
              >
                <CatPhoto src={cat.coverUrl} alt={'Saved photo of ' + cat.name} className="h-16 w-16 shrink-0" />
                <span>
                  <span className="block font-serif text-xl font-semibold">{cat.name}</span>
                  <span className="mt-1 block text-sm text-[#6d625a]">
                    Met {cat.encounterCount} {cat.encounterCount === 1 ? 'time' : 'times'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {state.step === 'details' && (
        <section className="paper-shadow rounded-[30px] border border-black/10 bg-[#fffdf8] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f6b4f]">
            Identity confirmed
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">
            {state.identity?.kind === 'existing'
              ? 'Another meeting with ' + (chosenCat?.name ?? 'this cat')
              : 'Name this cat'}
          </h1>

          {cropUrl && (
            <img
              src={cropUrl}
              alt="Selected cat"
              className="mt-6 max-h-80 w-full rounded-2xl border border-black/10 object-contain"
            />
          )}

          {state.identity?.kind === 'new' && (
            <label className="mt-6 block">
              <span className="text-sm font-semibold">Cat name</span>
              <input
                value={state.newCatName}
                autoComplete="off"
                onChange={(event) => dispatch({ type: 'SET_NAME', value: event.target.value })}
                className="mt-2 min-h-12 w-full rounded-xl border border-black/15 bg-white px-4 py-3"
                placeholder="Mochi"
              />
              {newNameError && state.newCatName.length > 0 ? (
                <span className="mt-2 block text-sm text-[#8d3f31]">{newNameError}</span>
              ) : null}
            </label>
          )}

          <label className="mt-5 block">
            <span className="text-sm font-semibold">Encounter note <span className="font-normal text-[#6d625a]">(optional)</span></span>
            <textarea
              value={state.note}
              onChange={(event) => dispatch({ type: 'SET_NOTE', value: event.target.value })}
              rows={4}
              className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3"
              placeholder="Sleeping under the same orange bench again."
            />
          </label>

          <div className="mt-6 rounded-2xl border border-[#2f6b4f]/20 bg-[#f3f8f4] p-4">
            <p className="font-semibold">Ready for the save step</p>
            <p className="mt-1 text-sm leading-6 text-[#6d625a]">
              This slice stops at a confirmed identity. Nothing is presented as saved until the
              IndexedDB transaction is implemented in the next build slice.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton disabled onClick={() => {}}>
              Save encounter
            </ActionButton>
            <ActionButton variant="secondary" onClick={goBack}>
              Change identity
            </ActionButton>
          </div>
          <p className="mt-2 text-xs text-[#6d625a]">
            Save is intentionally disabled until local persistence is wired in Slice 3.
          </p>
        </section>
      )}

      {discardOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
        >
          <div className="paper-shadow w-full max-w-md rounded-[26px] bg-[#fffdf8] p-6">
            <h2 id="discard-title" className="font-serif text-2xl font-semibold">
              Discard this unfinished encounter?
            </h2>
            <p className="mt-3 leading-7 text-[#6d625a]">
              The photo, identity choice, name, and note in this scan will be cleared. Downloaded
              model files can stay cached.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ActionButton variant="danger" onClick={discard}>
                Discard scan
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => setDiscardOpen(false)}>
                Keep editing
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
