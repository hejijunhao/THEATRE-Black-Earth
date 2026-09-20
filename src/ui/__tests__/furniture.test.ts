import { describe, expect, it } from 'vitest';
import { buildInitialState } from '../../game/scenarios/build';
import { cycleUnspent, formationLane, frontSector, SECTOR_ORDER } from '../boardChrome';
import {
  hudFrame,
  showCommandBench,
  showDossierPanel,
  showJournalPanel,
  showOrdersHint,
  showTheatreClockPanel,
} from '../hudChrome';
import { outlinerChrome, outlinerListMounted } from '../outlinerChrome';
import { rankReasons, reasonCopy, reasonWeight } from '../briefingCopy';
import { paperDock, paperLayoutFromScreen, SHEET_GAP } from '../paperLayout';
import { chronologyTile } from '../journalChronology';
import { bindChronology, parseDice } from '../journalChronology';
import {
  factionMark,
  headerHasProductWordmark,
  PLAY_HEADER_WORDMARK,
  resourceChips,
  weekWeatherChip,
} from '../playHeader';
import { theatreBalance } from '../theatreBalance';
import {
  aarOddsCaption,
  aarVerdictShift,
  estimateDetail,
  PAPER_STAMPS,
  paperCopyIsNumeric,
  paperStamp,
  stampIsBoxedRubber,
  stampStrip,
  stampStripIsSubtractive,
  strengthNowLine,
} from '../combatChrome';
import { CombatFactor, NotificationEntry } from '../../game/types';

function factor(label: string, value: number): CombatFactor {
  return { label, value, side: value < 0 ? 'attacker' : 'defender' };
}

describe('staff estimate ranking', () => {
  it('keeps at most five named reasons and drops noise', () => {
    const ranked = rankReasons([
      factor('Terrain (Urban)', 0.4),
      factor('Entrenchment (2)', 0.24),
      factor('Weather (Mud)', -0.15),
      factor('Attacker supply (strained)', -0.12),
      factor('Artillery support', 0.08),
      factor('Veterancy', 0.05),
      factor('Tiny', 0.02),
    ]);
    expect(ranked).toHaveLength(5);
    expect(ranked[0].label).toMatch(/Urban/);
    expect(ranked.some((f) => f.label === 'Tiny')).toBe(false);
    expect(ranked.every((f) => Math.abs(f.value) >= 0.04)).toBe(true);
  });

  it('writes named copy, not a percentage dump', () => {
    const copy = reasonCopy(factor('Entrenchment (2)', 0.24));
    expect(copy).toMatch(/dug in/i);
    expect(copy).not.toMatch(/%/);
    expect(reasonCopy(factor('River assault', -0.3))).toMatch(/wet bank/i);
    expect(reasonWeight(factor('Terrain (Urban)', 0.4))).toBe(1);
    expect(reasonWeight(factor('Weather (Mud)', -0.15))).toBeLessThan(1);
  });
});

describe('combat paper stamp strip', () => {
  it('classifies Assault / Dispatch / Fires on a subtractive strip, not a rubber badge', () => {
    expect(paperStamp('assault')).toBe('Assault');
    expect(paperStamp('dispatch')).toBe('Dispatch');
    expect(paperStamp('fires')).toBe('Fires');
    expect(PAPER_STAMPS).toEqual(['Assault', 'Dispatch', 'Fires']);

    const estimate = stampStrip(paperStamp('assault'), 'Staff estimate · week 1');
    const aar = stampStrip(paperStamp('dispatch'), 'After action · week 1');
    const fires = stampStrip(paperStamp('fires'), 'Staff estimate · week 1');
    expect(estimate.chrome).toBe('strip');
    expect([estimate, aar, fires].every(stampStripIsSubtractive)).toBe(true);
    expect(stampIsBoxedRubber()).toBe(false);
    expect(stampStripIsSubtractive({
      mark: 'Assault',
      kicker: 'ledger chrome',
      chrome: 'strip',
    })).toBe(false);
  });
});

describe('combat paper copy', () => {
  it('keeps estimate and AAR language numeric — no die faces or 2d6 chrome', () => {
    const lines = [
      estimateDetail(false),
      estimateDetail(true),
      strengthNowLine(80, 71, 'estimate'),
      strengthNowLine(80, 71, 'result'),
      aarOddsCaption(),
      aarVerdictShift('favourable', 'even'),
      aarVerdictShift('even', 'even'),
    ].filter((s): s is string => Boolean(s));
    expect(lines.every(paperCopyIsNumeric)).toBe(true);
    expect(lines.join(' ')).not.toMatch(/2d6|die face|before dice|the roll/i);
    expect(estimateDetail(false)).toMatch(/odds/i);
    expect(strengthNowLine(80, 71, 'estimate')).toMatch(/80 → 71/);
    expect(aarVerdictShift('favourable', 'even')).toMatch(/staff estimate/i);
  });
});

