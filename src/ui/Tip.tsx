// Encyclopedia tooltip: doctrine paragraph + optional "why this colour now".
// Hover is secondary. Click a non-button surface, or press E, to pin the ledger.

import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../game/state/store';
import { LEXICON, LexiconId } from './lexicon';

interface TipProps {
  title?: string;
  text: ReactNode;
  children: ReactNode;
  block?: boolean;
  lexicon?: boolean;
  lexiconId?: LexiconId;
  now?: string;
}

export function Tip({ title, text, children, block, lexicon, lexiconId, now }: TipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const staff = Boolean(lexicon || now);
  const hoverLexicon = useStore((s) => s.hoverLexicon);
  const pinLexicon = useStore((s) => s.pinLexicon);
  const pinned = useStore((s) => s.pinnedLexiconId);

  return (
    <span
      style={{ display: block ? 'block' : 'inline-flex', cursor: staff ? 'help' : 'default' }}
      onMouseEnter={(e) => {
        setPos({ x: e.clientX, y: e.clientY });
        if (lexiconId) hoverLexicon(lexiconId);
      }}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => {
        setPos(null);
        if (lexiconId) hoverLexicon(null);
      }}
      onClick={(e) => {
        if (!lexiconId) return;
        const t = e.target as HTMLElement;
        if (t.closest('button')) return;
        e.stopPropagation();
        pinLexicon(pinned === lexiconId ? null : lexiconId);
      }}
    >
      {children}
      {pos &&
        createPortal(
          <div
            className={`tooltip${staff ? ' lexicon' : ''}`}
            style={{
              left: Math.min(pos.x + 14, window.innerWidth - 380),
              top: Math.min(pos.y + 16, window.innerHeight - 200),
            }}
          >
            {staff && <div className="tt-kicker">Doctrine</div>}
            {title && <div className="tt-title">{title}</div>}
            {typeof text === 'string' ? <p className="tt-doctrine">{text}</p> : text}
            {now && <p className="tt-now">Now: {now}</p>}
            {lexiconId && (
              <p className="tt-pin">
                {pinned === lexiconId ? 'Pinned · E to unpin' : 'Click or E — pin the ledger'}
              </p>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** Hover a control; show the named doctrine entry and a live "now" line. */
export function LexiconTip({
  id,
  now,
  children,
  block,
}: {
  id: LexiconId;
  now?: string;
  children: ReactNode;
  block?: boolean;
}) {
  const entry = LEXICON[id];
  return (
    <Tip
      title={entry.title}
      text={entry.doctrine}
      now={now}
      lexicon
      lexiconId={id}
      block={block}
    >
      {children}
    </Tip>
  );
}
