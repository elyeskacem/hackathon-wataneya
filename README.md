# Wataniya Zawaya — web VR

A time machine through 60 years of Tunisian TV (Al Wataniya), guided by a fictional AI host.
Arabic (RTL) first, French second. Built with Vite, React, TypeScript, three.js
(@react-three/fiber, drei, xr), GSAP, Howler and zustand.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build into dist/
npm run preview      # serve the production build
npm run lint
npm run test:e2e     # Playwright smoke tests (desktop + phone); first run: npx playwright install chromium
npm run assets       # rebuild public/renders/*.webp from assets/renders/
```

Node 20+ recommended.

## What works (P0 demo path)

1. **Entry**: the old TV warms up with static while the lobby really loads (progress from the
   three.js loading manager). «اضغط باش تدخل» unlocks audio; the screen "turns on" into the room.
2. **Lobby**: 2.5D living room with a slow camera settle, drag-to-look and wheel zoom. Gold
   hotspots on the TV and the tapes. A first-visit controls hint (one card at a time), then the
   guide greeting with 3 chips. «ابدا الرحلة» and «اختار لحظة».
3. **Custom mode**: the camera glides to the TV. Channels 01–09 behind 0.5 s of static. Glass
   remote (CH ▲▼, 1–9); keyboard: arrows, 1–9, Enter, Esc. Lower-third and the VHS tape shelf.
   «ادخل للحظة» pushes the camera into the screen.
4. **Inside a moment**:
   - **Choufli Hal**: office → corridor → kitchen, joined by door hotspots. Sliman and Sbou3i
     are clickable; Fochika is a silhouette placeholder.
   - **Om Kalthoum**: the concert hall with a front-row viewpoint and a stage hotspot that opens
     the archive.
   - In both: title card, character card, subtitles on a solid band, Esc or «رجوع للصالون» back
     to the lobby.
5. **Archive viewer**: the original (black and white) first, then a before/after slider
   (drag, touch, arrows, Home/End). The "AI colorized" badge, accuracy note and source line.
6. **AI guide**: one component everywhere: bubble → side panel (desktop) or bottom sheet (phone).
   - The first line says it is an AI.
   - States: idle, thinking (TV static, < 3 s), speaking (with source chip), don't know,
     unavailable.
   - 3 chips before the first question, 2 follow-ups after each answer.
   - Typed questions are matched to the knowledge file; "show me X" switches the TV channel.

Also: settings (effects off, reduced motion, fullscreen, Enter VR when a headset is present,
Français); the UI auto-hides after 3 s idle; one ambient loop per scene, ducked while the guide
is open; WebGL failure shows a clear message instead of hanging.

## Demo script for the jury (≈ 3 minutes)

1. Open the site on the laptop, full screen (menu → ملء الشاشة). Let the static and the
   percentage run, then tap **«اضغط باش تدخل»** — sound comes on with the room.
2. In the lobby, show the hint card once (**التالي** ×3). Point out the guide card: *"its first
   line says it's an AI — a fictional Wataniya host, never a real person."*
3. Tap the chip **«ورّيني شوفلي حل»** — the guide answers and the camera glides to the TV on
   channel 01. Press **2** on the keyboard: static, then the Om Kalthoum concert. Open
   **«رفّ الكاسيط»** to show all 9 tapes, pick **01** again.
4. **«ادخل للحظة»**: the tape goes in, the camera pushes through the screen into Choufli Hal.
   Click **«احكيلي على سليمان»** → character card and subtitle band. Walk **الكولوار → الكوجينة**
   to meet Sbou3i.
5. **«شوف الأرشيف»**: the original appears first, then drag the slider to the colour version.
   Point at the badge «ملوّن بالذكاء الاصطناعي», the accuracy note and the source line.
6. Open the guide and type **«وقتاش صارت الحفلة؟»** — it answers *«ما لقيتش هذا في الأرشيف»*
   and suggests two questions: *"it never invents a date."*
7. **Esc** back to the living room. Optional: menu → المؤثرات off to show the calm mode.

## Configuration

Copy `.env.example` to `.env.local`. Nothing secret goes in it — every `VITE_*` value ships to the browser.

| Variable | Default | Effect |
|---|---|---|
| `VITE_SHOW_OM_KALTHOUM_FIGURE` | `false` | Shows the 3D figure of Om Kalthoum on stage. Off: she appears only through the archive (research ethics). |
| `VITE_SHOW_UNVERIFIED_YEARS` | `false` | Shows years not yet verified (rehearsal only). |
| `VITE_GUIDE_ENDPOINT` | empty | POST endpoint of a server-side LLM guide. Without it the guide uses `data/guide-knowledge.json`. |

### Plugging in a real LLM guide

`src/features/guide/adapters.ts` defines a `GuideAdapter`. The remote adapter POSTs
`{ text, entryId?, context, locale }` and expects
`{ kind: "answer", text, more?, source, year, action?, followUps }` or `{ kind: "dont-know", suggestions }`.
The server keeps the API key and must answer from the archive only. The client still turns any
answer without a source into "I don't know".

## Project layout

```
src/
  app/        routes store, settings, transitions (curtain, tape insert), idle hook
  stage/      the persistent R3F canvas, camera rig, 2.5D backdrop frame, hotspots
  features/   entry · lobby · custom · moment · archive · guide (one folder each)
  audio/      AudioManager (Howler context, synthesised placeholders), ambience per route
  ui/         top bar, settings menu, icon button, curtain, logo, TV static
  i18n/       ar.json (default, RTL) and fr.json
  styles/     tokens.css (Figma variables, Theme · Dark) and global styles
data/         moments.json, guide-knowledge.json
assets/       raw renders (source); public/renders/ holds the optimised WebP files
docs/         PLAN.md, TO-VERIFY.md, research PDF, exported Figma screens
tests/e2e/    Playwright smoke tests
```

## Known limitations

- **No GLB models yet**: every scene is 2.5D (flat render plus parallax props and characters).
  The renders are small (≈ 850–1600 px wide), so they look soft on large screens.
- **Placeholders**: archive frames are black-and-white versions of the renders, clearly labelled.
  All sound is synthesised. Fochika is a silhouette.
- **Facts**: years and archive facts are hidden until verified — see `docs/TO-VERIFY.md`.
- **Not built yet (P1)**:
  - «ابدا الرحلة» opens the TV on channel 01; Story mode comes next.
  - Booking the VR stand.
  - The 2D fallback page. Without WebGL the entry screen explains the problem instead.
  - Moments 03–09 show a placeholder card, plus the patio render for Mnamet Aroussia.
- The guide is text-only for the demo (the mic button is visible but disabled).
- Lighthouse (desktop, software WebGL): accessibility 100, best practices 96, FCP 0.7 s,
  LCP 0.8 s, CLS 0.005; performance 69 because of three.js start-up cost under software rendering.
