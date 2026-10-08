import { useEffect, useRef, useState, type PointerEvent } from 'react';

/** Non-destructive viewer: full saved photo remains unchanged in IndexedDB. */
export function PhotoViewer({ src, alt, onClose }: {
  src: string; alt: string; onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const points = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      last.current = null;
    } else if (points.current.size === 1) {
      last.current = { x: event.clientX, y: event.clientY };
    }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size >= 2 && pinch.current) {
      const [a, b] = [...points.current.values()];
      setZoom(Math.max(1, Math.min(5, pinch.current.zoom *
        Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.distance))));
    } else if (last.current && zoom > 1) {
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      setOffset(value => ({ x: value.x + dx, y: value.y + dy }));
      last.current = { x: event.clientX, y: event.clientY };
    }
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    points.current.delete(event.pointerId);
    pinch.current = null;
    last.current = points.current.size === 1 ? [...points.current.values()][0] : null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }
  function reset() { setZoom(1); setOffset({ x: 0, y: 0 }); }
  return (
    <div className="photo-viewer-backdrop" role="dialog" aria-modal="true" aria-label={'View full photo: ' + alt}>
      <div className="photo-viewer-topbar">
        <button type="button" className="pixel-secondary" onClick={onClose}>← Close photo</button>
        <span>♡ original photo · pinch to zoom</span>
        <button type="button" className="pixel-secondary" onClick={reset}>↺ Reset</button>
      </div>
      <div
        className="photo-viewer-stage"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={reset}
      >
        <img src={src} alt={alt} draggable={false}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} />
      </div>
      <p className="photo-viewer-caption">Pinch to zoom • drag when zoomed • double tap or Reset to fit</p>
    </div>
  );
}
