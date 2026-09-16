// Living victory clock — cities / war support / army as one instrument.
// Not three ledger cells. The headline is why you are winning or losing.

import { useStore } from '../game/state/store';
import { LEXICON } from './lexicon';
import { theatreBalance } from './theatreBalance';
import { Tip } from './Tip';

function Dial({
  label,
  value,
  max,
  numeral,
  sub,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  numeral: string;
  sub: string;
  tone: string;
}) {
  const p = Math.max(0, Math.min(1, value / Math.max(max, 1)));
  return (
    <div className={`clock-dial ${tone}`}>
      <span
        className="clock-ring"
        style={{ ['--p' as string]: `${Math.round(p * 100)}%` }}
        aria-hidden
      />
      <span className="clock-num">{numeral}</span>
      <span className="clock-lab">{label}</span>
      <span className="clock-sub">{sub}</span>
    </div>
  );
}

export function VictoryClock() {
  const game = useStore((s) => s.game);
  if (!game) return null;
  const b = theatreBalance(game);

  return (
    <div className="victory-clock" role="status" aria-label={`Theatre balance: ${b.headline}`}>
      <Tip
        lexicon
        title={`${b.headline} · theatre`}
        text={LEXICON.cities.doctrine}
        now={b.line}
      >
        <div className={`clock-head ${b.headline.toLowerCase()}`}>
          <span className="clock-kicker">Theatre</span>
          <span className="clock-headline">{b.headline}</span>
        </div>
      </Tip>
      <div className="clock-needles">
        <Tip lexicon block title={LEXICON.cities.title} text={LEXICON.cities.doctrine} now={`${b.cities.label} VP · ${b.cities.sub}`}>
          <Dial label="Cities" value={b.cities.value} max={b.cities.max} numeral={b.cities.label} sub={b.cities.sub} tone={b.cities.tone} />
        </Tip>
        <Tip lexicon block title={LEXICON.warSupport.title} text={LEXICON.warSupport.doctrine} now={`${b.support.label} · ${b.support.sub}`}>
          <Dial label="Support" value={b.support.value} max={100} numeral={b.support.label} sub={b.support.sub} tone={b.support.tone} />
        </Tip>
        <Tip lexicon block title={LEXICON.army.title} text={LEXICON.army.doctrine} now={`${b.army.ownCount} formations · ${b.army.sub}`}>
          <Dial label="Army" value={b.army.value} max={b.army.max} numeral={b.army.label} sub={b.army.sub} tone={b.army.tone} />
        </Tip>
      </div>
    </div>
  );
}
