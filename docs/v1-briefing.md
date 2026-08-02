# THEATRE: BLACK EARTH

## Project Brief

Build a complete, playable vertical slice of a single-player turn-based strategy game set during the contemporary Russia–Ukraine war.

The working title is **THEATRE: BLACK EARTH**.

The game should feel like a compact hybrid of:

* **Civilization VI** — readable tiles, clear turns, approachable movement and immediate map interaction.
* **Hearts of Iron IV** — frontlines, territorial control, logistics, reserves and operational decision-making.
* **Victoria 3** — sophisticated map presentation, atmospheric visuals, restrained UI and a sense that the player is operating a serious political and military instrument.
* **Company of Heroes 3** — meaningful terrain, identifiable unit roles, pressure around objectives and a frontline that feels physical rather than purely mathematical.

The most important constraint is this:

> Prefer a small, understandable and complete game system over a broad but unfinished simulation.

The game does not need the systemic complexity of Hearts of Iron IV or Victoria 3. It should instead create the *feeling* of a grand operational war game through strong presentation, clear decisions, map atmosphere and a few interconnected mechanics.

Visual polish is not an optional layer added after the game logic. It is one of the main product goals.

The ideal result is a game that looks far more sophisticated than its underlying rules actually are.

---

# 1. Core Vision

The player takes command of one side in a simplified contemporary war across Ukraine.

They are not directly controlling individual soldiers, tanks or squads. They are acting as an operational commander responsible for:

* Holding and advancing the frontline.
* Capturing strategically important cities and infrastructure.
* Keeping formations supplied.
* Reinforcing damaged units.
* Concentrating forces before an offensive.
* Deciding where to defend, attack or withdraw.
* Using limited strategic capabilities at the right moment.
* Managing the long-term cohesion and fighting capacity of the army.

The central fantasy is:

> Study the theatre, understand where the enemy is weak, concentrate limited resources and reshape the frontline one turn at a time.

The game should be about **pressure, preparation, supply, attrition and positioning**, not constant combat.

Most turns should involve several competing priorities. The player should rarely have enough resources to do everything they want.

The game should reward:

* Maintaining coherent frontlines.
* Protecting supply routes.
* Building local superiority.
* Rotating damaged formations.
* Defending valuable terrain.
* Avoiding wasteful attacks.
* Planning several turns ahead.

The game should punish:

* Overextension.
* Unsupported advances.
* Leaving units isolated.
* Attacking through difficult terrain without preparation.
* Ignoring supply.
* Spending every reserve immediately.
* Treating every tile as equally valuable.

---

# 2. Scope of the First Version

This first version should be a polished, self-contained campaign rather than a framework for an enormous future game.

The player should be able to:

1. Start a new campaign.
2. Choose a faction.
3. Inspect the map and its strategic objectives.
4. Select units.
5. Move units between tiles.
6. Attack enemy-controlled tiles or enemy formations.
7. Capture territory.
8. Manage supply, reinforcement and readiness.
9. Use a small number of strategic operations.
10. End the turn.
11. Watch the AI take its turn.
12. Continue until one side reaches a victory condition.
13. Save and resume the campaign.

A campaign should last approximately **25–40 turns**.

Each turn can represent roughly **one week**, although the interface does not need to overemphasize literal calendar accuracy.

The initial campaign should use one intentionally simplified scenario representing a contemporary, relatively static frontline. It should not claim to reproduce live battlefield conditions or exact orders of battle.

The scenario date must be explicit in the campaign data and visible in the interface. The map, starting positions and balance should be treated as a designed scenario rather than a real-time historical authority.

---

# 3. Tone and Treatment of the Conflict

The game should be serious, restrained and non-triumphalist.

It should not feel like:

* A heroic military power fantasy.
* A mobile war game.
* Propaganda for either side.
* A meme or parody.
* A graphic depiction of violence.
* A hyper-detailed simulation claiming complete historical accuracy.

It should feel like an interactive operational map used to understand a difficult, costly and uncertain conflict.

Casualties should be represented abstractly through:

* Unit strength.
* Manpower.
* Morale.
* Readiness.
* Equipment.
* National war support.

Do not depict graphic injuries or death.

The game may use the real geographical names of major cities and regions, but its mechanics and starting conditions should be clearly described as simplified.