describe('combat paper dock', () => {
  it('falls back to tile-grid side when the projector has not spoken', () => {
    expect(paperDock('8,18').side).toBe('east');
    expect(paperDock('36,18').side).toBe('west');
    expect(paperDock('24,6').yBias).toBe('low');
    expect(paperDock('24,18').yBias).toBe('mid');
    expect(paperDock('24,30').yBias).toBe('high');
  });

  it('docks from the contested hex screen position and leaves the pulse clear', () => {
    const westHex = paperLayoutFromScreen(
      { x: 420, y: 360 },
      { w: 1600, h: 1000 },
      { w: 500, h: 320 },
    );
    expect(westHex.side).toBe('east');
    expect(westHex.left).toBeGreaterThan(420 + SHEET_GAP - 1);
    expect(westHex.callout.x1).toBe(420);
    expect(westHex.callout.y1).toBe(360);
    expect(westHex.callout.x2).toBe(westHex.left);

    const eastHex = paperLayoutFromScreen(
      { x: 1180, y: 400 },
      { w: 1600, h: 1000 },
      { w: 500, h: 320 },
    );
    expect(eastHex.side).toBe('west');
    expect(eastHex.left + eastHex.width).toBeLessThan(1180 - SHEET_GAP + 1);
    expect(eastHex.callout.x2).toBe(eastHex.left + eastHex.width);
  });
});

describe('subtractive HUD gate', () => {
  const rest = {
    selectedUnitId: null,
    showJournal: false,
    showDossier: false,
    showTheatreClock: false,
    pinnedLexiconId: null,
    pendingAttackId: null,
    lastCombat: null,
    interactionMode: 'idle' as const,
  };

  it('keeps the map empty of furniture at rest', () => {
    expect(hudFrame(rest)).toBe('rest');
    expect(showCommandBench(rest)).toBe(false);
    expect(showJournalPanel(rest)).toBe(false);
    expect(showDossierPanel(rest)).toBe(false);
    expect(showOrdersHint(rest)).toBe(false);
    expect(showTheatreClockPanel(rest)).toBe(false);
  });

  it('mounts the bench only for a selected formation, not the orders banner', () => {
    const selected = { ...rest, selectedUnitId: 'u3' };
    expect(hudFrame(selected)).toBe('selected');
    expect(showCommandBench(selected)).toBe(true);
    expect(showOrdersHint(selected)).toBe(false);
    expect(showDossierPanel(selected)).toBe(false);
  });

  it('opens journal, dossier and clock only on demand', () => {
    expect(showJournalPanel({ ...rest, showJournal: true })).toBe(true);
    expect(showDossierPanel({ ...rest, showDossier: true })).toBe(true);
    expect(showTheatreClockPanel({ showTheatreClock: true })).toBe(true);
    expect(showDossierPanel({ ...rest, pinnedLexiconId: 'cities' })).toBe(true);
  });

  it('keeps the bench through AAR and hides the journal', () => {
    const aar = { ...rest, selectedUnitId: 'u3', lastCombat: { kind: 'assault' } };
    expect(hudFrame(aar)).toBe('paper');
    expect(showCommandBench(aar)).toBe(true);
    expect(showJournalPanel({ ...aar, showJournal: true })).toBe(false);
    expect(showOrdersHint(aar)).toBe(false);
  });

  it('whispers only when targeting an op or reserve drop', () => {
    expect(showOrdersHint({ ...rest, interactionMode: 'op-target' })).toBe(true);
    expect(showOrdersHint({ ...rest, interactionMode: 'deploy' })).toBe(true);
  });

  it('collapses the week-runner to a chip at rest', () => {
    expect(outlinerChrome(rest)).toBe('chip');
    expect(outlinerListMounted('chip')).toBe(false);
    expect(outlinerChrome({ ...rest, selectedUnitId: 'u3' })).toBe('open');
    expect(outlinerChrome({ ...rest, showOutliner: true })).toBe('open');
    expect(outlinerListMounted('open')).toBe(true);
    expect(outlinerChrome({ ...rest, lastCombat: { kind: 'assault' } })).toBe('rail');
    expect(outlinerChrome({ ...rest, selectedUnitId: 'u3', pendingAttackId: 'r1' })).toBe('rail');
    expect(outlinerListMounted('rail')).toBe(true);
  });
});

