// Encyclopedia copy for the staff table. Doctrine is stable; the "now"
// line explains why this colour or numeral is what it is *this week*.
// No rules live here — callers pass already-derived numbers.

export type Tone = 'good' | 'warn' | 'bad' | 'even';

export interface LexiconEntry {
  title: string;
  doctrine: string;
}

export const LEXICON = {
  strength: {
    title: 'Strength',
    doctrine:
      'The fighting body of the formation — men, vehicles, cohesion. Not a hit-point bar. A brigade at 40 is still on the map but no longer a peer; near zero it ceases to exist. Reinforce restores it with manpower and equipment. The 2d6 decide how fast this falls in a fight; the power model decides the bill.',
  },
  readiness: {
    title: 'Readiness',
    doctrine:
      'Ability to conduct operations this week. Combat and thin supply drain it; rest on a supplied hex restores it. A tired formation still occupies the hex. It just hits softer and breaks sooner.',
  },
  morale: {
    title: 'Morale',
    doctrine:
      'Willingness to hold. Low morale is how retreats happen — the line gives before the last vehicle does. Recovers in supply; drops when isolated or after a hard exchange. Not courage as flavour. It is the retreat threshold.',
  },
  attack: {
    title: 'Attack',
    doctrine:
      'Printed attack value of the type. Scaled by strength, readiness, supply, weather and the hex. This is the staff factor, not the roll. The 2d6 swing the exchange after the estimate.',
  },
  defence: {
    title: 'Defence',
    doctrine:
      'Printed defence value of the type. Terrain, entrenchment and supply multiply it. Urban and forest favour the holder; armour pays for attacking into either.',
  },
  breakthrough: {
    title: 'Breakthrough',
    doctrine:
      'How readily this type forces a retreat and takes the hex when the ratio is with it. Armour is built for this. Infantry holds; it does not punch.',
  },
  support: {
    title: 'Support',
    doctrine:
      'Fires weight. Artillery spends the week degrading a hex — strength, readiness, entrenchment — without taking it. The battery rolls 2d6 for effect. The infantry still has to walk in.',
  },
  movement: {
    title: 'Movement',
    doctrine:
      'March left this week, in movement points. Roads are cheap; forest, marsh and river banks are not. Entering an enemy zone of control ends the march. Spent means the plate is done — select another, or end the week.',
  },
  supply: {
    title: 'Supply',
    doctrine:
      'A budget flood-fill from national sources across friendly hexes. Isolated formations degrade each week they stay cut off. The Supply map mode traces the corridor. Emergency Resupply is a patch, not a road.',
  },
  warSupport: {
    title: 'War support',
    doctrine:
      'National cohesion, not a score. It falls with lost cities and destroyed formations; it rises when you take ground. Collapse below 8% ends the campaign. The enemy can break the same way. This is the political clock.',
  },
  cities: {
    title: 'Cities',
    doctrine:
      'Victory-point value of hexes you hold, against what you started with. Decisive cities are the short war: hold every one on your list and the theatre ends. Taking one city is a week; taking the set is the campaign.',
  },
  army: {
    title: 'Army',
    doctrine:
      'The living force: how many formations remain, and how much fighting body they still have. Spent this week is not the same as broken. A dim plate will march again next week. A hollow army will not.',
  },
  command: {
    title: 'Command',
    doctrine:
      'Fuel for theatre operations — reconnaissance, fires, air, resupply, engineering. Regenerates each week up to the cap. Spend it on a problem the formations cannot solve by walking.',
  },
  manpower: {
    title: 'Manpower',
    doctrine:
      'Replacements. Income arrives each week. Reinforcement and reserve deployment spend it. If the well runs dry, damaged formations stay damaged.',
  },
  equipment: {
    title: 'Equipment',
    doctrine:
      'Vehicles, guns, matériel. Mechanised and armoured formations drink this. Income is per week; a reconstitution binge will empty the depot.',
  },
  weather: {
    title: 'Weather',
    doctrine:
      'The month’s going. Mud and snow add cost off the roads and blunt the attack. Rain and snow also shorten reconnaissance. Clear is the week you wanted. You do not choose it.',
  },
  score: {
    title: 'Campaign score',
    doctrine:
      'Accrues from territorial change against the start, taken objectives and broken enemy formations. At the turn limit it decides operational victory or stalemate. It is the long war, not the week.',
  },
  odds: {
    title: 'The exchange',
    doctrine:
      'Staff estimate before fortune. They lose the first number; you lose the second. Dice swing both — a 12 presses, a 2 falters. Decisions still dominate a 2:1 fight. Confirm commits the roll.',
  },
  march: {
    title: 'March',
    doctrine:
      'Click a highlighted hex. Roads are faster; forest, marsh and river crossings are slow. Moving next to the enemy ends the march. The brass numeral on the counter is what remains.',
  },
  assault: {
    title: 'Assault',
    doctrine:
      'Open the staff estimate against an adjacent enemy. Confirm to roll 2d6 each — attack roll scales damage given, defence roll scales damage taken. A 7 is average. You can also click the enemy plate on the board.',
  },
  entrench: {
    title: 'Entrench',
    doctrine:
      'Spend remaining movement to dig in now (+1). Entrenchment also grows for a formation that stands still. It is lost when you march. Artillery and assault chip it.',
  },
  reinforce: {
    title: 'Reinforce',
    doctrine:
      'Order replacements into this formation. Costs manpower and equipment each week. Works best in supply and off the line. Movement is halved while receiving.',
  },
  operations: {
    title: 'Operations',
    doctrine:
      'Limited theatre capabilities paid in command: reconnaissance, preparation fires, close support, emergency resupply, rapid reinforcement, fortify. One problem, one plate, a cooldown after.',
  },
  reserves: {
    title: 'Reserves',
    doctrine:
      'Uncommitted formations. Deploy at a supplied hub city — 15 manpower, 10 equipment. Filling a gap this week may cost you the counterattack later.',
  },
  endWeek: {
    title: 'End week',
    doctrine:
      'Commit orders and hand the initiative to the enemy. Idle formations and unanswered decisions will be named before you confirm. Shift+Enter is the same stamp.',
  },
} as const satisfies Record<string, LexiconEntry>;