The writing should remain neutral and factual. Avoid slogans, ideological language or real-world political commentary.

---

# 4. The Strategic Map

## 4.1 Map Structure

Use a **hexagonal tile map** unless there is a strong technical reason not to.

Hexes are preferred because they:

* Feel naturally suited to operational warfare.
* Avoid awkward diagonal movement rules.
* Produce more organic frontlines.
* Allow terrain and supply relationships to remain readable.

The map should show Ukraine and limited portions of surrounding territory. It does not need to be geographically exact, but it should be recognizably based on the real shape and strategic geography of Ukraine.

A strategically compressed map is acceptable. Important areas should be enlarged enough to produce useful gameplay.

The first map should contain approximately **250–500 playable hexes**. Do not create thousands of tiles.

The map should include:

* Major cities.
* Regional towns.
* Roads.
* Rail lines.
* Rivers.
* Forests.
* Open plains.
* Urban areas.
* Coastal areas.
* Major supply hubs.
* Important crossings and chokepoints.

Each tile should have:

* Coordinates or a unique ID.
* Terrain type.
* Current controller.
* Original controller.
* Movement cost.
* Defensive modifier.
* Supply value or supply connectivity.
* Optional settlement or infrastructure.
* Optional victory-point value.
* Optional unit occupying it.
* Visual state for selection, movement, attack and fog of war.

---

## 4.2 Terrain Types

Keep the terrain system understandable.

Suggested terrain types:

### Plains

* Low movement cost.
* Weak defensive bonus.
* Favourable to armoured and mechanised forces.
* Visually represented by farmland, steppe and open ground.

### Forest

* Higher movement cost.
* Moderate defensive bonus.
* Reduces the effectiveness of armoured attacks.
* Conceals units more effectively.

### Urban

* High defensive value.
* Difficult to capture.
* Often associated with victory points and supply.
* Should visually feel dense and strategically important.

### River

Rivers should exist between tiles or as special map edges.

Crossing a river should:

* Cost additional movement.
* Reduce attacking power.
* Become easier at designated bridge or crossing tiles.
* Create natural defensive lines.

### Fortified

Fortifications can be a tile state rather than a separate terrain type.

A fortified tile should:

* Provide an additional defensive bonus.
* Be visually marked with trenches, earthworks or defensive symbols.
* Take time or command resources to establish.

### Coastal or Marsh

These can be included where useful but should remain secondary in the first version.

---

## 4.3 Territorial Control

Every tile is controlled by one faction or is neutral.

Control should be visually obvious through:

* A restrained faction-coloured map tint.
* Border lines.
* Frontline emphasis.
* Settlement markers.
* Subtle occupation patterns.

Avoid filling the entire map with loud primary colours.

The frontline itself should be one of the most visually important elements in the game.

It should feel like a living boundary:

* Clearly readable from a zoomed-out view.
* Visually reinforced where opposing units face one another.
* Updated smoothly when territory changes hands.
* Distinct from administrative or regional borders.

Capturing a tile changes control immediately after successful movement or combat.

Isolated captured tiles should be difficult to maintain because of supply and enemy zones of control.

---

# 5. Units

## 5.1 Unit Scale

Units should represent formations rather than individual vehicles or squads.

A unit can loosely represent a brigade-sized or division-sized formation, but exact real-world scale does not need to be simulated.

The game should begin with approximately **12–20 formations per side**.

This is enough to create a meaningful frontline without overwhelming the player.

---

## 5.2 Initial Unit Types

Use a small number of clearly differentiated unit types.

### Infantry

* Reliable defensive unit.
* Moderate movement.
* Affordable to reinforce.
* Effective in urban and forest terrain.
* Limited offensive breakthrough capability.

### Mechanised

* Good mobility.
* Stronger offensive capability than infantry.
* More dependent on supply.
* Effective at exploiting gaps.
* More expensive to reinforce.

### Armoured

* High attack and breakthrough.
* Strong in open terrain.
* Vulnerable when isolated, undersupplied or used in difficult terrain.
* Expensive and relatively rare.

### Artillery

Artillery should preferably function as a supporting formation or support capability rather than a traditional frontline unit.

It can:

* Increase attack strength from an adjacent tile.
* Conduct limited bombardments.
* Reduce enemy entrenchment.
* Be vulnerable if directly exposed.

### Reconnaissance

Recon can either be a unit type or an operation.

Its purpose is to:

* Reveal enemy information.
* Improve combat previews.
* Detect weak or damaged formations.
* Reduce uncertainty around an attack.

Do not add many more unit classes in the first implementation.

Air forces, missiles, drones, naval forces and electronic warfare should initially be represented through strategic operations rather than independently controlled map units.

---

## 5.3 Unit Statistics

Each formation should have a compact set of understandable statistics:

* **Strength** — remaining combat power.
* **Readiness** — ability to conduct operations effectively.
* **Morale** — willingness to continue fighting.
* **Supply** — fuel, ammunition and general logistical support.
* **Movement** — tiles or movement points available this turn.
* **Attack** — offensive effectiveness.
* **Defence** — defensive effectiveness.
* **Breakthrough** — ability to dislodge entrenched enemies.
* **Support** — contribution to nearby combat.
* **Experience** — modest long-term combat bonus.
* **Entrenchment** — defensive preparation on the current tile.

Do not display every number at all times.

At map level, a unit should communicate its condition through:

* A strength bar.
* A supply indicator.
* A readiness or morale indicator.
* A unit-type silhouette.
* A small formation designation.

Detailed statistics should appear in the selected-unit panel.

---

## 5.4 Unit States

Units can be in states such as:

* Ready.
* Moving.
* Entrenched.
* Attacking.
* Disorganised.
* Low supply.
* Isolated.
* Exhausted.
* Reinforcing.

These states should have clear visual meaning.

A player should be able to understand why a formation is performing poorly without needing to inspect hidden formulas.

---

# 6. Turn Structure

The first version should use alternating turns.

A complete turn consists of:

1. Player command phase.
2. Player movement and combat.
3. Player end-turn processing.
4. AI command phase.
5. AI movement and combat.
6. Global supply, reinforcement and event resolution.
7. Start of the next turn.

Do not implement simultaneous hidden orders in the first version unless it can be done without reducing reliability or clarity.

At the beginning of each player turn:

* Movement is refreshed.
* Supply is recalculated.
* Readiness partially recovers.
* Entrenchment increases for stationary units.
* Reinforcement orders are processed.
* Command resources are granted.
* New events or strategic decisions may appear.

The player can then freely inspect the theatre before committing actions.

Ending the turn should require a deliberate button press. Warn the player when:

* Units still have movement available.
* An important decision remains unresolved.
* A formation is isolated or critically undersupplied.

Do not force the player to move every unit.

Choosing not to act should sometimes be strategically correct.

---

# 7. Movement and Zones of Control

Each unit has movement points.

Movement cost depends on:

* Terrain.
* Roads.
* Rail connections.
* Supply level.
* Unit type.
* Enemy zones of control.
* River crossings.

Units should generally occupy one tile each.

Friendly units cannot stack in the same tile in the first version. Supporting units such as artillery may support from adjacent tiles rather than physically stacking.

Enemy formations project a **zone of control** into adjacent tiles.

Entering an enemy zone of control should:

* Consume additional movement.
* Prevent unrestricted movement past the enemy.
* Make encirclement and frontline gaps meaningful.

Units should not be able to travel deep through enemy territory simply because a path of empty tiles exists.

Movement range should be previewed clearly when a unit is selected.

The interface should distinguish:

* Reachable friendly tiles.
* Reachable enemy-controlled tiles.
* Valid attack targets.
* Invalid destinations.
* Dangerous or out-of-supply destinations.

---

# 8. Combat

## 8.1 Combat Philosophy

Combat should be easy to initiate and easy to understand.

The player selects a formation and chooses an adjacent enemy formation or enemy-controlled tile.

Before committing, show a combat preview.

The preview should explain the expected result through readable categories such as:

* Decisive advantage.
* Favourable.
* Even.
* Risky.
* Severe disadvantage.

It should also show the most important contributing factors:

* Unit strength.
* Terrain.
* Entrenchment.
* Supply.
* Readiness.
* Supporting artillery.
* Adjacent friendly formations.
* River crossing.
* Reconnaissance.
* Active operations.

Do not bury the result behind a large opaque random number.