describe('Vic3-thin play header', () => {
  it('uses a faction mark, one week/weather chip, and icon+number resources — no wordmark', () => {
    const state = buildInitialState('UA', 42);
    expect(PLAY_HEADER_WORDMARK).toBeNull();
    expect(headerHasProductWordmark()).toBe(false);

    const mark = factionMark(state.playerFaction);
    expect(mark.code).toBe('UA');
    expect(mark.name).toBe('Ukraine');
    expect(mark.name).not.toMatch(/THEATRE/i);

    const week = weekWeatherChip(state);
    expect(week.week).toBe(1);
    expect(week.weatherLabel.length).toBeGreaterThan(0);
    expect(week.date.length).toBeGreaterThan(0);

    const chips = resourceChips(state);
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.id)).toEqual(['manpower', 'equipment', 'command']);
    expect(chips.every((c) => c.icon === c.id && typeof c.value === 'number')).toBe(true);
  });
});

describe('theatre pulse', () => {
  it('exposes a headline and one bead per decisive city', () => {
    const state = buildInitialState('UA', 42);
    const b = theatreBalance(state);
    expect(['Holding', 'Pressing', 'Slipping', 'Breaking']).toContain(b.headline);
    expect(b.decisiveCities.length).toBe(state.scenario.decisive.UA.length);
    expect(b.decisiveCities.every((c) => c.name.length > 0)).toBe(true);
  });
});

describe('front sectors', () => {
  it('reads the opening line as four theatres, not one roster', () => {
    const state = buildInitialState('UA', 42);
    expect(frontSector(state.units.u3.tile)).toBe('kharkiv');
    expect(frontSector(state.units.u10.tile)).toBe('donets');
    expect(frontSector(state.units.u19.tile)).toBe('zaporizhzhia');
    expect(frontSector(state.units.u24.tile)).toBe('kherson');
    const present = new Set(
      Object.values(state.units)
        .filter((u) => u.faction === 'UA')
        .map((u) => frontSector(u.tile)),
    );
    expect([...SECTOR_ORDER.filter((s) => present.has(s))]).toEqual([
      'kharkiv', 'donets', 'zaporizhzhia', 'kherson',
    ]);
  });
});

describe('ops rail cycle', () => {
  it('walks contact then march and skips spent', () => {
    const state = buildInitialState('UA', 42);
    const first = cycleUnspent(state, null);
    expect(first).toBeTruthy();
    const unit = state.units[first!];
    expect(formationLane(state, unit)).not.toBe('spent');

    const spent = state.units.u3;
    expect(spent).toBeTruthy();
    spent.movement = 0;
    spent.hasAttacked = true;
    const next = cycleUnspent(state, 'u3');
    expect(next).not.toBe('u3');
    if (next) expect(formationLane(state, state.units[next])).not.toBe('spent');
  });
});

describe('bound journal chronology', () => {
  it('parses 2d6 from combat lines', () => {
    expect(parseDice('57th hits 20th MRD — 2d6 9–5')).toEqual({ atk: 9, def: 5 });
    expect(parseDice('Fires on the ridge — 2d6 7 vs 4')).toEqual({ atk: 7, def: 4 });
    expect(parseDice('Melitopol taken')).toEqual({});
  });

  it('treats the week as the chapter, newest first', () => {
    const notes: NotificationEntry[] = [
      { id: 1, turn: 1, kind: 'info', text: 'Week opens.' },
      { id: 2, turn: 1, kind: 'combat', text: '57th against 20th MRD — 2d6 8–6' },
      { id: 3, turn: 2, kind: 'capture', text: 'Melitopol taken' },
    ];
    const weeks = bindChronology(notes, 10);
    expect(weeks.map((w) => w.turn)).toEqual([2, 1]);
    expect(weeks[0].lines[0].kind).toBe('capture');
    const fight = weeks[1].lines.find((l) => l.kind === 'combat');
    expect(fight?.atk).toBe(8);
    expect(fight?.def).toBe(6);
  });

  it('focuses the last named living unit, else a city', () => {
    const state = buildInitialState('UA', 42);
    const atk = Object.values(state.units).find((u) => u.faction === 'UA')!;
    const def = Object.values(state.units).find((u) => u.faction === 'RU')!;
    expect(chronologyTile(state, `${atk.name} vs ${def.name} · 2d6 8–6`)).toBe(def.tile);
    const city = Object.values(state.cities).find((c) => c.name === 'Melitopol')!;
    expect(chronologyTile(state, 'Melitopol has been captured by Ukrainian forces.')).toBe(city.tile);
    expect(chronologyTile(state, 'Week opens.')).toBeNull();
  });
});
