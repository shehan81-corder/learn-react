import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { clamp } from '../lib/format.ts';

interface Props {
  direction?: 'horizontal' | 'vertical';
  first: ReactNode;
  second: ReactNode;
  /** Fraction of the first pane, 0..1 */
  defaultRatio?: number;
  min?: number;
  max?: number;
  storageKey?: string;
  className?: string;
}

export function SplitPane({ direction = 'horizontal', first, second, defaultRatio = 0.5, min = 0.2, max = 0.8, storageKey, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number>(() => {
    if (!storageKey) return defaultRatio;
    try {
      const raw = localStorage.getItem(storageKey);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? clamp(n, min, max) : defaultRatio;
    } catch {
      return defaultRatio;
    }
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, String(ratio));
    } catch {
      /* ignore */
    }
  }, [ratio, storageKey]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const r = direction === 'horizontal' ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
      setRatio(clamp(r, min, max));
    },
    [dragging, direction, min, max],
  );

  const stop = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.02;
      const dec = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const inc = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      if (e.key === dec) setRatio((r) => clamp(r - step, min, max));
      if (e.key === inc) setRatio((r) => clamp(r + step, min, max));
    },
    [direction, min, max],
  );

  const pct = `${(ratio * 100).toFixed(2)}%`;
  return (
    <div ref={ref} className={`split split-${direction} ${dragging ? 'is-dragging' : ''} ${className ?? ''}`.trim()}>
      <div className="split-pane" style={direction === 'horizontal' ? { width: pct } : { height: pct }}>
        {first}
      </div>
      <div
        className="split-handle"
        role="separator"
        aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={onKeyDown}
        onDoubleClick={() => setRatio(defaultRatio)}
        title="Drag to resize · double-click to reset"
      />
      <div className="split-pane split-pane-grow">{second}</div>
    </div>
  );
}