A small amount of seeded randomness is acceptable, but player decisions should dominate outcomes.

---

## 8.2 Simplified Combat Resolution

A useful conceptual model is:

**Effective combat power = base strength × readiness × supply × morale × terrain and support modifiers**

The exact implementation can be tuned for good gameplay rather than realism.

A combat result can produce:

* Attacker strength loss.
* Defender strength loss.
* Morale loss.
* Readiness loss.
* Retreat.
* Disorganisation.
* Capture of the tile.
* Destruction or surrender of a critically weakened isolated formation.

Combat should not usually destroy a healthy formation in one attack.

Most battles should result in degradation, retreat or loss of readiness.

This creates a war of repeated pressure rather than sudden arbitrary elimination.

---

## 8.3 Retreat

When a defender loses, it should attempt to retreat to:

1. A friendly-controlled adjacent tile.
2. A tile with supply access.
3. A tile not occupied by another unit.
4. A tile away from enemy zones of control where possible.

If no retreat is possible, the defender should suffer significantly greater losses and may be destroyed.

This allows encirclement to exist without requiring a complicated system.

---

## 8.4 Entrenchment

A unit that remains stationary should gradually entrench.

Entrenchment should:

* Improve defence.
* Be reduced when the unit moves.
* Be damaged by artillery preparation.
* Be visible through the unit panel and map presentation.

This makes established frontlines difficult to break and encourages preparation before attacks.

---

# 9. Supply and Logistics

Supply should be one of the defining systems, but it must remain visually understandable.

## 9.1 Supply Sources

Supply originates from:

* Major national supply entry points.
* Major cities.
* Rail hubs.
* Designated logistics hubs.

Supply travels through:

* Friendly-controlled tiles.
* Roads.
* Railways.
* Connected settlements.

Roads and railways should increase supply reach and capacity.

The game does not need to simulate individual convoys or stockpiles.

---

## 9.2 Supply State

Every unit should have one of several supply states:

* Fully supplied.
* Supplied.
* Strained.
* Low supply.
* Isolated.

Low supply should reduce:

* Movement.
* Attack.
* Readiness recovery.
* Reinforcement.
* Morale.

Isolation should become progressively more damaging over multiple turns.

A formation should not immediately collapse after losing supply for one turn, but sustained isolation should be dangerous.

---

## 9.3 Supply Map Mode

Include a dedicated supply overlay.

It should show:

* Supply hubs.
* Connected routes.
* Well-supplied territory.
* Strained areas.
* Isolated tiles.
* Enemy pressure on supply routes.

This map mode should be visually elegant and immediately useful.

The player should be able to understand why a unit is undersupplied by tracing its connection back to a hub.

---

# 10. Reinforcement, Reserves and National Resources

Use a deliberately small economic layer.

Each faction should manage several national resources:

### Manpower

Used to restore formation strength and create limited new formations.

### Equipment

Represents vehicles, weapons, ammunition and replacement matériel.

### Command

A renewable resource used for strategic operations and exceptional actions.

### War Support

Represents national cohesion and political tolerance for continuing the conflict.

War support can decline through:

* Heavy losses.
* Loss of major cities.
* Repeated failed offensives.
* Isolation or destruction of formations.
* Negative events.

It can improve through:

* Capturing strategic objectives.
* Successfully defending key cities.
* Receiving external support.
* Completing operational objectives.

Do not create a full national economy in the first version.

There is no need for factories, individual production lines, taxation, trade goods or detailed politics.

---

## 10.1 Reinforcing Units

The player should be able to order damaged units to reinforce.

Reinforcement should:

* Consume manpower and equipment.
* Occur over one or more turns.
* Be more effective in supplied territory.
* Reduce or prevent offensive actions while underway.
* Encourage the player to rotate formations away from the frontline.

A damaged unit should not automatically return to full strength every turn.

---

## 10.2 Reserves

Each faction may begin with a small number of reserve formations or receive them through events.

Deploying a reserve should require:

* A valid supplied tile.
* A city or logistics hub.
* Sufficient national resources.

Reserves should feel valuable.

The player should face meaningful decisions between:

* Filling a gap.
* Reinforcing an offensive.
* Protecting a city.
* Holding a reserve for later.

---

# 11. Strategic Operations

