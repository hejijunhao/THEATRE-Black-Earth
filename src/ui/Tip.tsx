// Lightweight tooltip wrapper: hover any wrapped element to get a positioned
// tooltip with a title and explanation.

import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';

interface TipProps {
  title?: string;
  text: ReactNode;
  children: ReactNode;
  block?: boolean;
}

export function Tip({ title, text, children, block }: TipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

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
            className="tooltip"
            style={{
              left: Math.min(pos.x + 14, window.innerWidth - 300),
              top: Math.min(pos.y + 16, window.innerHeight - 120),
            }}
          >
            {title && <div className="tt-title">{title}</div>}
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
