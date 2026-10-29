# Cosmic Collapse

MASTER GAME DEVELOPMENT PROMPT — COSMIC COLLAPSE

A Complete, Polished 2D Space Arcade Game

PROJECT GOAL

Build a complete, polished, highly satisfying 2D browser game called Cosmic Collapse.

The player controls a black hole that starts tiny and gradually grows by absorbing asteroids, moons, planets, stars, and other cosmic objects. As the player gains mass, their gravitational pull and event horizon increase, allowing them to absorb increasingly massive objects and progress through a campaign of cosmic environments.

The core inspiration is the accessible, satisfying growth loop of .io arcade games such as Hole.io, combined with an original space setting, beautiful cosmic visuals, progression, upgrades, unlockable cosmetics, and increasingly spectacular absorption effects.

This must be an original game with its own branding, visuals, interface, level design, physics, and progression.

The most important priorities are:

Extremely satisfying absorption and growth mechanics.

Beautiful, polished, animated space visuals.

Smooth, responsive controls.

A progression system that gives the player a reason to keep playing.

A stable, fully functional browser game that can be exported and hosted as a static website.

A complete, playable experience rather than a visual mockup.

Do not finish after generating a title screen or a basic prototype. Implement the actual gameplay systems, test them, and fix any issues that can be identified.

SECTION 1 — TECHNICAL ARCHITECTURE

1.1 Platform and technology

Build the game as a 2D HTML5 browser game.

Preferred technology:

HTML5 Canvas for rendering the game world.

JavaScript for physics, movement, spawning, absorption, progression, and game logic.

HTML and CSS for menus, HUD elements, settings, upgrades, and overlays.

requestAnimationFrame for smooth rendering.

localStorage for saving progress.

Web Audio API for lightweight original sound effects, where appropriate.

If the selected AI builder requires React or another framework, use it for menus and application structure while keeping the actual game loop efficient.

The finished game must be exportable and deployable as a normal website. Do not require a backend, account, paid API, or external service to play the core game.

Keep gameplay logic separate from UI code wherever possible. Use organized modules or clearly separated functions for rendering, physics, input, progression, save data, audio, and interface management.

Create a single configurable game-data structure containing object types, mass values, level objectives, rewards, movement settings, upgrade prices, and spawn probabilities.

Avoid unnecessary dependencies and large downloads. Keep the initial load lightweight.

1.2 Game states

Implement a proper state machine with these states:

Main menu.

Campaign level selection.

Tutorial.

Active gameplay.

Paused gameplay.

Level completed.

Game completed.

Upgrade shop.

Cosmetic hangar.

Settings.

Confirmation dialogs.

Transitions between states must work correctly.

When the game is paused, all gameplay physics, movement, timers, object spawning, and gameplay animations must pause. Menus must not accidentally trigger gameplay input.

Restarting a level must reset its temporary gameplay state without deleting permanent campaign progress, purchased upgrades, or unlocked skins.

SECTION 2 — ART DIRECTION AND VISUAL QUALITY

2.1 Overall visual style

Create a premium-looking, modern space arcade game with a dark cosmic background and vivid glowing objects.

The game should feel atmospheric, mysterious, powerful, and satisfying.

Use:

Deep navy, near-black, indigo, purple, and blue backgrounds.

Cyan, violet, magenta, gold, and occasional emerald highlights.

Soft nebula clouds.

Multiple layers of parallax stars.

Glowing planets with shaded surfaces.

Animated asteroid fields.

Atmospheric planetary rims.

Colorful gas giant rings.

Rare stars with intense luminous effects.

A detailed black hole with a dark central event horizon and a bright rotating accretion disk.

Avoid flat, unshaded circles as the final visual treatment for every object. Give major objects distinct appearances, silhouettes, colours, and details.

Use procedural Canvas drawing where it provides good quality and performance. If external artwork is used, it must be properly licensed and optimized.

The visuals must remain clear during gameplay. Glow effects should enhance readability rather than obscure objects.

2.2 Background and environment

Create a continuous space environment that extends beyond the visible screen.

The background must include:

Several layers of stars moving at different apparent speeds.

Subtle distant galaxies and nebulae.

Slowly drifting cosmic dust.

Occasional distant shooting stars.

Rare background phenomena that add atmosphere without distracting from gameplay.

Use camera-relative parallax so distant objects move more slowly than nearby objects as the player travels.