Air power, drones, missiles, intelligence and other complex capabilities should be represented through a limited operation system.

Operations consume command points and may have cooldowns.

Suggested operations:

### Reconnaissance Sweep

* Reveals more accurate information about enemy units in an area.
* Improves combat previews.
* Lasts for the current turn.

### Artillery Preparation

* Reduces entrenchment in a selected enemy tile.
* Applies limited readiness or morale damage.
* Does not capture territory by itself.

### Close Support

* Improves one attack.
* Expensive and limited.
* More effective against exposed enemies than fortified urban positions.

### Emergency Resupply

* Temporarily improves the supply state of an isolated or strained formation.
* Does not permanently repair a broken supply route.

### Rapid Reinforcement

* Accelerates reinforcement for one unit.
* Costs additional equipment and command.

### Fortify Position

* Immediately grants partial entrenchment.
* Useful for stabilising a threatened sector.

Each faction can have slightly different versions or costs, creating asymmetry without requiring completely separate rules.

Operations should be presented as serious command decisions, not collectible cards.

---

# 12. Fog of War and Intelligence

The player should not have perfect information.

At minimum, enemy units outside observation range should have incomplete information.

Possible information states:

* Unknown presence.
* Suspected formation.
* Identified unit type.
* Estimated strength.
* Fully observed formation.

Friendly units, cities and reconnaissance operations should reveal nearby areas.

Do not make the map completely dark.

The player should always see:

* Terrain.
* Cities.
* Roads.
* Known territorial control.

Fog of war should mainly affect enemy formations, their strength and their recent movement.

Use ghosted or faded intelligence markers for outdated information.

---

# 13. Faction Asymmetry

Both factions should use the same fundamental rules, but they should feel meaningfully different.

These differences are gameplay abstractions, not claims of exact real-world military capability.

## Ukraine-Oriented Gameplay

Potential characteristics:

* Strong defensive cohesion.
* Better intelligence and reconnaissance.
* More efficient use of limited command operations.
* External support events.
* Smaller reinforcement pool.
* Greater emphasis on mobility, defence and local counterattacks.

## Russia-Oriented Gameplay

Potential characteristics:

* Larger reinforcement and equipment pool.
* Greater artillery availability.
* More resilience to sustained attrition.
* Higher cost or friction when operating far from major supply routes.
* Greater emphasis on pressure, mass and repeated offensive operations.

Balance should not require both sides to be identical.

The goal is for each side to present a different strategic problem.

---

# 14. Objectives and Victory

The game should use several overlapping victory measures.

## 14.1 Strategic Locations

Major cities and hubs should have victory-point values.

Holding them can provide:

* Victory score.
* Supply benefits.
* War support.
* Reinforcement access.
* Operational advantages.

Not every city needs to be equally important.

---

## 14.2 Campaign Score

Each side should accumulate or lose campaign score through:

* Controlling strategic cities.
* Holding designated regions.
* Destroying or isolating enemy formations.
* Maintaining army cohesion.
* Completing scenario objectives.
* Preserving war support.

---

## 14.3 Victory Conditions

Possible campaign outcomes:

### Decisive Victory

The player captures major strategic objectives or causes enemy war support to collapse.

### Operational Victory

The player finishes the campaign with a clear territorial and campaign-score advantage.

### Stalemate

Neither side gains a decisive advantage before the turn limit.

### Defeat

The player loses critical objectives, army cohesion or national war support.

Victory should not require capturing every tile.

The campaign should end when the strategic outcome is clear.

---

# 15. Events and Decisions

Include a restrained event system to make the campaign feel politically and strategically alive.

Events should occur occasionally, not constantly.

They may represent:

* External military assistance.
* Equipment shortages.
* Mobilisation.
* Infrastructure damage.
* Weather shifts.
* Intelligence breakthroughs.
* Political pressure.
* Civilian evacuation.
* Sanctions or economic pressure.
* Changes in war support.
* Reinforcement arrivals.

Some events should present a decision with two or three options.

Example:

**Additional equipment has become available.**

* Prioritise armoured replacements.
* Expand artillery stocks.
* Preserve equipment for future reserves.

Choices should create clear mechanical tradeoffs.

Avoid long narrative event chains in the first version.

---

# 16. Weather

