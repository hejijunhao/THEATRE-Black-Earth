// Theatre pulse opened: a thin overlay in the strip's language.
// Headline, beads with names, support/army as secondary ink. Not a plaque.

import { useStore } from '../game/state/store';
import { showTheatreClockPanel } from './hudChrome';
import { LEXICON } from './lexicon';
import { theatreBalance } from './theatreBalance';
import { Tip } from './Tip';

export function VictoryClock() {
  const game = useStore((s) => s.game);
  const showTheatreClock = useStore((s) => s.showTheatreClock);
  const setShowTheatreClock = useStore((s) => s.setShowTheatreClock);
  if (!game || !showTheatreClockPanel({ showTheatreClock })) return null;
  const b = theatreBalance(game);

  return (
    <div
      className="victory-clock instrument-overlay on-demand"
      role="dialog"
      aria-label={`Theatre balance: ${b.headline}`}
    >
      <Tip
        lexicon
        lexiconId="cities"
        title={`${b.headline} · theatre`}
        text={LEXICON.cities.doctrine}
        now={b.line}
      >
        <div className={`clk-line ${b.headline.toLowerCase()}`}>
          <span className="clk-word">{b.headline}</span>
          <span className="clk-why">{b.line}</span>
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
        <div className="clk-beads" aria-label="Decisive cities">
          {b.decisiveCities.map((c) => (
            <span key={c.id} className={`clk-bead ${c.held ? 'held' : 'lost'}`} title={c.name}>
              <i />
              {c.name}
            </span>
          ))}
        </div>
      </Tip>
      <div className="clk-foot">
        <Tip lexicon lexiconId="warSupport" title={LEXICON.warSupport.title} text={LEXICON.warSupport.doctrine} now={`${b.support.label} · ${b.support.sub}`}>
          <span className={`clk-sec ${b.support.tone}`}>Support {b.support.label}</span>
        </Tip>
        <Tip lexicon lexiconId="army" title={LEXICON.army.title} text={LEXICON.army.doctrine} now={`${b.army.ownCount} formations · ${b.army.sub}`}>
          <span className={`clk-sec ${b.army.tone}`}>Army {b.army.label}</span>
        </Tip>
        <button
          type="button"
          className="clock-close"
          onClick={() => setShowTheatreClock(false)}
          aria-label="Close theatre clock"
        >
          Close
        </button>
      </div>
    </div>
  );
}