Generate an effectively continuous play area. Do not visibly expose hard world boundaries during ordinary gameplay.

The camera should smoothly follow the black hole with subtle easing. Avoid sudden camera jumps or excessive camera lag.

2.3 Black-hole rendering

The black hole is the main character and must receive the most visual attention.

Create the following visual layers:

Event horizon: A nearly black circular centre with a subtle rim.

Accretion disk: A luminous elliptical ring surrounding the event horizon.

Multiple colour bands: At least two rings with different colours and brightness.

Rotation: The accretion disk should rotate continuously, with layered rings moving at different speeds.

Atmospheric glow: A soft, animated halo surrounding the black hole.

Particle motion: Tiny luminous particles that spiral toward the event horizon.

Growth animation: The event horizon and rings should expand smoothly as mass increases.

Mass milestone effect: Important growth milestones should produce a short, spectacular visual burst.

Absorption distortion: Nearby objects should visibly bend or curve toward the black hole.

Skin integration: Cosmetic skins must recolour the luminous rings and particles without obscuring the event horizon.

The black hole must look visually impressive even when it is small.

Avoid resizing it abruptly when the player absorbs a large object. Use a short, smooth growth animation.

2.4 Planet and object artwork

Create visually distinct objects for each category.

Space dust

Tiny glowing fragments.

Mostly cyan, white, and pale blue.

Small particle trails when pulled inward.

Asteroids

Irregular silhouettes.

Several surface facets and craters.

Subtle rotation.

Grey, blue-grey, or muted purple colours.

Different sizes and mass values.

Moons

Spherical bodies with craters and shaded surfaces.

Grey, silver, icy blue, or pale violet colours.

Rocky planets

Blue, green, rust, or purple surfaces.

Atmospheric rims.

Subtle clouds or surface patterns.

Larger visual scale than moons.

Gas giants

Distinct atmospheric bands.

Large rings on selected planets.

Larger gravitational and absorption effects.

Stars

Warm luminous cores.

Animated outer glow.

Radial light effects.

Distinct absorption animations.

Rare cosmic objects

Introduce neutron stars, unusual stellar remnants, and other fictional cosmic objects at higher campaign stages. These should have distinctive silhouettes and rewards.

Object appearance, mass, and absorption difficulty must correlate in a way that players can intuitively understand.

SECTION 3 — MOVEMENT AND INPUT

3.1 Desktop controls

Support:

W to move upward.

A to move left.

S to move downward.

D to move right.

Arrow keys as alternatives.

Escape to pause or resume when appropriate.

Movement must be responsive, smooth, and consistent.

Implement acceleration and deceleration so movement feels fluid without being slippery. Normalize diagonal movement so moving diagonally is not faster than moving in a straight line.

Provide a configurable movement-speed setting or upgrade system.

The player must not get stuck because a key event is missed. Reset held input appropriately when the browser loses focus.

3.2 Mobile controls

Support touchscreens using a virtual joystick.

The joystick must:

Appear only on touch-oriented layouts.

Have a clear base and draggable knob.

Respond immediately to touch.

Clamp movement input to a defined radius.

Return to the centre when released.

Support pointer cancellation and interrupted touches.

Never trigger browser scrolling while being used.

Scale and position it appropriately for different screen sizes.

All menus, level-selection screens, and shop controls must also be usable on mobile.

3.3 Movement tuning

Start with a base movement speed that feels responsive when the player is small.

As mass increases, the player may become slightly slower, but the reduction must be gentle. The player should never feel unable to reach useful targets.

Movement upgrades should offset this effect.

Test keyboard input, joystick input, pause/resume, and restarting to ensure controls always remain functional.

SECTION 4 — GRAVITY AND ABSORPTION SYSTEM

This is the most important gameplay system. It must be fully functional and carefully balanced.

4.1 Mass model

Every absorbable object must have:

An object type.

A world position.

A collision radius.

A visual radius.

A mass value.

A minimum player mass requirement.

A gravity attraction strength.

An absorption reward.

A visual rarity.

A spawn probability.

An animation state.

The player must have:

Current mass.

Current event-horizon radius.

Current gravity radius.

Current movement speed.

Current absorption eligibility.

Current upgrade multipliers.

Keep the mass model consistent. Absorbing an object should add its configured mass to the player's mass, with any upgrade multipliers applied according to clearly defined rules.

