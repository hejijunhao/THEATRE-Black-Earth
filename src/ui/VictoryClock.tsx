// Living victory clock — one ritual: theatre headline + decisive-city arc.
// Support and army sit as secondary ink, not equal dials.

import { useStore } from '../game/state/store';
import { LEXICON } from './lexicon';
import { theatreBalance } from './theatreBalance';
import { Tip } from './Tip';

function TheatreArc({
  held,
  total,
  tone,
}: {
  held: number;
  total: number;
  tone: string;
}) {
  const p = Math.max(0, Math.min(1, total > 0 ? held / total : 0));
  const r = 26;
  const c = 2 * Math.PI * r * 0.75;
  return (
    <svg className={`clock-arc ${tone}`} viewBox="0 0 72 72" aria-hidden>
      <circle className="arc-track" cx="36" cy="36" r={r} />
      <circle
        className="arc-fill"
        cx="36"
        cy="36"
        r={r}
        strokeDasharray={`${p * c} ${c}`}
      />
      <text x="36" y="34">{held}/{total}</text>
      <text className="arc-lab" x="36" y="46">decisive</text>
    </svg>
  );
}

export function VictoryClock() {
  const game = useStore((s) => s.game);
  if (!game) return null;
  const b = theatreBalance(game);

  return (
    <div className="victory-clock ritual" role="status" aria-label={`Theatre balance: ${b.headline}`}>
      <Tip
        lexicon
        lexiconId="cities"
        title={`${b.headline} · theatre`}
        text={LEXICON.cities.doctrine}
        now={b.line}
      >
        <div className={`clock-head ${b.headline.toLowerCase()}`}>
          <span className="clock-kicker">Theatre</span>
          <span className="clock-headline">{b.headline}</span>
          <span className="clock-why">{b.line}</span>
          <div className="clock-secondary">
            <Tip lexicon lexiconId="warSupport" title={LEXICON.warSupport.title} text={LEXICON.warSupport.doctrine} now={`${b.support.label} · ${b.support.sub}`}>
              <span className={`clk-sec ${b.support.tone}`}>Support {b.support.label}</span>
            </Tip>
            <Tip lexicon lexiconId="army" title={LEXICON.army.title} text={LEXICON.army.doctrine} now={`${b.army.ownCount} formations · ${b.army.sub}`}>
              <span className={`clk-sec ${b.army.tone}`}>Army {b.army.label}</span>
            </Tip>
          </div>
        </div>
      </Tip>
      <Tip
        lexicon
        lexiconId="cities"
        block
        title={LEXICON.cities.title}
        text={LEXICON.cities.doctrine}
        now={`${b.cities.decisiveHeld}/${b.cities.decisiveTotal} decisive · ${b.cities.held} VP (${b.cities.delta >= 0 ? '+' : ''}${b.cities.delta}).`}
      >
        <div className="clock-hero">
          <TheatreArc
            held={b.cities.decisiveHeld}
            total={b.cities.decisiveTotal}
            tone={b.cities.tone}
          />
          {b.decisiveCities.length > 0 && (
            <div className="clock-track" aria-label="Decisive cities">
              {b.decisiveCities.map((c) => (
                <span key={c.id} className={`clock-bead ${c.held ? 'held' : 'lost'}`} title={c.name}>
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Tip>
    </div>
  );
}
