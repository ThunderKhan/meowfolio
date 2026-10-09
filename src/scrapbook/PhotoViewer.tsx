import {
  useEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
} from 'react';

export interface ViewerPhoto {
  src: string;
  alt: string;
}

/** Read-only, fit-first gallery. Original Blobs never leave IndexedDB. */
export function PhotoViewer({
  photos,
  initialIndex = 0,
  onClose,
}: {
  photos: ViewerPhoto[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, photos.length - 1)));
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const swipe = useRef<{
    id: number; startX: number; startY: number; x: number; y: number;
  } | null>(null);

  const photo = photos[index] ?? photos[0];
  const canBrowse = photos.length > 1;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    points.current.clear();
    last.current = null;
    pinch.current = null;
    swipe.current = null;
  }

  function navigate(direction: number) {
    if (!canBrowse) return;
    setIndex((current) => (current + direction + photos.length) % photos.length);
    reset();
  }

  useEffect(() => {
    function handleKeys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (photos.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        setIndex((current) => (
          current + (event.key === 'ArrowRight' ? 1 : -1) + photos.length
        ) % photos.length);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        points.current.clear();
        last.current = null;
        pinch.current = null;
        swipe.current = null;
      }
    }
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [onClose, photos.length]);

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [],
    );
    if (!buttons.length) return;
    const active = document.activeElement;
    if (event.shiftKey && active === buttons[0]) {
      event.preventDefault();
      buttons[buttons.length - 1].focus();
    } else if (!event.shiftKey && active === buttons[buttons.length - 1]) {
      event.preventDefault();
      buttons[0].focus();
    }
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      last.current = null;
      swipe.current = null;
    } else if (points.current.size === 1) {
      last.current = { x: event.clientX, y: event.clientY };
      swipe.current = zoom === 1 && event.pointerType !== 'mouse' ? {
        id: event.pointerId,
        startX: event.clientX, startY: event.clientY,
        x: event.clientX, y: event.clientY,
      } : null;
    }
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size >= 2 && pinch.current) {
      const [a, b] = [...points.current.values()];
      setZoom(Math.max(1, Math.min(5,
        pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) /
        Math.max(1, pinch.current.distance),
      )));
    } else if (last.current && zoom > 1) {
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      setOffset((value) => ({ x: value.x + dx, y: value.y + dy }));
      last.current = { x: event.clientX, y: event.clientY };
    } else if (swipe.current?.id === event.pointerId) {
      swipe.current.x = event.clientX;
      swipe.current.y = event.clientY;
    }
  }

  function up(event: PointerEvent<HTMLDivElement>) {
    const touchSwipe = swipe.current;
    const swiped = canBrowse && zoom === 1 && touchSwipe?.id === event.pointerId &&
      points.current.size === 1 &&
      Math.abs(touchSwipe.x - touchSwipe.startX) > 60 &&
      Math.abs(touchSwipe.x - touchSwipe.startX) >
        1.35 * Math.abs(touchSwipe.y - touchSwipe.startY);

    points.current.delete(event.pointerId);
    pinch.current = null;
    swipe.current = null;
    last.current = points.current.size === 1 ? [...points.current.values()][0] : null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (swiped && touchSwipe) navigate(touchSwipe.x < touchSwipe.startX ? 1 : -1);
  }

  function changeZoom(amount: number) {
    const next = Math.max(1, Math.min(5, zoom + amount));
    setZoom(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  }

  if (!photo) return null;

  return (
    <div
      ref={dialogRef}
      onKeyDown={trapFocus}
      className="photo-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={'View full photo: ' + photo.alt}
    >
      <div className="photo-viewer-topbar">
        <button ref={closeRef} type="button" className="pixel-secondary" onClick={onClose}>
          Close photo
        </button>
        <span className="photo-viewer-topbar-label">Original photo · private to this browser</span>
        <div className="photo-viewer-actions">
          <button type="button" className="pixel-secondary" aria-label="Zoom out"
            disabled={zoom <= 1} onClick={() => changeZoom(-0.5)}>−</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className="pixel-secondary" aria-label="Zoom in"
            disabled={zoom >= 5} onClick={() => changeZoom(0.5)}>+</button>
          <button type="button" className="pixel-secondary" onClick={reset}>Reset</button>
        </div>
      </div>
      <div className="photo-viewer-stage" onPointerDown={down} onPointerMove={move}
        onPointerUp={up} onPointerCancel={up} onDoubleClick={reset}>
        <img
          key={photo.src}
          className="photo-viewer-image"
          src={photo.src}
          alt={photo.alt}
          draggable={false}
          style={{ transform: 'translate(' + offset.x + 'px, ' + offset.y + 'px) scale(' + zoom + ')' }}
        />
        {canBrowse && (
          <>
            <button type="button" className="photo-viewer-nav photo-viewer-prev"
              aria-label="Previous photo" onPointerDown={(event) => event.stopPropagation()}
              onClick={() => navigate(-1)}>‹</button>
            <button type="button" className="photo-viewer-nav photo-viewer-next"
              aria-label="Next photo" onPointerDown={(event) => event.stopPropagation()}
              onClick={() => navigate(1)}>›</button>
          </>
        )}
      </div>
      <div className="photo-viewer-footer">
        <span className="photo-viewer-count" role="status">
          Photo {index + 1} of {photos.length}
        </span>
        <p className="photo-viewer-caption">
          Pinch to zoom or use the buttons · drag to explore
          {canBrowse ? ' · swipe or use ← → for photos' : ''} · Reset to fit
        </p>
      </div>
    </div>
  );
}