4.2 Gravity-field behaviour

Each object should respond to the player's gravity field.

When an object is outside the field, it should drift or remain in its local environment.

When an object enters the field:

Determine whether the player is large enough to absorb it.

If eligible, begin attracting it toward the black hole.

Increase its inward acceleration as it gets closer.

Add subtle tangential motion so the object spirals inward.

Rotate the object naturally during the approach.

Animate it shrinking as it approaches the event horizon.

Remove it only after the absorption animation completes.

Award mass and rewards exactly once.

Objects must not disappear simply because they enter the outer gravity radius.

4.3 Eligibility and resistance

A large planet should not be absorbable by a tiny black hole.

Define absorption thresholds based on object mass and/or radius. Keep these rules configurable.

When the player is too small:

The object remains visible.

It should not award mass.

It may wobble or show a subtle resistance effect when near the black hole.

A small visual indicator may communicate that it is currently too massive.

Do not use an unexplained invisible barrier that frustrates players.

As the player grows, previously resistant objects should eventually become absorbable.

Ensure a sufficient supply of currently absorbable targets is always available.

4.4 Absorption animations

Small objects should be absorbed quickly so the game stays fast.

Larger objects should have longer, more dramatic animations.

For a major planet:

Show the planet being pulled off its normal path.

Add an accelerating spiral.

Create a short luminous trail.

Shrink the planet toward the event horizon.

Produce a burst of particles at the moment of absorption.

Show the mass reward floating briefly above the black hole.

Trigger a satisfying sound.

Apply a very short camera shake if appropriate.

For a star or rare cosmic object, add a stronger flash, expanding ring, and more particles. Avoid effects that cover the entire screen for too long.

Never award mass twice for one object. Use a clear consumed/absorbing state and remove the object safely after the animation.

SECTION 5 — OBJECT TYPES AND BALANCING

Start with these suggested mass values. Treat them as tuning defaults rather than immutable rules.

ObjectApproximate massIntended stageSpace dust2–5Starting stageTiny asteroid5–12Starting stageLarge asteroid12–25Early campaignMoon20–45Early to middle campaignSmall rocky planet30–70Middle campaignEarth-sized planet60–130Middle campaignGas giant120–280Middle to late campaignStar250–650Late campaignNeutron star500–1,200Late campaignRare cosmic object800–2,000+Final campaign

Tune minimum absorption requirements separately from the mass reward.

Large objects should feel valuable, but the player must not be able to skip the intended progression too easily.

Create a data-driven spawn system. Each level should specify the available object categories, spawn probabilities, object density, and rare-object chance.

Spawn objects around the player and beyond the visible camera bounds so exploration feels continuous.

Prevent object clustering from becoming overwhelming. Maintain a sensible maximum number of active objects and use object pooling if necessary.

Always ensure the player can find enough absorbable objects to make progress.

SECTION 6 — TEN-LEVEL CAMPAIGN

Build a complete campaign containing ten playable levels, grouped into five sectors.

Each level must have its own:

Name.

Theme.

Mass objective.

Available object categories.

Spawn probabilities.

Difficulty profile.

Reward.

Completion screen.

Use the following design as the starting structure.

Sector 1: Asteroid Belt

Level 1 — First Contact

Introduce movement, gravity, absorption, and growth.

Only space dust and tiny asteroids should appear at the beginning. Show a short tutorial prompt for each new mechanic.

Suggested mass target: 80.

Level 2 — The Shattered Belt

Introduce larger asteroids and slightly denser fields.

Suggested mass target: 190.

Sector 2: Lunar Frontier

Level 3 — Moonfall

Introduce moons and more challenging mass thresholds.

Suggested mass target: 380.

Level 4 — Blue Giant

Introduce small planets and larger rewards.

Suggested mass target: 700.

Sector 3: Solar System

Level 5 — Planet Eater

Introduce Earth-sized planets and gas giants.

Suggested mass target: 1,150.

Level 6 — Gravity Well

Increase object variety and introduce more massive targets.

Suggested mass target: 1,750.

Sector 4: Stellar Graveyard

Level 7 — Deadlight

Introduce stars and rare cosmic objects.

Suggested mass target: 2,500.

Level 8 — Quasar Fields

Increase the scale of objects and create more spectacular absorption moments.