Weather can provide visual atmosphere and limited mechanical variation.

Suggested states:

* Clear.
* Rain.
* Mud.
* Snow.
* Heavy cloud.

Weather may affect:

* Movement.
* Reconnaissance.
* Air-support operations.
* Readiness recovery.
* Visual presentation.

Keep weather modifiers modest and clearly communicated.

The main value of weather in the first version is atmosphere and variety, not simulation depth.

---

# 17. Artificial Intelligence

The AI does not need to be brilliant, but it must behave coherently.

It should follow understandable priorities:

1. Protect critical cities and supply hubs.
2. Maintain supply connectivity.
3. Avoid leaving major gaps in the frontline.
4. Reinforce damaged formations.
5. Attack weak or isolated enemy positions.
6. Concentrate multiple formations around valuable objectives.
7. Retreat formations that are close to destruction.
8. Use strategic operations before important attacks.
9. Preserve some reserves rather than committing everything immediately.

The AI should evaluate possible actions using a weighted score.

Useful factors include:

* Objective value.
* Combat advantage.
* Supply risk.
* Exposure after movement.
* Nearby friendly support.
* Enemy weakness.
* Terrain.
* Threat to key cities.
* Possibility of encirclement.

Do not attempt machine learning or an elaborate planning engine.

A transparent heuristic AI is preferable.

The AI turn should be presented clearly:

* Camera movement toward important actions.
* Short notifications.
* Visible movement and combat.
* Ability to accelerate or skip nonessential animation.

Do not make the player stare at the screen while the AI silently calculates.

---

# 18. User Interface

The interface should feel like a modern strategic command instrument.

## 18.1 Main Screen

The map should occupy most of the screen.

Suggested layout:

### Top Bar

* Current turn and date.
* Faction.
* Manpower.
* Equipment.
* Command points.
* War support.
* Campaign score.

### Left or Right Context Panel

Changes based on selection:

* Selected unit.
* Selected tile.
* City information.
* Combat preview.
* Strategic operation.
* Event or decision.

### Bottom Command Bar

* Move.
* Attack.
* Reinforce.
* Entrench.
* Strategic operations.
* Map modes.
* End turn.

### Notifications

Use a restrained notification feed for:

* Battles.
* Captured locations.
* Supply changes.
* Reinforcements.
* Events.
* Critical warnings.

---

## 18.2 Map Modes

Include at least:

* Political control.
* Supply.
* Terrain.
* Strategic objectives.
* Intelligence.

Map modes should alter presentation without replacing the entire visual identity of the map.

---

## 18.3 Tooltips

Almost every important value should have a useful tooltip.

Tooltips should explain:

* What the value means.
* What is affecting it.
* What the player can do about it.

For example, a low-supply tooltip should explain the broken connection or distance from a supply hub.

Do not expose raw implementation details unless useful.

---

## 18.4 Combat Feedback

After combat, show a concise result panel:

* Attacker losses.
* Defender losses.
* Morale and readiness changes.
* Retreat or captured territory.
* Most important modifiers.
* Updated unit conditions.

Combat should feel consequential without requiring a separate battle scene.

---

# 19. Visual Direction

Visual quality is a primary requirement.

The map should aim for the atmosphere of a modern Paradox strategy game while remaining achievable inside a compact web project.

## 19.1 Overall Style

The desired style is:

* Realistic but slightly miniaturised.
* Detailed but highly readable.
* Serious rather than cinematic.
* Atmospheric without becoming visually noisy.
* Beautiful enough that moving pieces across the map feels satisfying by itself.

Think of a carefully constructed physical relief map combined with a modern military command interface.

---

## 19.2 Terrain Presentation

The map should include:

* Subtle elevation.
* Textured fields.
* Dense forest clusters.
* Clearly modelled rivers.
* Roads and rail lines.
* Small urban clusters.
* Major-city landmarks or distinctive silhouettes.
* Atmospheric haze.
* Soft directional lighting.
* Restrained shadows.
* Seasonal variation where practical.

The camera should use a slightly tilted strategic perspective rather than a perfectly vertical board-game view.

The player must also be able to zoom out to understand the full theatre.

---

## 19.3 Units

Units can be represented by a hybrid of:

* Small 3D military miniatures.
* Formation bases.
* NATO-inspired or custom unit symbols.
* Clear information overlays.

Do not attempt to display hundreds of individual soldiers.

A unit might visually consist of:

* A small formation base.
* One or two representative vehicles or figures.
* A formation flag or insignia.
* A strength bar.
* A compact status marker.

At maximum zoom-out, replace detailed models with readable strategic counters.

---

## 19.4 Colour Palette

Use a restrained palette based on:

* Black earth.
* Dry grass.
* Muted agricultural green.
* Slate.
* Concrete grey.
* Winter blue.
* Rust.
* Desaturated military khaki.

Faction colours should be distinguishable but not overpowering.

Ukraine may use a controlled blue accent.

Russia may use a controlled dark red accent.

Avoid saturating entire territories in bright national colours.

---

## 19.5 Interface Style

The interface should feel closer to Victoria 3 than Civilization VI.

Use:

* Dark translucent panels.
* Fine borders.
* Strong typography.
* Subtle texture.
* Clear hierarchy.
* Minimal rounded “app-like” components.
* Restrained animation.
* Small amounts of metallic or cartographic detailing.

The UI should not feel like a generic SaaS dashboard.

It should feel designed specifically for a strategy game.

---

## 19.6 Typography

Use a serious and highly readable type system.

A suitable combination might include:

* A slightly editorial or historical display face for titles.
* A clean sans-serif for interface text.
* A condensed or monospaced face for map coordinates and military data.

Do not overuse decorative fonts.

---

# 20. Animation and Sound

## 20.1 Animation

Use animation to communicate state rather than create spectacle.

Examples:

* Smooth camera focus when selecting a distant unit.
* Unit movement along a path.
* Frontline transition after territory changes.
* Brief artillery flashes or distant smoke during combat.
* Supply routes pulsing in supply mode.
* City markers responding when captured.
* Subtle weather movement.
* Unit bases shaking or recoiling during combat resolution.

Avoid long combat animations.

The player should never feel that presentation is delaying the turn.

---

## 20.2 Sound

Sound should be restrained and atmospheric.

Suggested elements:

* Wind across open terrain.
* Distant mechanical ambience.
* Low-volume radio chatter.
* Occasional distant artillery.
* Soft interface clicks.
* Map movement sounds.
* Muted combat impacts.
* Low, tense ambient music.

Avoid bombastic heroic music.

The emotional tone should be concentration, uncertainty and pressure.

Provide volume controls and allow the game to run silently.

---

# 21. Technical Direction

Unless the repository environment strongly implies a different approach, build this as a self-contained browser game.

A reasonable stack is:

* TypeScript.
* React.
* Vite.
* Three.js or React Three Fiber for the map.
* Zustand or an equivalent lightweight state manager.
* CSS modules, Tailwind or a focused custom styling system.
* Local storage for save games.

No backend should be required for the first version.

The game should run with a conventional setup such as:

```bash
npm install
npm run dev
```

The final repository should include a clear README with:

* Installation instructions.
* Controls.
* Architecture overview.
* Game rules.
* Known limitations.
* Future-extension ideas.

---

# 22. Architecture Principles

Separate simulation logic from rendering.

The UI and 3D map should consume game state. They should not directly own the rules.

Suggested core entities:

```ts
GameState
Scenario
Faction
Tile
Unit
City
SupplyHub
StrategicOperation
CampaignEvent
CombatResult
TurnState
AIState
```

Suggested separation:

```text
src/
  game/
    state/
    rules/
    combat/
    movement/
    supply/
    ai/
    scenarios/
    data/
  map/
    terrain/
    units/
    overlays/
    camera/
  ui/
    panels/
    tooltips/
    menus/
    notifications/
  audio/
  assets/
```

Core actions should be represented as explicit state transitions:

```ts
moveUnit()
attackUnit()
reinforceUnit()
entrenchUnit()
useOperation()
endTurn()
resolveSupply()
resolveReinforcements()
runAITurn()
checkVictory()
```

Where practical, game-rule functions should be deterministic and testable.

Use a seeded random-number generator for combat variation so that:

* Saves remain reproducible.
* Bugs can be replicated.
* Combat does not depend on uncontrolled global randomness.

---

# 23. Data-Driven Design

Scenario content should be stored separately from the engine.

