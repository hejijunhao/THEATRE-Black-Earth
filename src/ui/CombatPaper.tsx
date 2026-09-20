// Shared combat sheet — estimate and after-action are one paper family.
// Wash, not curtain. Docks from the contested hex's screen position.
// ASSAULT / DISPATCH / FIRES sit on a thin stamp strip, not a rubber badge.

import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { projectHex } from '../map/hexScreen';
import { TileId } from '../game/types';
import { PaperStamp, stampStrip } from './combatChrome';
import { paperLayoutFromScreen, paperOverClass, SHEET_WIDTH } from './paperLayout';

export function CombatPaper({
  tile,
  stamp,
  kicker,
  headline,
  headlineClass,
  detail,
  titleId,
  children,
}: {
  tile: TileId;
  stamp: PaperStamp;
  kicker: string;
  headline: string;
  headlineClass?: string;
  detail: string;
  titleId: string;
  children: ReactNode;
}) {
  const strip = stampStrip(stamp, kicker);
  const sheetRef = useRef<HTMLElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  const [sheetH, setSheetH] = useState(320);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pt = projectHex(tile);
      setAnchor((prev) => {
        if (!pt || !pt.visible) return null;
        if (prev && Math.abs(prev.x - pt.x) < 0.6 && Math.abs(prev.y - pt.y) < 0.6) return prev;
        return { x: pt.x, y: pt.y };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tile]);

  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const measure = () => setSheetH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hud = overRef.current?.getBoundingClientRect();
  const layout = anchor && hud
    ? paperLayoutFromScreen(
      { x: anchor.x - hud.left, y: anchor.y - hud.top },
      { w: hud.width, h: hud.height },
      { w: SHEET_WIDTH, h: sheetH },
    )
    : null;
  const cls = layout ? `brief-over anchored dock-${layout.side}` : paperOverClass(tile);
  const wash = layout
    ? { '--hex-x': `${layout.callout.x1}px`, '--hex-y': `${layout.callout.y1}px` } as CSSProperties
    : undefined;

  return (
    <div ref={overRef} className={cls} style={wash}>
      {layout && (
        <svg className="paper-callout" aria-hidden>
          <line
            x1={layout.callout.x1}
            y1={layout.callout.y1}
            x2={layout.callout.x2}
            y2={layout.callout.y2}
          />
          <circle className="paper-pin-halo" cx={layout.callout.x1} cy={layout.callout.y1} r={9} />
          <circle className="paper-pin" cx={layout.callout.x1} cy={layout.callout.y1} r={5} />
        </svg>
      )}
      <article
        ref={sheetRef}
        className="brief-sheet dispatch aar"
        role="dialog"
        aria-labelledby={titleId}
        style={layout ? { left: layout.left, top: layout.top, width: layout.width } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brief-holes" aria-hidden>
          <i /><i /><i />
        </div>
        <div className="stamp-strip">
          <span className="stamp-kicker">{strip.kicker}</span>
          <span className="stamp-mark">{strip.mark}</span>
        </div>
        <header className="aar-head">
          <h2 className={`aar-headline${headlineClass ? ` ${headlineClass}` : ''}`} id={titleId}>
            {headline}
          </h2>
          <p className="aar-detail">{detail}</p>
        </header>
        <div className="body">{children}</div>
      </article>
    </div>
  );
}