Suggested mass target: 3,500.

Sector 5: Galactic Core

Level 9 — Last Light

Introduce the most massive normal targets and rare objects.

Suggested mass target: 4,800.

Level 10 — Singularity Zero

Final campaign challenge. Require the player to absorb a variety of large objects and reach a final mass target.

Suggested mass target: 6,500.

These objectives must be playtested. Adjust object values, spawn rates, and requirements to avoid excessive grinding or sudden difficulty spikes.

Do not make a level impossible because the player cannot find objects that meet the current absorption threshold.

Level completion

When the player reaches the objective:

Freeze gameplay.

Play a completion animation.

Display the level name and final mass.

Show the time taken.

Show Cosmic Gems earned.

Show any optional objectives completed.

Unlock the next level.

Provide Continue, Replay, and Main Menu controls.

Do not reset the campaign when a level is completed.

Store the highest unlocked level and completed-level status in saved data.

SECTION 7 — TUTORIAL AND ONBOARDING

The first minute must be immediately understandable.

Create a short, interactive tutorial that teaches one mechanic at a time.

Tutorial step 1: Move

Display: "Move with WASD or the arrow keys."

Wait until the player moves a meaningful distance.

Tutorial step 2: Find small objects

Highlight nearby space dust and asteroids.

Display: "Look for objects small enough to absorb."

Tutorial step 3: Use gravity

Show an object being attracted toward the black hole.

Display: "Nearby objects are pulled toward your event horizon."

Tutorial step 4: Grow

Show the mass counter increasing and the black hole expanding.

Display: "Every absorption increases your mass."

Tutorial step 5: Reach the goal

Highlight the progress bar.

Display: "Reach the target mass to complete the sector."

Allow the player to dismiss tutorial messages after the essential mechanics have been explained.

Do not block movement unnecessarily or force long unskippable dialogue.

Save tutorial completion so it does not repeat every time the game is opened.

SECTION 8 — PROGRESSION, REWARDS, AND UPGRADES

8.1 Cosmic Gems

Introduce Cosmic Gems as the permanent in-game currency.

Award gems for:

Completing a level.

Absorbing selected rare objects.

Reaching mass milestones.

Completing optional challenges.

Completing the campaign.

Use a balanced reward structure. Do not award so many gems that the shop becomes meaningless.

Display the gem balance in the HUD and shop.

Never allow the balance to become negative. Prevent duplicated rewards from repeated clicks, restarting a completed level, or refreshing the browser.

8.2 Upgrade shop

Create a dedicated upgrade screen.

Include these upgrades:

Gravity Radius

Increases the distance at which eligible objects begin moving toward the player.

Suggested tiers: five.

Growth Bonus

Increases the mass gained from eligible absorptions.

Suggested tiers: five.

Movement Speed

Increases the player's maximum movement speed.

Suggested tiers: five.

Absorption Efficiency

Slightly improves the speed of the final inward spiral for absorbable objects.

Suggested tiers: three.

Each upgrade must show:

Its name.

Its current level.

Its effect.

The next level's effect.

Its cost.

A purchase button.

A clear indication when it is maxed out.

Upgrades must have actual gameplay effects, not just change the displayed numbers.

Balance upgrades so they make progression easier without eliminating the need to grow naturally.

8.3 Cosmetic hangar

Create a separate cosmetics screen with at least eight unlockable skins.

Suggested skins:

Event Horizon — default cyan and purple.

Violet Nebula — violet and indigo.

Solar Flare — gold and orange.

Emerald Void — green and cyan.

Rose Quasar — pink and lavender.

Frozen Singularity — ice blue and white.

Crimson Collapse — crimson and violet.

Galactic Crown — animated multicolour rings, earned through a late-game milestone.

Cosmetic skins must be unlockable using Cosmic Gems or campaign achievements.

Allow players to preview a skin before purchasing it. Show which skins are locked, unlocked, and equipped.

Equipping a skin must update the actual black-hole rendering in gameplay.

Do not let cosmetic effects obscure the black hole or affect gameplay unfairly.

8.4 Optional objectives

Add optional objectives that encourage different play styles.

Examples:

Complete a level within a target time.

Absorb a specified number of planets.

Absorb a rare cosmic object.

Reach a bonus mass threshold.

Optional objectives should reward extra gems without making the main campaign dependent on them.

SECTION 9 — USER INTERFACE

