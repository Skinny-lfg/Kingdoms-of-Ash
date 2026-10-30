# Kingdoms of Ash — Strategic Warfare (English)

A playable single-player, turn-based strategy prototype inspired by the decisions in classic village strategy games. All in-game menus, names, instructions and battle reports are in English.

## Playing
Open `index.html` or use the GitHub Pages preview under `/strategy/`. The game never advances by itself. Click **End turn** to move production, construction, armies, diplomacy and rival plans forward by one turn. On mobile, the fixed green button shows the current turn.

The main navigation is **Fields → Village → Map → Army → Diplomacy → Ranking → Reports → Chronicle**. Clicking a resource field or a town-center building opens the corresponding upgrade. Every village can have its own garrison.

## Strategic gameplay
- **Raids:** neutral farmsteads, merchant caravans, bandit camps and wilderness have finite resource stocks. Stocks regenerate; caravans relocate every six turns. Raids favor low casualties and return only as much loot as the surviving army can carry. Battle reports show estimated net gains after troop replacement costs; the Army view keeps a raid-profit ledger.
- **Armies:** troops recruit into the global *mobile reserve*. Station them in a village to defend it; withdraw to use them for field operations. Send up to half a stationed garrison as reinforcements to another owned village; troops arrive after travel time.
- **Defenses:** prepare temporary fortifications, lay ambushes in forests, or evacuate troops and protect stores when a major attack is imminent. Incoming enemy armies show estimated arrival turns, allowing a reaction. Counterattack the origin of an incoming enemy army while it is away.
- **Attack tactics:** **Raid** steals resources and seeks safe withdrawals; **Attack** damages opposing forces without taking resources; **Siege** uses catapults and extra preparation time to attempt conquest. Surviving defenders retreat to reserve after a captured village falls.
- **Scouting:** spend wood and grain to reveal local guards/garrisons and resource estimates for four turns. Scouting enemy villages also reveals known AI plans in Diplomacy.
- **Strategic map:** mountains improve defense, forests favor defense/ambush, plains help cavalry, strategic passes give ranking value, and distant supply lines reduce attacking strength.
- **Diplomacy:** non-aggression pacts and alliances influence income; nearby allies add a modest defensive bonus. Gifts, war, peace and support remain available.
- **Rival AI:** five rival personalities can form multi-turn expansion, defensive and offensive plans, reinforce threatened capitals, and retaliate. They operate within their own resource constraints, using the same movement and attack rules.
- **Reports:** exact participating soldiers by class, survivors, casualties, terrain/supply modifiers, looted resources, carrying capacity and net-raiding estimates are retained in your local save.

## Saved campaigns
This preview saves to `kingdoms-of-ash-strategy-en` in browser localStorage. It can import saves from previous versions without overwriting those older save slots. A migrated game may have unassigned reserve troops; open the Army tab and station troops for real village defense.

## Tests
Run `node --test` in the repository root. Tests cover economy, farming, reinforcements, garrisons, siege, reconnaissance, migration, defense, English UI and repeated AI turns.

## Current design limits
The prototype still shares a single imperial treasury instead of individual village warehouses. Armies on the map are simulated as missions rather than movable battlefield pieces. Enemy diplomatic and military behavior is heuristic, not a full planning AI. Numbers are provisional and should be balanced after hands-on playtests.