Store data such as:

* Map layout.
* Terrain.
* Cities.
* Starting control.
* Units.
* Faction resources.
* Victory conditions.
* Events.
* Operation costs.
* Unit definitions.

Use JSON or TypeScript configuration files.

This should make it possible to create another scenario later without rewriting the engine.

Do not build a full scenario editor in the first version.

---

# 24. Saving and Loading

Implement at least:

* Autosave at the start or end of each turn.
* One manual save slot or a small list of saves.
* Continue campaign from the main menu.
* New campaign confirmation when an existing save is present.

Store:

* Scenario.
* Current turn.
* Tile control.
* Unit states.
* Faction resources.
* Event history.
* RNG seed.
* AI state where necessary.

Version the save format so future updates can detect incompatible saves.

---

# 25. Onboarding

The game should be understandable without a long manual.

Include a brief first-turn tutorial using contextual prompts.

Teach the player:

1. How to select a unit.
2. How movement range works.
3. How to inspect supply.
4. How to preview an attack.
5. How to reinforce or entrench.
6. How to use one operation.
7. How to end the turn.
8. What the main victory condition is.

Do not interrupt the player with a large tutorial modal containing many paragraphs.

Teach through the actual first turn.

---

# 26. Minimum Playable Content

The vertical slice should include at least:

* One complete campaign map.
* Two playable factions.
* Approximately 12–20 units per faction.
* Four primary formation types.
* Terrain and rivers.
* Territorial control.
* Movement and zones of control.
* Combat previews.
* Combat resolution.
* Retreat.
* Entrenchment.
* Supply routes and supply penalties.
* Reinforcement.
* National resources.
* Four or more strategic operations.
* Basic fog of war.
* A coherent AI opponent.
* Victory and defeat conditions.
* Save and load.
* Main menu.
* Settings.
* Sound and music controls.
* A polished strategic map.
* Responsive tooltips and contextual panels.
* A first-turn tutorial.

---

# 27. Explicit Non-Goals

Do not attempt the following in the first version:

* Multiplayer.
* A global map.
* Detailed national politics.
* A complete economic simulation.
* Individual factories or production lines.
* Real-time combat.
* Tactical squad control.
* Detailed naval warfare.
* Independently controlled aircraft.
* Ballistic modelling.
* Individual weapon systems.
* Hundreds of unit types.
* Exact live battlefield data.
* A complete historical database.
* User accounts.
* Online services.
* Modding tools.
* Procedural campaign generation.
* A cinematic narrative campaign.
* Graphic depictions of casualties.
* A mobile-first interface.

These systems can be considered later, but they should not compromise the quality or completeness of the initial game.

---

# 28. Priority Order

When tradeoffs are necessary, use this priority order:

1. A complete and playable campaign loop.
2. Clear map interaction and readable state.
3. Visually impressive map presentation.
4. Understandable combat and supply systems.
5. Coherent AI behaviour.
6. Responsive and polished interface.
7. Additional units, events or strategic depth.

Cut features before cutting finish.

A beautifully presented 30-turn game with four unit types is better than an unfinished grand-strategy engine containing dozens of disconnected systems.

---

# 29. Definition of Done

The project is successful when a new player can:

* Launch the game without external services.
* Understand the theatre from the map.
* Choose either faction.
* Move and command formations.
* Recognise the importance of terrain and supply.
* Conduct an offensive.
* Defend against an enemy offensive.
* Rotate and reinforce damaged units.
* Use strategic operations.
* Experience meaningful territorial change.
* Play against a functioning AI.
* Reach a clear campaign conclusion.
* Save and resume progress.
* Feel that the game has a deliberate and sophisticated visual identity.

The game should not merely demonstrate mechanics.

It should feel like a small game that could be released as an early prototype of a much larger strategy title.

---

# 30. Final Product Principle

The defining idea behind **THEATRE: BLACK EARTH** is not maximal simulation.

It is **compressed strategic depth**.

The player should see a beautiful, credible theatre of war and make decisions that feel much larger than the number of rules underneath them.

Every mechanic should reinforce one of five ideas:

* Territory matters.
* Supply matters.
* Preparation matters.
* Formations have limits.
* The frontline is never static.

Build the smallest game that delivers those ideas convincingly.