9.1 Main menu

Create an attractive main menu featuring:

Cosmic Collapse title.

Animated space background.

A slowly rotating black hole.

Play Campaign.

Continue.

Level Select.

Upgrades.

Hangar.

Settings.

The menu should feel premium and responsive.

Do not overcrowd it with excessive text or unnecessary decorative buttons.

The Continue button should resume from the highest unlocked campaign level or the appropriate saved campaign state.

9.2 Gameplay HUD

Display:

Current mass.

Current level and sector.

Target mass.

A clear progress bar.

Current Cosmic Gems.

Pause button.

Optional sound control.

Make the progress bar animate smoothly when mass increases.

Use compact, readable typography and clear contrast.

Do not cover the black hole or major gameplay objects with large UI panels.

Keep the interface responsive to different aspect ratios.

9.3 Pause menu

Include:

Resume.

Restart Level.

Settings.

Return to Main Menu.

Restarting must require confirmation if the current level contains meaningful temporary progress that would be lost.

9.4 Level selection

Show all ten campaign levels in a clear progression layout.

Each level should display:

Name.

Sector.

Locked or unlocked status.

Completion status.

Best completion time if implemented.

Locked levels must not be playable through direct clicks or keyboard input.

9.5 Settings

Include:

Master audio toggle.

Sound-effects volume.

Music volume if background music is implemented.

Screen shake toggle.

Reduced visual effects option.

Reset saved progress, with a confirmation dialog.

Persist these settings between sessions.

SECTION 10 — AUDIO AND FEEDBACK

Use original or properly licensed audio.

Implement sounds for:

Menu interaction.

Small-object absorption.

Planet absorption.

Star absorption.

Mass milestones.

Level completion.

Gem rewards.

Upgrade purchases.

The sounds should be short, satisfying, and not excessively repetitive.

Use pitch or volume variation for repeated small-object absorption.

Add subtle ambient space music only if it can be implemented without slowing down loading or requiring unreliable external services.

Provide functional audio controls.

Respect browser autoplay restrictions. Start audio only after a user interaction when required.

The game must remain playable if audio fails or is muted.

SECTION 11 — GAME FEEL AND POLISH

The game must feel responsive and rewarding.

Implement:

Smooth acceleration and deceleration.

Gentle camera follow.

Animated mass changes.

Floating reward text.

Particle bursts.

Expanding rings after major absorptions.

Small, configurable screen shake.

Smooth menu transitions.

Button hover and click feedback.

Clear visual distinction between eligible and ineligible targets.

Brief notifications when new object types become absorbable.

A visible indication when a sector is close to completion.

Avoid excessive flashes, constant screen shake, or long animations that interrupt play.

Include a reduced-effects option for performance and accessibility.

Major gameplay feedback must remain understandable even with audio turned off.

SECTION 12 — SAVE SYSTEM AND DATA SAFETY

Use localStorage for persistent local progress.

Save:

Highest unlocked level.

Completed levels.

Cosmic Gem balance.

Purchased upgrade tiers.

Unlocked skins.

Equipped skin.

Audio settings.

Visual-effects settings.

Tutorial completion.

Optional best times and achievements.

Validate saved data when loading it. Handle missing, malformed, or outdated saves gracefully.

Create a save-version field so future updates can migrate older save data.

Do not overwrite valid progress with default values simply because one saved field is missing.

Add a reset-progress option with a confirmation step.

The game must still work in a fresh browser session with no saved data.

Do not require a login or external account to save local progress.

SECTION 13 — PERFORMANCE AND RELIABILITY

The game should run smoothly on ordinary desktop computers and modern mobile devices.

Requirements:

Aim for 60 FPS on capable devices.

Use a reasonable maximum device-pixel ratio for Canvas rendering.

Limit particle counts.

Reuse particle objects where useful.

Remove consumed objects safely.

Prevent unbounded object spawning.

Use efficient distance checks and avoid unnecessary calculations.

Avoid memory leaks.

Handle browser resizing.

Handle tab switching and loss of focus.

Avoid repeated event-listener registration.

Ensure the game can pause and resume without broken timers or physics.

Avoid external network dependencies for essential gameplay.

Provide a clear fallback if localStorage is unavailable.

The game loop must use a capped delta time or fixed-step approach so returning to a tab does not cause objects to jump across the screen.

