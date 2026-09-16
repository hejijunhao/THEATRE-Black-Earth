// Shared combat sheet — estimate and after-action are one paper family.
// Wash, not curtain. Docks beside the contested hex. Not a centered plaque.

import { ReactNode } from 'react';
import { TileId } from '../game/types';
import { paperDock, paperOverClass } from './combatPaper';

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
  const dock = paperDock(tile);
  const callout = dock.side === 'east'
    ? 'M 8 36 C 26 38, 44 46, 58 54'
    : 'M 92 36 C 74 38, 56 46, 42 54';

  return (
    <div className={paperOverClass(tile)}>
      <svg className="paper-callout" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={callout} />
      </svg>
      <article
        className="brief-sheet dispatch aar"
        role="dialog"
        aria-labelledby={titleId}
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
