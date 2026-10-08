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
import { cropImageBlob, prepareDetectionImage } from '../browser/images';
import { requestEncounterLocation } from '../browser/location';
import type { Detection } from '../ai/shared';
import { detectionRecordFor, MeowfolioRepository } from '../storage/repository';
import type { EncounterLocation } from '../storage/types';
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
  initialPhoto?: File | null;
  initialPendingId?: string | null;
  onSavedForLater?: () => void | Promise<void>;
  onResetAi?: () => void;
  ai: AiGateway;
  repository: MeowfolioRepository;
  cats?: CatReference[];
  matchingPolicy?: MatchingPolicy;
  onSaved?: () => void | Promise<void>;
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
      ? 'pixel-primary'
      : variant === 'danger'
        ? 'pixel-danger'
        : variant === 'secondary'
          ? 'pixel-secondary'
          : 'pixel-quiet';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        'min-h-12 px-4 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ' +
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
          'grid place-items-center rounded-none border border-dashed border-black/15 bg-[#ffe8f4] text-sm text-[#7f4b67] ' +
          className
        }
      >
        Saved cat photo
      </div>
    );
  }

  return <img src={src} alt={alt} className={'rounded-none object-contain ' + className} />;
}

export function ScanFlow({
  initialPhoto = null,
  initialPendingId = null,
  onSavedForLater,
  onResetAi,
  ai,
  repository,
  cats = [],
  matchingPolicy = DISABLED_MATCHING_POLICY,
  onSaved,
  onExit,
}: ScanFlowProps) {
  const [state, dispatch] = useReducer(scanReducer, undefined, () => createScanState());
  const [modelsReady, setModelsReady] = useState(false);
  useEffect(() => { setModelsReady(false); }, [ai]);
  const [savingForLater, setSavingForLater] = useState(false);
  const [saveForLaterError, setSaveForLaterError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [photoValidationError, setPhotoValidationError] = useState<string | null>(null);
  const [location, setLocation] = useState<EncounterLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'saved' | 'unavailable'>('idle');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const acceptedInitialPhotoRef = useRef<File | null>(null);
  const stateRef = useRef<ScanState>(state);
  const generationRef = useRef(state.generation);
  const activeRequestRef = useRef<string | null>(null);
  const locationRequestRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const previewUrl = useObjectUrl(state.photo);
  const cropUrl = useObjectUrl(state.crop);

  stateRef.current = state;
  generationRef.current = state.generation;

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
    // Mobile WASM is slower than desktop, especially on first inference.
    // Keep a bounded deadline but let people preserve a photo at any time.
    const expireIn = 90_000 - elapsedMs;

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
      if (generationRef.current !== generation) return;
      cancelActive();
      onResetAi?.();
      generationRef.current = generation + 1;
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
    if (generationRef.current !== generation) return true;
    return error instanceof Error && error.message.includes('CANCELLED');
  }

  async function processDetection(
    photo: File,
    detection: Detection,
    elapsedBeforeMs: number,
    generation: number,
  ): Promise<void> {
    if (generationRef.current !== generation) return;

    dispatch({ type: 'SELECT_DETECTION', detection });
    dispatch({ type: 'EMBEDDING' });
    armWarmDeadline(generation, elapsedBeforeMs);
    const phaseStarted = performance.now();

    try {
      const crop = await cropImageBlob(photo, detection.box);
      if (generationRef.current !== generation) return;
      dispatch({ type: 'CROP_READY', generation, detection, crop });

      const requestId = crypto.randomUUID();
      activeRequestRef.current = requestId;
      const result = await ai.embed(crop, requestId);
      if (activeRequestRef.current === requestId) activeRequestRef.current = null;
      if (generationRef.current !== generation) return;

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
      generationRef.current = generation + 1;
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
      const prepared = await prepareDetectionImage(photo);
      if (generationRef.current !== generation) return;
      const result = await ai.detect(prepared.image, 0.25, requestId);
      if (activeRequestRef.current === requestId) activeRequestRef.current = null;
      if (generationRef.current !== generation) return;

      const elapsedMs = performance.now() - started;
      clearWarmTimers();
      // The user's archival photo keeps its original pixels, so detector
      // boxes from the smaller inference image must be mapped back.
      const detections = prepared.resized
        ? result.detections.map((detection) => ({
            ...detection,
            box: {
              xmin: detection.box.xmin * prepared.scaleX,
              xmax: detection.box.xmax * prepared.scaleX,
              ymin: detection.box.ymin * prepared.scaleY,
              ymax: detection.box.ymax * prepared.scaleY,
            },
          }))
        : result.detections;
      dispatch({
        type: 'DETECTIONS_READY',
        generation,
        detections,
        width: prepared.resized ? Math.round(result.width * prepared.scaleX) : result.width,
        height: prepared.resized ? Math.round(result.height * prepared.scaleY) : result.height,
        elapsedMs,
      });

      if (detections.length === 1) {
        await processDetection(photo, detections[0], elapsedMs, generation);
      }
    } catch (error) {
      clearWarmTimers();
      if (ignoreCancelled(error, generation)) return;
      generationRef.current = generation + 1;
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
      if (generationRef.current !== generation) return;

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
      generationRef.current = generation + 1;
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
      if (generationRef.current !== generation) return;
      setModelsReady(true);
      await runDetection(photo, generation);
    } catch (error) {
      if (ignoreCancelled(error, generation)) return;
      generationRef.current = generation + 1;
      dispatch({
        type: 'ASYNC_ERROR',
        generation,
        message:
          'Meowfolio couldn’t prepare the local AI. You can try again without losing this photo.',
      });
    }
  }

  async function setSelectedPhoto(file: File): Promise<void> {
    setSaveForLaterError(null);
    clearWarmTimers();
    cancelActive();
    generationRef.current = stateRef.current.generation + 1;
    locationRequestRef.current += 1;
    setLocation(null);
    setLocationStatus('idle');
    setLocationMessage(null);
    setPhotoValidationError(null);

    try {
      const bitmap = await createImageBitmap(file);
      const valid = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close();
      if (!valid) throw new Error('Image has no usable dimensions.');
      dispatch({ type: 'SET_PHOTO', photo: file });
    } catch {
      setPhotoValidationError(
        'I couldn’t read that image. Choose another photo in a format your browser can open.',
      );
    }
  }

  async function savePhotoForLater(): Promise<void> {
    const photo = stateRef.current.photo;
    if (!photo || savingForLater) return;
    setSavingForLater(true);
    setSaveForLaterError(null);
    try {
      // Store the original, full-resolution photo, not a detection crop.
      await repository.savePendingPhoto(
        photo,
        initialPendingId ?? stateRef.current.encounterId,
        photo.name,
      );
      clearWarmTimers();
      cancelActive();
      if (['preparing', 'detecting', 'embedding'].includes(stateRef.current.step)) {
        // WASM kernels cannot be forcibly interrupted mid-inference. Stop the
        // occupied worker so a future photo is not queued behind old work.
        onResetAi?.();
      }
      await onSavedForLater?.();
    } catch (reason) {
      setSaveForLaterError(
        reason instanceof Error ? reason.message : 'Could not save this photo locally.',
      );
    } finally {
      setSavingForLater(false);
    }
  }

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) await setSelectedPhoto(file);
  }

  function goBack(): void {
    const current = stateRef.current;
    clearWarmTimers();
    cancelActive();
    if (['preparing', 'detecting', 'embedding'].includes(current.step)) {
      onResetAi?.();
    }
    if (current.step === 'saving' || current.step === 'success') return;
    if (current.step === 'preview') {
      if (current.photo) setDiscardOpen(true);
      else onExit();
      return;
    }
    generationRef.current = current.generation + 1;
    dispatch({ type: 'BACK' });
  }

  function discard(): void {
    clearWarmTimers();
    cancelActive();
    locationRequestRef.current += 1;
    dispatch({ type: 'DISCARD' });
    setDiscardOpen(false);
    onExit();
  }

  async function retrySamePhoto(): Promise<void> {
    if (!state.photo) return;
    const nextGeneration = state.generation + 1;
    generationRef.current = nextGeneration;
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

  async function addLocation(): Promise<void> {
    const token = locationRequestRef.current + 1;
    locationRequestRef.current = token;
    setLocationStatus('locating');
    setLocationMessage(null);

    const result = await requestEncounterLocation(8_000);
    if (locationRequestRef.current !== token) return;

    if (result.status === 'saved') {
      setLocation(result.location);
      setLocationStatus('saved');
      setLocationMessage('Location saved privately with this encounter.');
      return;
    }

    setLocation(null);
    setLocationStatus('unavailable');
    setLocationMessage(
      result.reason === 'denied'
        ? 'No problem — this encounter can be saved without location.'
        : result.reason === 'timeout'
          ? 'Location took too long. You can save this encounter without it.'
          : 'Location is unavailable. You can save this encounter without it.',
    );
  }

  async function saveEncounter(): Promise<void> {
    const current = stateRef.current;
    if (
      current.step !== 'details' ||
      !current.photo ||
      !current.crop ||
      !current.embedding ||
      !current.selectedDetection ||
      !current.identity
    ) {
      return;
    }

    if (current.identity.kind === 'new' && validateCatName(current.newCatName)) return;

    // Saving without a still-pending location is always allowed. Invalidate a
    // late geolocation callback so it cannot mutate a committed encounter.
    locationRequestRef.current += 1;
    dispatch({ type: 'SAVE_START' });

    try {
      const identity =
        current.identity.kind === 'new'
          ? {
              kind: 'new' as const,
              catId: current.newCatId!,
              name: current.newCatName.trim(),
            }
          : {
              kind: 'existing' as const,
              catId: current.identity.catId,
            };

      const result = await repository.saveEncounter({
        encounterId: current.encounterId,
        timestamp: current.timestamp,
        photo: current.photo,
        crop: current.crop,
        embedding: current.embedding.values,
        embeddingSpace: current.embedding.space,
        detection: detectionRecordFor(
          current.selectedDetection.box,
          current.selectedDetection.score,
          current.selectedDetection.label,
          current.sourceWidth,
          current.sourceHeight,
        ),
        note: current.note,
        ...(location ? { location } : {}),
        identity,
      });

      await onSaved?.();
      dispatch({ type: 'SAVE_SUCCESS', catName: result.cat.name });
    } catch (error) {
      dispatch({
        type: 'SAVE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'This encounter could not be saved. Your details are still here so you can retry.',
      });
    }
  }

  // A quick-camera capture can arrive from the welcome screen before this scan
  // mounts. Treat it exactly like a photo picked inside the scan; do not trigger
  // model preparation or download without the existing explicit action.
  useEffect(() => {
    if (!initialPhoto || acceptedInitialPhotoRef.current === initialPhoto) return;
    acceptedInitialPhotoRef.current = initialPhoto;
    void setSelectedPhoto(initialPhoto);
    // Only the incoming file identity may start a new scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhoto]);

  useEffect(() => {
    const marker = { meowfolioScan: true };
    window.history.pushState(marker, '', window.location.href);

    const onPopState = () => {
      const current = stateRef.current;
      if (current.step === 'preview' && !current.photo) {
        onExit();
        return;
      }
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
    <div className="overflow-hidden rounded-none border border-black/10 bg-[#ffd8ed]">
      <img
        src={previewUrl}
        alt="Cat encounter preview"
        className="max-h-[42vh] w-full object-contain"
      />
    </div>
  ) : (
    <button
      type="button"
      onClick={() => cameraInputRef.current?.click()}
      className="grid min-h-44 w-full place-items-center rounded-none border border-dashed border-black/20 bg-white px-7 text-center"
    >
      <span>
        <span className="block font-serif text-2xl font-semibold">Photograph a cat you met</span>
        <span className="mt-2 block text-sm leading-6 text-[#7f4b67]">
          Take a photo or choose one from your phone. Nothing is uploaded for inference.
        </span>
      </span>
    </button>
  );

  return (
    <main className="scan-page mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <input
        ref={fileInputRef}
        id="cat-photo"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => void onPhotoChange(event)}
      />
      <input
        ref={cameraInputRef}
        id="cat-camera"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => void onPhotoChange(event)}
      />

      <header className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="scan-nav-button min-h-11 px-3 font-semibold text-[#8d2059]"
        >
          ← Back
        </button>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7f4b67]">
          New encounter
        </p>
        <button
          type="button"
          disabled={state.step === 'saving' || state.step === 'success'}
          onClick={() => setDiscardOpen(true)}
          className="scan-nav-button min-h-11 px-3 font-semibold text-[#8d2059] disabled:opacity-40"
        >
          Cancel
        </button>
      </header>

      {state.slowWarning && (
        <section className="scan-warning mb-5 rounded-none border border-[#ef65ad]/35 bg-[#fff0f7] p-4">
          <p className="font-semibold">This is taking longer than expected.</p>
          <p className="mt-1 text-sm leading-6 text-[#7f4b67]">
            Local processing is slower on this device. You can wait up to 90 seconds or save your photo to process later.
          </p>
          <div className="scan-warning-actions mt-3 flex flex-wrap gap-2">
            <ActionButton variant="secondary" onClick={() => dispatch({ type: 'KEEP_WAITING' })}>
              <span className="scan-desktop-label">Keep waiting</span><span className="scan-mobile-label">Wait</span>
            </ActionButton>
            <ActionButton variant="quiet" onClick={goBack}>
              <span className="scan-desktop-label">Cancel and go back</span><span className="scan-mobile-label">Back</span>
            </ActionButton>
          </div>
        </section>
      )}

      {saveForLaterError && (
        <p role="alert" className="mb-4 border-2 border-[#9e1b55] bg-[#fff0f7] p-3 text-sm text-[#9e1b55]">
          {saveForLaterError}
        </p>
      )}

      {state.step === 'preview' && (
        <section className="scan-preview-panel paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
            Spot a cat
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Add this meeting to your scrapbook.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f4b67]">
            Meowfolio looks for the cat locally on this device. You decide who the cat is.
          </p>
          <div className="mt-4">{photoPanel}</div>
          {photoValidationError && (
            <p role="alert" className="mt-3 rounded-none border border-[#ef65ad]/30 bg-[#fff0f7] px-4 py-3 text-sm text-[#9e1b55]">
              {photoValidationError}
            </p>
          )}
          <div className="scan-capture-actions mt-4 flex flex-wrap gap-3">
            <ActionButton variant="secondary" onClick={() => cameraInputRef.current?.click()}>
              <span className="scan-desktop-label">📷 Open camera</span>
              <span className="scan-mobile-label">Camera</span>
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <span className="scan-desktop-label">{state.photo ? 'Choose another photo' : 'Choose from gallery'}</span>
              <span className="scan-mobile-label">Gallery</span>
            </ActionButton>
            <ActionButton
              disabled={!state.photo}
              onClick={() => {
                if (state.photo) void beginProcessing(state.photo, state.generation);
              }}
            >
              <span className="scan-desktop-label">Find the cat</span>
              <span className="scan-mobile-label">Find cat</span>
            </ActionButton>
          </div>
        </section>
      )}

      {state.photo && state.step !== 'saving' && state.step !== 'success' &&
        state.step !== 'preparing' && state.step !== 'detecting' && state.step !== 'embedding' && (
          <div className="scan-defer-row mt-3">
            <button
              type="button"
              className="pixel-secondary"
              disabled={savingForLater}
              onClick={() => void savePhotoForLater()}
            >
              {savingForLater ? 'Saving photo...' : '♡ Save photo for later'}
            </button>
          </div>
        )}

      {state.step === 'preparation-consent' && (
        <section className="paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
            First local scan
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Preparing local AI</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#7f4b67]">
            The cat-finding models aren't fully downloaded yet. They may use a noticeable amount
            of data, but your photo stays on this device for processing.
          </p>
          <div className="scan-action-row mt-6">
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
        <section className="scan-processing-panel paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <div className="scan-processing-content mx-auto max-w-xl py-10 text-center">
            <div className="meow-spinner scan-desktop-loader mx-auto" aria-hidden="true" />
            <div className="scan-cat-loader mx-auto" aria-hidden="true">
              <div className="meow-spinner scan-cat-orbit" />
              <div className="scan-cat-face">ฅ^•ﻌ•^ฅ</div>
              <div className="scan-cat-sparkle">✦</div>
            </div>
            <h1 className="mt-6 font-serif text-3xl font-semibold">
              {state.step === 'preparing'
                ? 'Getting local AI ready'
                : state.step === 'detecting'
                  ? 'Looking for the cat'
                  : 'Remembering what this cat looks like'}
            </h1>
            <p className="mt-3 leading-7 text-[#7f4b67]">
              {state.step === 'preparing'
                ? 'Model work stays on this device once the required files are available.'
                : 'This photo is being processed locally. Identity is never decided automatically.'}
            </p>
            <div className="scan-processing-actions mt-6">
              <ActionButton variant="secondary" onClick={goBack}>
                Back to photo
              </ActionButton>
              {state.photo && <ActionButton variant="primary" onClick={() => void savePhotoForLater()} disabled={savingForLater}>
                {savingForLater ? 'Saving photo...' : 'Save photo for later'}
              </ActionButton>}
            </div>
          </div>
        </section>
      )}

      {state.step === 'select-cat' && previewUrl && (
        <section className="paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
            More than one cat
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Which cat are you adding?</h1>
          <p className="mt-3 leading-7 text-[#7f4b67]">
            Choose the cat this encounter is about. You'll choose their name or a saved cat next.
          </p>

          <div className="relative mt-6 overflow-hidden rounded-none border border-black/10 bg-[#ffd8ed]">
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
                    className="absolute rounded-none border-4 border-white bg-[#d63384]/10 shadow-[0_0_0_2px_#d63384]"
                    style={{ left: left + '%', top: top + '%', width: width + '%', height: height + '%' }}
                  >
                    <span className="absolute left-1 top-1 rounded-full bg-[#d63384] px-2 py-1 text-xs font-bold text-white">
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
        <section className="paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
            Try another look
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">We can recover from this.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#7f4b67]">{state.error}</p>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Selected encounter"
              className="mt-6 max-h-80 w-full rounded-none border border-black/10 object-contain"
            />
          )}
          <div className="scan-action-row scan-action-row-three mt-6">
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
          className="paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7"
        >
          {cats.length === 0 ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
                First page
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold">This looks like a new cat.</h1>
              <p className="mt-3 leading-7 text-[#7f4b67]">
                There are no cats in your scrapbook yet, so there is nothing to compare this
                encounter with.
              </p>
              {cropUrl && (
                <img
                  src={cropUrl}
                  alt="Detected cat crop"
                  className="mt-6 max-h-96 w-full rounded-none border border-black/10 object-contain"
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
                Possible familiar face
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold">
                Is this {state.suggestion.name}?
              </h1>
              <p className="mt-3 leading-7 text-[#7f4b67]">
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
              <div className="scan-action-row scan-action-row-three mt-6">
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
                Your call
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold">No familiar cat suggested.</h1>
              <p className="mt-3 leading-7 text-[#7f4b67]">
                That is a normal outcome. If you recognize this cat, choose them from your
                scrapbook. Otherwise add a new cat.
              </p>
              {cropUrl && (
                <img
                  src={cropUrl}
                  alt="Detected cat crop"
                  className="mt-6 max-h-96 w-full rounded-none border border-black/10 object-contain"
                />
              )}
              <div className="scan-action-row mt-6">
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
        <section className="paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
            Your scrapbook
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Which cat is this?</h1>
          <p className="mt-3 leading-7 text-[#7f4b67]">
            Photos and encounter counts help distinguish cats even when names are the same.
          </p>
          <div className="mt-6 grid gap-3">
            {cats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => dispatch({ type: 'CHOOSE_EXISTING', catId: cat.id })}
                className="flex min-h-20 items-center gap-4 rounded-none border border-black/10 bg-white p-3 text-left"
              >
                <CatPhoto src={cat.coverUrl} alt={'Saved photo of ' + cat.name} className="h-16 w-16 shrink-0" />
                <span>
                  <span className="block font-serif text-xl font-semibold">{cat.name}</span>
                  <span className="mt-1 block text-sm text-[#7f4b67]">
                    Met {cat.encounterCount} {cat.encounterCount === 1 ? 'time' : 'times'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {state.step === 'details' && (
        <section className="scan-details-panel paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
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
              className="mt-6 max-h-80 w-full rounded-none border border-black/10 object-contain"
            />
          )}

          {state.identity?.kind === 'new' && (
            <label className="mt-6 block">
              <span className="text-sm font-semibold">Cat name</span>
              <input
                value={state.newCatName}
                autoComplete="off"
                onChange={(event) => dispatch({ type: 'SET_NAME', value: event.target.value })}
                className="mt-2 min-h-12 w-full rounded-none border border-black/15 bg-white px-4 py-3"
                placeholder="Mochi"
              />
              {newNameError && state.newCatName.length > 0 ? (
                <span className="mt-2 block text-sm text-[#9e1b55]">{newNameError}</span>
              ) : null}
            </label>
          )}

          <label className="mt-5 block">
            <span className="text-sm font-semibold">Encounter note <span className="font-normal text-[#7f4b67]">(optional)</span></span>
            <textarea
              value={state.note}
              onChange={(event) => dispatch({ type: 'SET_NOTE', value: event.target.value })}
              rows={4}
              className="mt-2 w-full rounded-none border border-black/15 bg-white px-4 py-3"
              placeholder="Sleeping under the same orange bench again."
            />
          </label>

          <div className="mt-6 rounded-none border border-[#d63384]/20 bg-[#ffe8f4] p-4">
            <p className="font-semibold">Where you met them <span className="font-normal text-[#7f4b67]">(optional)</span></p>
            <p className="mt-1 text-sm leading-6 text-[#7f4b67]">
              Location is requested only if you choose to add it and stays in your local scrapbook.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ActionButton
                variant="secondary"
                disabled={locationStatus === 'locating' || locationStatus === 'saved'}
                onClick={() => void addLocation()}
              >
                {locationStatus === 'locating'
                  ? 'Finding location…'
                  : locationStatus === 'saved'
                    ? 'Location saved'
                    : 'Add location'}
              </ActionButton>
              {locationMessage ? (
                <span className="text-sm text-[#7f4b67]">{locationMessage}</span>
              ) : null}
            </div>
          </div>

          {state.error ? (
            <p role="alert" className="mt-4 rounded-none border border-[#ef65ad]/30 bg-[#fff0f7] px-4 py-3 text-sm text-[#9e1b55]">
              {state.error}
            </p>
          ) : null}

          <div className="scan-details-actions mt-6 flex flex-wrap gap-3">
            <ActionButton
              disabled={state.identity?.kind === 'new' && Boolean(newNameError)}
              onClick={() => void saveEncounter()}
            >
              <span className="scan-desktop-label">Save encounter</span>
              <span className="scan-mobile-label">Save cat</span>
            </ActionButton>
            <ActionButton variant="secondary" onClick={goBack}>
              <span className="scan-desktop-label">Change identity</span>
              <span className="scan-mobile-label">Change cat</span>
            </ActionButton>
          </div>
        </section>
      )}

      {state.step === 'saving' && (
        <section className="paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <div className="mx-auto max-w-lg py-12 text-center">
            <div className="meow-spinner mx-auto" aria-hidden="true" />
            <h1 className="mt-6 font-serif text-3xl font-semibold">Saving this encounter locally</h1>
            <p className="mt-3 leading-7 text-[#7f4b67]">
              Saving this cat's photo and encounter details in your browser.
            </p>
          </div>
        </section>
      )}

      {state.step === 'success' && (
        <section className="paper-shadow rounded-none border border-black/10 bg-[#fff6fb] p-5 sm:p-7">
          <div className="mx-auto max-w-lg py-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#ffd4e9] text-3xl">✓</div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#a91f68]">
              Saved locally
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold">
              {state.savedCatName
                ? state.identity?.kind === 'existing'
                  ? 'Another ' + state.savedCatName + ' encounter saved.'
                  : state.savedCatName + ' is in your Meowfolio.'
                : 'Encounter saved.'}
            </h1>
            <p className="mt-3 leading-7 text-[#7f4b67]">
              Your cat's photo and encounter details are saved in this browser.
            </p>
            <div className="mt-6">
              <ActionButton onClick={onExit}>Back to collection</ActionButton>
            </div>
          </div>
        </section>
      )}

      {discardOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
        >
          <div className="paper-shadow w-full max-w-md rounded-[26px] bg-[#fff6fb] p-6">
            <h2 id="discard-title" className="font-serif text-2xl font-semibold">
              Discard this unfinished encounter?
            </h2>
            <p className="mt-3 leading-7 text-[#7f4b67]">
              The photo, identity choice, name, and note in this scan will be cleared. Downloaded
              model files can stay cached.
            </p>
            <div className="scan-action-row mt-6">
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