Ensure collision and absorption checks remain stable when the player or an object moves quickly.

SECTION 14 — ACCESSIBILITY AND DEVICE SUPPORT

Support:

Desktop Chrome.

Desktop Edge.

Desktop Firefox where practical.

Mobile Chrome.

Mobile Safari where practical.

Provide clear keyboard instructions and touch controls.

Use readable text and sufficient contrast.

Do not rely exclusively on colour to communicate whether an object is absorbable.

Allow the player to disable camera shake and reduce particle effects.

Ensure the interface does not become unusable on narrow screens.

The game should work with different window sizes and orientations.

SECTION 15 — SECURITY AND DEPLOYMENT

The game must not:

Execute downloaded code.

Collect personal information.

Require unnecessary permissions.

Include hidden analytics or external tracking.

Require an external service for core gameplay.

Use local browser storage only for game progress and preferences.

Organize the project so it can be exported and deployed as a static website.

Include a valid root index.html and all required scripts and assets in the exported package.

Ensure relative asset paths work when deployed to a subdirectory, if the hosting platform uses one.

Do not claim that the game is ready for publishing until the exported build has been tested.

SECTION 16 — REQUIRED QUALITY ASSURANCE

Before finishing, test the following and fix any discovered problems.

Startup

The game loads without fatal errors.

The main menu appears correctly.

The Play button starts the game.

A fresh save initializes correctly.

Movement

WASD works.

Arrow keys work.

Diagonal movement is normalized.

Touch joystick works.

Input resets correctly after pausing or losing focus.

Absorption

Eligible objects are attracted.

Ineligible objects are not accidentally consumed.

Absorption animations complete.

Mass is awarded exactly once.

Objects do not remain stuck in an absorbing state.

Growth remains smooth after large absorptions.

Progression

Mass targets update correctly.

Level completion triggers at the correct time.

Rewards are awarded exactly once.

The next level unlocks.

Locked levels cannot be entered.

The final campaign level can be completed.

Shop

Purchases work.

Unaffordable items cannot be purchased.

Currency never becomes negative.

Upgrades affect actual gameplay.

Skins correctly change the black hole's appearance.

Purchased items remain unlocked after refreshing.

Saving

Progress survives a page refresh.

Missing save fields do not break the game.

Reset progress works only after confirmation.

The game works without any existing saved data.

Interface

Pause and resume work.

Restart works.

Main menu navigation works.

Settings work.

UI elements do not overlap on desktop or mobile.

Buttons perform their advertised actions.

Performance

No unbounded growth in active objects.

Particle effects remain controlled.

The game remains responsive during major absorption events.

No fatal console errors occur during normal play.

Actually test functionality where the environment allows it. Do not claim a feature has passed testing if it has not been tested.

SECTION 17 — DEVELOPMENT PRIORITIES

Implement the game in this order:

A working Canvas game with movement, a black hole, objects, gravity, and absorption.

Correct mass progression, object eligibility, and smooth growth.

A functioning ten-level campaign and level-completion system.

Polished object rendering, particle effects, and absorption animations.

Main menu, HUD, pause screen, tutorial, and level selection.

Cosmic Gems, upgrades, skins, and local save persistence.

Audio, mobile support, accessibility options, and performance optimization.

Final testing and bug fixes.

If the AI builder cannot implement everything in one generation, preserve the existing working code and continue in small, testable stages. Do not replace working gameplay with a static mockup or discard previously completed features.

Prioritize a small number of fully functional systems over a large number of broken features.

FINAL DELIVERABLE

Deliver a complete, playable browser game called Cosmic Collapse with:

A polished 2D cosmic visual style.

A satisfying black-hole absorption system.

Ten campaign levels across five sectors.

Multiple object categories.

Mass progression and gravity upgrades.

Cosmic Gems and a functional cosmetic shop.

At least eight unlockable skins.

Keyboard and touch controls.

Tutorial and responsive interface.

Audio and visual-effects settings.

Persistent local saves.

A complete level-completion flow.

A working final campaign level.

A tested, exportable static website build.

The final result should feel like a small, professionally designed arcade game rather than a school project or a generic template.

Do not stop after explaining the code or displaying a preview. Build the actual playable game, run the available tests, fix problems, and clearly identify any remaining limitations.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b0d683aa-62bb-55df-9af8-e61c9b4b6af0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
