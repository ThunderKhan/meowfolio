import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { CatRecord, EncounterRecord } from '../storage/types';
import { renderStoryCard, STORY_WIDTH, type StoryTheme } from './storyRenderer';
import {
  clampPosition, DEFAULT_STORY_PHOTO, photoPlacement, STORY_PHOTO_FRAME,
  type StoryPhotoFit, type StoryPhotoSettings, type StoryPhotoSource,
} from './storyFraming';

interface RenderedStory {
  url: string;
  blob: Blob;
}

export function StoryStudio({
  cat,
  encounter,
  ownerName,
}: {
  cat: CatRecord;
  encounter: EncounterRecord;
  ownerName: string | null;
}) {
  const [theme, setTheme] = useState<StoryTheme>('candy');
  const [includeNote, setIncludeNote] = useState(false);
  const [photo, setPhoto] = useState<StoryPhotoSettings>({ ...DEFAULT_STORY_PHOTO });
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [output, setOutput] = useState<RenderedStory | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const lastUrl = useRef<string | null>(null);
  const previewRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const sourceImage = photo.source === 'closeup' ? encounter.crop : encounter.photo;
  const placement = useMemo(
    () => imageSize ? photoPlacement(imageSize.width, imageSize.height, photo) : null,
    [imageSize, photo],
  );

  // Compute the actual source image's geometry. The AI's bounding-box crop
  // intentionally is NOT the default because it can clip ears and whiskers.
  useEffect(() => {
    let active = true;
    setImageSize(null);
    void createImageBitmap(sourceImage).then((bitmap) => {
      if (active) setImageSize({ width: bitmap.width, height: bitmap.height });
      bitmap.close();
    }).catch(() => {
      if (active) setError('Could not read this photo. Try switching image source.');
    });
    return () => { active = false; };
  }, [sourceImage]);

  useEffect(() => () => {
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
  }, []);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(null);
    // Coalesce drag and slider updates, especially on mid-range Android phones.
    // Export/share remain disabled until the latest high-resolution PNG is ready.
    const timeout = window.setTimeout(() => {
      void renderStoryCard({ cat, encounter, ownerName, theme, includeNote, photoSettings: photo })
        .then((image) => {
          if (!active) return;
          const url = URL.createObjectURL(image);
          const previous = lastUrl.current;
          lastUrl.current = url;
          setOutput({ url, blob: image });
          setBusy(false);
          if (previous) URL.revokeObjectURL(previous);
        }).catch((reason: unknown) => {
          if (!active) return;
          setError(reason instanceof Error ? reason.message : 'Could not make a story card.');
          setBusy(false);
        });
    }, 90);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [cat, encounter, ownerName, theme, includeNote, photo]);

  function setSource(source: StoryPhotoSource) {
    setPhoto((value) => ({
      ...value, source, zoom: 100, positionX: 0, positionY: 0,
    }));
  }

  function setFit(fit: StoryPhotoFit) {
    setPhoto((value) => ({
      ...value, fit, positionX: 0, positionY: 0,
    }));
  }

  function resetFraming() {
    setPhoto({ ...DEFAULT_STORY_PHOTO });
  }

  function moveBy(deltaX: number, deltaY: number) {
    setPhoto((value) => ({
      ...value,
      positionX: clampPosition(value.positionX + deltaX),
      positionY: clampPosition(value.positionY + deltaY),
    }));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (touches.current.size === 2) {
      const [a, b] = Array.from(touches.current.values());
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: photo.zoom };
      drag.current = null;
    } else if (touches.current.size === 1) {
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!touches.current.has(event.pointerId)) return;
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(touches.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const zoom = Math.max(100, Math.min(300, Math.round(pinch.current.zoom * distance / Math.max(pinch.current.distance, 1))));
      setPhoto(value => ({ ...value, zoom }));
      return;
    }
    const previous = drag.current;
    if (!previous || previous.id !== event.pointerId || !placement) return;
    const previewWidth = previewRef.current?.getBoundingClientRect().width;
    if (!previewWidth) return;
    const changeX = (event.clientX - previous.x) * STORY_WIDTH / previewWidth;
    const changeY = (event.clientY - previous.y) * STORY_WIDTH / previewWidth;
    drag.current = { ...previous, x: event.clientX, y: event.clientY };
    moveBy(
      placement.maxOffsetX ? changeX / placement.maxOffsetX * 100 : 0,
      placement.maxOffsetY ? changeY / placement.maxOffsetY * 100 : 0,
    );
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    touches.current.delete(event.pointerId);
    pinch.current = null;
    if (drag.current?.id === event.pointerId) drag.current = null;
    if (touches.current.size === 1) {
      const [id, position] = Array.from(touches.current.entries())[0];
      drag.current = { id, ...position };
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onPhotoKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const movements: Record<string, [number, number]> = {
      ArrowLeft: [-10, 0], ArrowRight: [10, 0],
      ArrowUp: [0, -10], ArrowDown: [0, 10],
    };
    const move = movements[event.key];
    if (!move) return;
    event.preventDefault();
    moveBy(move[0], move[1]);
  }

  function download() {
    if (!output || busy || error) return;
    const safe = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
    const a = document.createElement('a');
    a.href = output.url;
    a.download = 'meowfolio-' + safe + '-story.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function share() {
    if (!output || busy || error) return;
    const file = new File([output.blob], 'meowfolio-story.png', { type: 'image/png' });
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
      setShareError('Sharing files is not available here. Save the image, then post it to your story.');
      return;
    }
    // Share directly from the tap, retaining mobile user activation.
    void navigator.share({ files: [file], title: 'My Meowfolio story' }).catch((reason: unknown) => {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setShareError('Sharing was unavailable. You can still save the PNG.');
    });
  }

  return (
    <section className="pixel-window story-studio mt-6" aria-label="Create a story card">
      <div className="pixel-window-title"><span>✦ STORY_CARD.EXE</span><span className="pixel-window-hint">Story maker</span></div>
      <div className="story-studio-body">
        <div className="story-controls">
          <p className="pixel-kicker">Make it yours</p>
          <h2 className="pixel-heading mt-2 text-2xl">Customize your card</h2>
          <p className="mt-3 text-sm leading-6 text-[#683b55]">
            Choose a style, frame the photo, and share your memory.
            Everything is created privately in this browser.
          </p>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold">Choose a style</legend>
            <div className="story-theme-options mt-3">
              <label className={'story-theme-option story-theme-candy' + (theme === 'candy' ? ' is-selected' : '')}>
                <input type="radio" name="story-theme" value="candy" aria-label="Candy scrapbook" checked={theme === 'candy'} onChange={() => setTheme('candy')} />
                <span>♡</span><b>Candy scrapbook</b>
              </label>
              <label className={'story-theme-option story-theme-midnight' + (theme === 'midnight' ? ' is-selected' : '')}>
                <input type="radio" name="story-theme" value="midnight" aria-label="Midnight diary" checked={theme === 'midnight'} onChange={() => setTheme('midnight')} />
                <span>✦</span><b>Midnight diary</b>
              </label>
              <label className={'story-theme-option story-theme-buttercream' + (theme === 'buttercream' ? ' is-selected' : '')}>
                <input type="radio" name="story-theme" value="buttercream" aria-label="Golden hour" checked={theme === 'buttercream'} onChange={() => setTheme('buttercream')} />
                <span>☀</span><b>Golden hour</b>
              </label>
            </div>
          </fieldset>

          <fieldset className="story-framing-fieldset mt-6">
            <legend className="text-sm font-bold">Frame your photo</legend>
            <p className="mt-2 text-xs leading-5 text-[#74445f]">The whole photo is shown by default, without cutting off ears or tails.</p>
            <div className="story-segmented mt-3" aria-label="Photo source">
              <label className={photo.source === 'original' ? 'is-selected' : ''}>
                <input type="radio" name="photo-source" aria-label="Original photo" checked={photo.source === 'original'} onChange={() => setSource('original')} />
                <span>Original photo</span>
              </label>
              <label className={photo.source === 'closeup' ? 'is-selected' : ''}>
                <input type="radio" name="photo-source" aria-label="Cat close-up" checked={photo.source === 'closeup'} onChange={() => setSource('closeup')} />
                <span>Cat close-up</span>
              </label>
            </div>
            <div className="story-segmented mt-3" aria-label="Photo fit">
              <label className={photo.fit === 'contain' ? 'is-selected' : ''}>
                <input type="radio" name="photo-fit" aria-label="Fit whole photo" checked={photo.fit === 'contain'} onChange={() => setFit('contain')} />
                <span>Fit whole photo</span>
              </label>
              <label className={photo.fit === 'cover' ? 'is-selected' : ''}>
                <input type="radio" name="photo-fit" aria-label="Fill the frame" checked={photo.fit === 'cover'} onChange={() => setFit('cover')} />
                <span>Fill the frame</span>
              </label>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#74445f]">
              Pinch to zoom and drag the photo to choose the perfect framing.
            </p>
            <details className="story-advanced mt-3">
              <summary>Fine-tune zoom and position</summary>
              <div className="story-advanced-body">
            <label className="story-range-label mt-4" htmlFor="story-zoom">
              <span>Zoom</span><output htmlFor="story-zoom">{photo.zoom}%</output>
            </label>
            <input
              id="story-zoom" type="range" min={100} max={300} step={5} value={photo.zoom}
              onChange={(event) => setPhoto((value) => ({ ...value, zoom: Number(event.target.value) }))}
            />
            <label className="story-range-label mt-3" htmlFor="story-pan-x">
              <span>Horizontal position</span>
            </label>
            <input
              id="story-pan-x" type="range" min={-100} max={100} step={5}
              value={photo.positionX} disabled={!placement?.maxOffsetX}
              onChange={(event) => setPhoto((value) => ({ ...value, positionX: Number(event.target.value) }))}
            />
            <label className="story-range-label mt-3" htmlFor="story-pan-y">
              <span>Vertical position</span>
            </label>
            <input
              id="story-pan-y" type="range" min={-100} max={100} step={5}
              value={photo.positionY} disabled={!placement?.maxOffsetY}
              onChange={(event) => setPhoto((value) => ({ ...value, positionY: Number(event.target.value) }))}
            />

              </div>
            </details>
            <button className="story-reset-button mt-3" type="button" onClick={resetFraming}>Reset framing</button>
          </fieldset>

          {encounter.note?.trim() && (
            <label className="story-note-toggle mt-5">
              <input type="checkbox" checked={includeNote} onChange={(event) => setIncludeNote(event.target.checked)} />
              Include my encounter note (off by default)
            </label>
          )}
          <p className="story-collector-note mt-4 text-sm leading-5 text-[#75435f]">
            Collected by {ownerName ? ownerName : 'a cat-loving human'} · edit your local profile to change this.
          </p>
          <div className="story-export-actions mt-6">
            <button className="pixel-primary" type="button" onClick={download} disabled={!output || busy || !!error}>
              Save story PNG
            </button>
            <button className="pixel-secondary" type="button" onClick={share} disabled={!output || busy || !!error}>
              Share image
            </button>
          </div>
          {shareError && <p role="status" className="mt-3 text-xs text-[#713f5b]">{shareError}</p>}
        </div>
        <div className="story-preview-wrap">
          {busy && <p className="story-preview-status" role="status">Updating story preview…</p>}
          {error && <p role="alert">{error}</p>}
          {output && (
            <div className="story-preview-interactive">
              <img
                ref={previewRef}
                className="story-preview"
                src={output.url}
                alt={'9 by 16 story preview for ' + cat.name}
                draggable={false}
              />
              <div
                className="story-photo-drag-target"
                role="button"
                tabIndex={0}
                aria-label="Drag photo to reposition, or use arrow keys"
                aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onKeyDown={onPhotoKeyDown}
                style={{
                  left: (STORY_PHOTO_FRAME.x / 1080 * 100) + '%',
                  top: (STORY_PHOTO_FRAME.y / 1920 * 100) + '%',
                  width: (STORY_PHOTO_FRAME.size / 1080 * 100) + '%',
                  height: (STORY_PHOTO_FRAME.size / 1920 * 100) + '%',
                }}
              />
            </div>
          )}
          <p className="mt-3 text-center text-xs font-bold text-[#8a3c67]">
            9:16 STORY PREVIEW · PINCH TO ZOOM
          </p>
        </div>
      </div>
    </section>
  );
}
