// Campaign events: occasional, restrained, with clear mechanical tradeoffs.

import { GameEventDef } from '../types';

export const EVENT_DEFS: GameEventDef[] = [
  {
    id: 'western-aid',
    title: 'Materiel Assistance Arrives',
    text: 'A new package of external military assistance has cleared logistics hubs in the west. Staff ask how to allocate it.',
    faction: 'UA',
    minTurn: 3,
    maxTurn: 30,
    weight: 3,
    options: [
      {
        label: 'Prioritise frontline equipment',
        description: '+30 equipment',
        effects: { equipment: 30 },
      },
      {
        label: 'Fill out personnel and training',
        description: '+18 manpower, +5 war support',
        effects: { manpower: 18, warSupport: 3 },
      },
      {
        label: 'Constitute a new reserve brigade',
        description: 'Adds a mechanised brigade to the reserve pool',
        effects: { reserve: { type: 'mechanized', name: '154th Mechanised Brigade' } },
      },
    ],
  },
  {
    id: 'mobilisation-wave',
    title: 'Mobilisation Wave',
    text: 'The general staff proposes drawing on the next mobilisation cohort ahead of schedule.',
    faction: 'RU',
    minTurn: 3,
    maxTurn: 30,
    weight: 3,
    options: [
      {
        label: 'Authorise the wave',
        description: '+35 manpower, −4 war support',
        effects: { manpower: 35, warSupport: -4 },
      },
      {
        label: 'Hold to the schedule',
        description: '+10 manpower',
        effects: { manpower: 10 },
      },
      {
        label: 'Form a new rifle division',
        description: 'Adds an infantry division to the reserve pool, −3 war support',
        effects: { warSupport: -3, reserve: { type: 'infantry', name: '336th Rifle Division' } },
      },
    ],
  },
  {
    id: 'shell-hunger',
    title: 'Ammunition Shortfall',
    text: 'Consumption of artillery ammunition has outpaced deliveries. Stocks must be rationed somewhere.',
    faction: 'both',
    minTurn: 5,
    maxTurn: 34,
    weight: 2,
    options: [
      {
        label: 'Ration across the front',
        description: '−10 readiness for all formations',
        effects: { readinessAll: -10 },
      },
      {
        label: 'Draw down strategic stocks',
        description: '−20 equipment',
        effects: { equipment: -20 },
      },
    ],
  },
  {
    id: 'drone-expansion',
    title: 'Reconnaissance Drone Programme',
    text: 'Field workshops can expand the tactical drone fleet, at the cost of scarce components.',
    faction: 'both',
    minTurn: 2,
    maxTurn: 32,
    weight: 2,
    options: [
      {
        label: 'Expand the programme',
        description: '+3 command, −10 equipment',
        effects: { command: 3, equipment: -10 },
      },
      {
        label: 'Preserve components',
        description: '+5 equipment',
        effects: { equipment: 5 },
      },
    ],
  },
  {
    id: 'infrastructure-strikes',
    title: 'Strikes on Infrastructure',
    text: 'Long-range strikes have damaged power and rail infrastructure in rear areas. Repair crews are stretched.',
    faction: 'both',
    minTurn: 4,
    maxTurn: 34,
    weight: 2,
    options: [
      {
        label: 'Acknowledge',
        description: '−5 readiness for all formations, −3 war support',
        effects: { readinessAll: -5, warSupport: -3 },
      },
    ],
  },
  {
    id: 'air-defence-success',
    title: 'Air Defence Success',
    text: 'Air defence crews intercepted a major strike package overnight. Coverage of forward logistics held.',
    faction: 'UA',
    minTurn: 2,
    maxTurn: 34,
    weight: 2,
    options: [
      {
        label: 'Acknowledge',
        description: '+4 war support',
        effects: { warSupport: 4 },
      },
    ],
  },
  {
    id: 'sanctions-pressure',
    title: 'Sanctions Pressure',
    text: 'Import substitution is failing to cover key components for equipment refurbishment this quarter.',
    faction: 'RU',
    minTurn: 6,
    maxTurn: 34,
    weight: 2,
    options: [
      {
        label: 'Divert civilian industry',
        description: '−3 war support, +10 equipment',
        effects: { warSupport: -3, equipment: 10 },
      },
      {
        label: 'Accept the shortfall',
        description: '−15 equipment',
        effects: { equipment: -15 },
      },
    ],
  },
  {
    id: 'command-reshuffle',
    title: 'Command Reshuffle',
    text: 'A reorganisation of the operational command has concluded. Staff work is expected to improve.',
    faction: 'both',
    minTurn: 8,
    maxTurn: 32,
    weight: 1,
    options: [
      {
        label: 'Acknowledge',
        description: '+3 command, +5 readiness for all formations',
        effects: { command: 3, readinessAll: 5 },
      },
    ],
  },
  {
    id: 'volunteer-influx',
    title: 'Volunteer Influx',
    text: 'Recruitment centres report a rise in volunteers following recent coverage of the front.',
    faction: 'UA',
    minTurn: 4,
    maxTurn: 30,
    weight: 2,
    options: [
      {
        label: 'Acknowledge',
        description: '+15 manpower',
        effects: { manpower: 15 },
      },
    ],
  },
  {
    id: 'winter-preparations',
    title: 'Winter Preparations',
    text: 'The season is turning. Formations need winter equipment and rotation schedules, or their condition will degrade.',
    faction: 'both',
    minTurn: 26,
    maxTurn: 36,
    weight: 3,
    options: [
      {
        label: 'Issue winter equipment',
        description: '−15 equipment, formations keep readiness',
        effects: { equipment: -15 },
      },
      {
        label: 'Economise',
        description: '−12 readiness for all formations',
        effects: { readinessAll: -12 },
      },
    ],
  },
];
