// Shared combat sheet — estimate and after-action are one paper family.
// Wash, not curtain. Docks from the contested hex's screen position.

import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { subscribeHexScreen } from '../map/hexScreen';
import { TileId } from '../game/types';
import { paperLayoutFromScreen, paperOverClass, SHEET_WIDTH } from './combatPaper';

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
  stamp: string;
  kicker: string;
  headline: string;
  headlineClass?: string;
  detail: string;
  titleId: string;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLElement>(null);
  const [sheetH, setSheetH] = useState(320);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => subscribeHexScreen((pt) => {
    setAnchor(pt && pt.tile === tile && pt.visible ? { x: pt.x, y: pt.y } : null);
  }), [tile]);

  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const measure = () => setSheetH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = anchor
    ? paperLayoutFromScreen(anchor, { w: window.innerWidth, h: window.innerHeight }, {
      w: SHEET_WIDTH,
      h: sheetH,
    })
    : null;
  const cls = layout ? `brief-over anchored dock-${layout.side}` : paperOverClass(tile);
  const wash = layout
    ? { '--hex-x': `${layout.callout.x1}px`, '--hex-y': `${layout.callout.y1}px` } as CSSProperties
    : undefined;

  return (
    <div className={cls} style={wash}>
      {layout && (
        <svg className="paper-callout" aria-hidden>
          <line
            x1={layout.callout.x1}
            y1={layout.callout.y1}
            x2={layout.callout.x2}
            y2={layout.callout.y2}
          />
          <circle className="paper-pin" cx={layout.callout.x1} cy={layout.callout.y1} r={4} />
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
        <div className="stamp">{stamp}</div>
        <header className="aar-head">
          <div className="aar-kicker">{kicker}</div>
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
