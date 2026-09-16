// Encyclopedia tooltip: doctrine paragraph + optional "why this colour now".
// One-line Tips still work; pass lexicon (or now=) for the staff-card treatment.

import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { LEXICON, LexiconId } from './lexicon';

interface TipProps {
  title?: string;
  text: ReactNode;
  children: ReactNode;
  block?: boolean;
  lexicon?: boolean;
  now?: string;
}

export function Tip({ title, text, children, block, lexicon, now }: TipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const staff = Boolean(lexicon || now);

  return (
    <span
      style={{ display: block ? 'block' : 'inline-flex', cursor: 'default' }}
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
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
            {title && <div className="tt-title">{title}</div>}
            {typeof text === 'string' ? <p>{text}</p> : text}
            {now && <p className="tt-now">Now: {now}</p>}
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
    <Tip title={entry.title} text={entry.doctrine} now={now} lexicon block={block}>
      {children}
    </Tip>
  );
}