export type LexiconId = keyof typeof LEXICON;

export function toneOf(value: number, good = 65, warn = 35): Tone {
  if (value > good) return 'good';
  if (value > warn) return 'warn';
  return 'bad';
}

export function strengthNow(strength: number): { tone: Tone; copy: string } {
  if (strength > 65) return { tone: 'good', copy: `${Math.round(strength)} — still a fighting body.` };
  if (strength > 35) return { tone: 'warn', copy: `${Math.round(strength)} — worn; replacements will matter.` };
  return { tone: 'bad', copy: `${Math.round(strength)} — near collapse.` };
}

export function readinessNow(value: number): { tone: Tone; copy: string } {
  if (value > 65) return { tone: 'good', copy: `${Math.round(value)} — fit for the week’s work.` };
  if (value > 35) return { tone: 'warn', copy: `${Math.round(value)} — tired; hits will land softer.` };
  return { tone: 'bad', copy: `${Math.round(value)} — spent as a fighting instrument.` };
}

export function moraleNow(value: number): { tone: Tone; copy: string } {
  if (value > 65) return { tone: 'good', copy: `${Math.round(value)} — will hold the hex.` };
  if (value > 35) return { tone: 'warn', copy: `${Math.round(value)} — a hard exchange may force a retreat.` };
  return { tone: 'bad', copy: `${Math.round(value)} — the line is close to giving.` };
}

export function supplyNow(state: string): { tone: Tone; copy: string } {
  if (state === 'full' || state === 'supplied') {
    return { tone: 'good', copy: `${state} — corridor open; full power and recovery.` };
  }
  if (state === 'strained') {
    return { tone: 'warn', copy: 'strained — the route is long or pinched; power is already down.' };
  }
  if (state === 'low') {
    return { tone: 'warn', copy: 'low — recovery is a trickle. Trace the Supply mode before the week ends.' };
  }
  return { tone: 'bad', copy: 'isolated — no source. The formation will degrade until a corridor reopens.' };
}

export function movementNow(mp: number, max: number): { tone: Tone; copy: string } {
  if (mp <= 0.05) return { tone: 'bad', copy: `0 of ${max} — spent this week.` };
  if (mp < max * 0.4) return { tone: 'warn', copy: `${mp.toFixed(1)} of ${max} — enough for a last step, not a march.` };
  return { tone: 'good', copy: `${mp.toFixed(1)} of ${max} — can still walk.` };
}

export function warSupportNow(own: number, foe: number): { tone: Tone; copy: string } {
  if (own < 25) return { tone: 'bad', copy: `${Math.round(own)}% — the political clock is running out (collapse at 8%).` };
  if (own < 45) return { tone: 'warn', copy: `${Math.round(own)}% vs foe ${Math.round(foe)}% — cohesion is fraying.` };
  if (foe < 30) return { tone: 'good', copy: `${Math.round(own)}% vs foe ${Math.round(foe)}% — they are the ones breaking.` };
  return { tone: 'even', copy: `${Math.round(own)}% vs foe ${Math.round(foe)}% — both sides can still prosecute the war.` };
}

export function citiesNow(held: number, start: number, decisiveHeld: number, decisiveTotal: number): {
  tone: Tone;
  copy: string;
} {
  const delta = held - start;
  const dec = `${decisiveHeld}/${decisiveTotal} decisive`;
  if (decisiveHeld === decisiveTotal && decisiveTotal > 0) {
    return { tone: 'good', copy: `${held} VP (${delta >= 0 ? '+' : ''}${delta}) — ${dec}. The short war is in hand.` };
  }
  if (delta < 0) return { tone: 'bad', copy: `${held} VP (${delta}) from ${start} start — ${dec}. Ground is slipping.` };
  if (delta > 8) return { tone: 'good', copy: `${held} VP (+${delta}) from ${start} start — ${dec}. The map has moved.` };
  return { tone: 'even', copy: `${held} VP (${delta >= 0 ? '+' : ''}${delta}) from ${start} start — ${dec}.` };
}

export function armyNow(ownStrength: number, foeStrength: number, ownCount: number, foeCount: number): {
  tone: Tone;
  copy: string;
} {
  const ratio = ownStrength / Math.max(foeStrength, 1);
  if (ownCount === 0) return { tone: 'bad', copy: 'No organised formations remain.' };
  if (ratio < 0.5) {
    return { tone: 'bad', copy: `${ownCount} formations, body ${Math.round(ownStrength)} vs ${Math.round(foeStrength)} — hollow.` };
  }
  if (ratio < 0.8) {
    return { tone: 'warn', copy: `${ownCount} vs ${foeCount} formations — they still have more fighting body.` };
  }
  if (ratio > 1.2) {
    return { tone: 'good', copy: `${ownCount} formations, body ${Math.round(ownStrength)} vs ${Math.round(foeStrength)} — the weight is yours.` };
  }
  return { tone: 'even', copy: `${ownCount} vs ${foeCount} formations — peer armies.` };
}

/** Kept for the 0.2.7 Strength tip; prefer strengthNow().copy. */
export function strengthNowCopy(strength: number): string {
  return strengthNow(strength).copy.replace(/^\d+\s+—\s+/, '');
}
