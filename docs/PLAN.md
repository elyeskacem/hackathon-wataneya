# Wataniya Zawaya: web VR build plan

Status: P0 built on `feature/web-vr-experience` (see README). Notes added during the build:
- The lobby render was already in the repo (`CHOFLI HAL9 1.png` is the living room); the Figma pull confirmed it.
- The guide portrait is a drawn, fictional host silhouette (the Figma vector was not exported).
- `old tv 1.png` had a studio background; it is cut out with a hand-traced mask in `scripts/optimize-assets.mjs`.

## 1. What I read

| Source | Read | Notes |
|---|---|---|
| `docs/figma/1-entry.png` … `4-moment.png` | All 4 boards | Desktop and mobile frames, plus the "Motion + Sound" and "3D handoff" spec cards for each screen |
| `docs/research/VR + Web.pdf` | All 7 pages | Concept, 9 moments, avatar states and copy, screen goals, principles, risks, user test |
| Figma variables (`get_variable_defs`, node 56:13224) | Called once | Colours, glass, spacing, radii, sizes, 4 text styles. One extra call failed (a page node isn't accepted) |
| `public/renders/` | 17 PNGs, 4 opened | Backdrops and character cut-outs (details in §5) |
| `public/models/` | **Missing** | No GLB files. Every scene starts as 2.5D parallax |

Figma calls left in the budget: I plan **at most 2** `get_design_context` calls, on the guide panel and the VHS card. Everything else can be read off the PNGs.

## 2. Design tokens (from Figma, Theme · Dark)

These become `src/styles/tokens.css` as CSS variables. Components never use raw values.

- **Colour:** `bg/default #1b1c1e`, `tv/screen #0c0d0e`, `accent/default = red/500 #e30613`, `memory/gold #c9a227`, `memory/paper #f5efe3`, `memory/wood #5a3a24`, `ink/500 #6b6e75`, `text/primary #fff`, `icon/inactive #ffffff99`, `art/warm-300 #c9beb1`, `art/warm-500 #a39686`, `art/ink-700 #2c2d30`, `art/ink-900 #1b1c1e`
- **Glass:** `glass/panel #1b1c1eb2`, `glass/control #1b1c1e99`, `glass/border #ffffff3d`, `glass/highlight #ffffff66`, `glass/inner-glow #ffffff1f`. The Glass/Liquid effect becomes `backdrop-filter: blur(10px)` plus two inset shadows.
- **Scrim and shadow:** `scrim/room #1b1c1ecc → scrim/room-end`, `shadow/float #00000066`
- **Space:** 4 · 8 · 12 · 16 · 24 · 32 · 48. **Radius:** sm 8 · md 16 · lg 24 · full 999
- **Size:** `touch-min 48` (above the 44 px floor), `avatar-bubble 64`
- **Type:** Heading/H3 is Changa SemiBold 18/1.4. Body is Cairo 16 SemiBold/1.6. Body/Small is Cairo 14/1.5 (Regular and SemiBold). Meta/Caption is IBM Plex Mono 12/1.4.
  - **Inferred, not in the variables:** the big display text (64 %, the moment title, the Story year) looks like Changa Bold at about 48–64 px. I'll add it as `--type-display` and mark it inferred.

**Contrast check:** white on `glass/panel` over the scene passes AA. `memory/gold` is used only for rings and borders, never for small text. White on red `#e30613` gives about 4.6:1, which passes AA for button labels.

## 3. Architecture

```
Vite + React 18 + TypeScript (strict)
├─ Router: a tiny state machine (not react-router): entry → lobby → custom → moment/:id
│                                                    ↘ story ↗   ↘ booking   ↘ fallback2d
├─ <Stage> one persistent R3F <Canvas> (dpr [1,2], frameloop "demand" when idle)
│     └─ <Suspense> per scene; scenes lazy-imported; dispose on unmount
├─ DOM overlay layer (glass UI at the edges, auto-hide after 3 s idle)
├─ Stores: zustand (app/route, settings, guide, booking)
├─ Audio: Howler, one AudioManager; muted until the first tap; crossfaded ambient loop per scene
├─ i18n: ar (default, dir="rtl") + fr JSON; logo excluded from mirroring
└─ XR: @react-three/xr; the "Enter VR" item shows only if navigator.xr supports immersive-vr
```

**Why one persistent canvas:** camera glides between the lobby, the TV and a moment stay continuous, there's no WebGL context churn, and moments mount and unmount inside it so their textures get disposed.

**2.5D parallax recipe** (used for every scene until GLBs exist): 2–4 textured planes at different depths (backdrop, mid props, character cut-outs). The camera drifts slowly (±1.5°, 12 s sine) and follows the pointer slightly. Hotspots are world-space anchors projected to DOM through drei `<Html>`, so they stay accessible as real buttons. With reduced motion there's no drift and transitions are fades.

### Folders

```
src/
  app/            App.tsx, routes.ts (state machine), useIdle.ts
  stage/          Stage.tsx (Canvas), CameraRig.tsx (GSAP glides), ParallaxScene.tsx, Hotspot3D.tsx
  features/
    entry/        EntryScreen, TvWarmup (static canvas), useAssetProgress
    lobby/        LobbyScene, ControlsHint, LobbyActions
    custom/       CustomScene, TvSet, ChannelStatic, Remote, LowerThird, TapeDrawer, VhsCard
    moment/       MomentScene, TitleCard, CharacterCard, DoorHotspot, SubtitleBand, scenes/{choufli-hal,om-kalthoum}.ts
    archive/      ArchiveViewer, BeforeAfterSlider, AiBadge, SourceLine
    guide/        GuideBubble, GuidePanel (side panel/bottom sheet), GuideStates, Chips, guideEngine.ts, adapters/{local,remote}.ts
    story/        (P1) StoryMode, StopCard, StopProgress, JumpMenu
    booking/      (P1) BookingFlow
    fallback/     (P1) Fallback2D
  ui/             GlassButton, IconButton, TopBar (menu, mute, logo, back), SettingsMenu, Sheet, Toggle
  audio/          AudioManager.ts, sounds.ts
  i18n/           ar.json, fr.json, useT.ts
  styles/         tokens.css, global.css, fonts
data/
  moments.json            9 moments: id, channel, titles, year (null if unverified), scene config, assets
  guide-knowledge.json    curated Q&A per moment + general; each answer has source + year or "TO VERIFY"
tests/e2e/demo-path.spec.ts
```

## 4. Components → Figma

| Code component | Figma / PNG reference | Notes |
|---|---|---|
| `TopBar` | Menu + mute top-start, logo top-end, «رجوع للصالون» pill | Logo always LTR, never mirrored |
| `SettingsMenu` | Lobby frame 3: effects, reduced motion, fullscreen, Enter VR, Français | Toggles are wired to stores |
| `EntryScreen` + `TvWarmup` | 1-entry: TV cut-out, 64 %, gold progress bar, «نحضّرو الصالون…», red «اضغط باش تدخل», «الصوت يتحلّ كي تدخل» | DOM only, no canvas yet (per the spec card) |
| `Hotspot3D` | Gold ring with 2 s pulse, label on hover/focus | Real `<button>` inside `<Html>` |
| `ControlsHint` | Glass card "1 / 3", «شوف حولك», next/skip, dots | First visit only, stored in localStorage (try/catch) |
| `GuideBubble` | «اسأل الدليل» pill with portrait, bottom-start | 64 px avatar |
| `GuidePanel` | Lobby frame 2 card + mobile sheet: AI tag, «أهلا! أنا دليل زوايا بالذكاء الاصطناعي.», chips, input | Side panel on desktop, bottom sheet on mobile |
| `LobbyActions` | Red «ابدا الرحلة» + glass «اختار لحظة» | Bottom centre |
| `TvSet` + `ChannelStatic` | 3-custom: TV on a round table, picture as a texture, static frame | Canvas-noise texture, 0.5 s |
| `Remote` | Glass remote: CH number, ▲▼, 1–9 grid (active key red), «رف الكاسيط» | On mobile it becomes a bottom bar with ▲ CH 02 ▼ + list icon |
| `LowerThird` | «حفلة أم كلثوم · CH 02 · 1968 · كونسار» | Anchored to the screen's bottom corner |
| `TapeDrawer` + `VhsCard` | «رفّ الكاسيط», 9 VHS cards, selected = gold border + «في التلفزة» | Board note: "Dates to verify with the Wataniya archive before the demo" |
| `TitleCard` | 4-moment: CH 01, «شوفلي حل», 2005, source line | Slides in, stays 4 s |
| `CharacterCard` | «السبوعي» card: role, year, fact, «احكيلي على السبوعي» | The guide talks *about* the character |
| `SubtitleBand` | Solid band: «صوت الأرشيف · [موسيقى] تسجيل الحفلة من أرشيف الوطنية.» | Never over scanlines |
| `ArchiveViewer` | «شوف الأرشيف» button → overlay | Built from the research spec (no PNG for it) |

## 5. Scenes → assets

The research gives no verified years. The Figma cards show 2005 for Choufli Hal and 1968 for Om Kalthoum, and the board itself says "Dates to verify". I'll ship those two marked "TO VERIFY" and leave every other year blank.

| # | Moment | Channel | Renders available | Plan |
|---|---|---|---|---|
| 1 | Choufli Hal (شوفلي حل) | 01 | `chofli hal2…9` (8 rooms: corridor, office, kitchen…), `sbou3i` cut-out, `sliman` cut-out | **P0 3D scene.** Rooms linked by door hotspots, two clickable characters |
| 2 | Om Kalthoum concert (حفلة أم كلثوم) | 02 | `stage kalthom`, `om kalthom satge`, `om_kalthoum` cut-out | **P0 3D scene.** Hall backdrop, stage hotspot, archive viewer |
| 3 | News studio (ستوديو الأخبار) | 03 | none | P1 placeholder |
| 4 | El Khottab Al Bab (الخطاب على الباب) | 04 | none | P1 placeholder |
| 5 | Abdelaziz Laroui (حكايات العروي) | 05 | none | P1 placeholder |
| 6 | Mnamet Aroussia (منامة عروسية) | 06 | `mnamit 3rosiya` (patio), `chdli tamar` cut-out | Could be a third scene if time allows, otherwise a placeholder |
| 7 | TV launch (انطلاق البث التلفزي) | 07 | none | P1 placeholder |
| 8 | Bourguiba / independence (إمضاء الاستقلال) | 08 | none | Placeholder. No avatar likeness, archive frame only |
| 9 | Dhi3et Mahrous (ضيعة محروس) | 09 | none | P1 placeholder |
| — | Entry / Custom TV | — | `old tv` cut-out | Entry DOM image plus a textured plane in Custom |
| — | Lobby living room | — | **missing** | See §6 |
| — | Unassigned | — | `fochika` (probably the Choufli Hal silhouette character from the board), `chof li hal 4`, `CHOF LI HAL7`, `CHOFLI HAL9` | I'll sort them by room while building step 4 |

Asset prep (scripted, `scripts/optimize-assets.mjs` using sharp):
- Rename files to kebab-case ASCII.
- Convert to WebP at about 2048 px for backdrops and 1024 px for cut-outs. Today the folder is about 13 MB, which won't meet the < 5 s lobby target. The target is under 3 MB for the lobby.
- **Crop the Blender viewport UI** out of `chofli hal2` (axis gizmo and side toolbar are baked into the image). Others may have the same problem.

## 6. Missing, blocking or needing your call

1. **Lobby render (living room).** It's in the Figma "3D Renders" page but wasn't exported to `public/renders/`. Without it the lobby has no backdrop. *Ask:* export it as PNG at 2× into `public/renders/`. I could pull it with one Figma call, but that spends budget.
2. **Guide portrait.** The bubble uses a small host illustration that isn't in the repo. *Ask:* export it, or I'll draw a neutral SVG host silhouette. Either way it's fictional, not a real person.
3. **Archive media.** There are no B&W clips or frames, and no colorized versions. For the demo I'll generate the "original" by desaturating and adding grain to the render, and label it **"صورة توضيحية · placeholder"**. It won't be passed off as archive. Real clips also depend on the rights question in the research.
4. **Audio.** No sound files. I'll synthesise room tone, TV hum, static crackle and tape click in code with WebAudio, so there are no licensing issues, and wire Howler for real loops when they arrive.
5. **GLB models.** None. Every scene is 2.5D. The loader is ready for `public/models/<moment>.glb` (Draco/Meshopt/KTX2), so dropping a file in upgrades the scene with no code change.
6. **Om Kalthoum 3D cut-out vs. the research ethics.** The research says real people appear only in real archive footage. The Figma marks her figure "3D CHARACTER · PLACEHOLDER". *My proposal:* show the stage without her likeness by default and make the archive viewer the way you "see" her. I need your call on this.
7. **Facts.** The research lists no dates or facts. `guide-knowledge.json` will hold only safe, structural answers ("what is Zawaya", "how to use the TV", booking) plus per-moment entries marked **TO VERIFY**. The guide will answer "ما لقيتش هذا في الأرشيف" until someone verifies them. That's correct for the ethics bar, but the demo answers will be thin unless someone gives me 5–10 verified facts.
8. **PDF filename.** It's `docs/research/VR + Web.pdf`, not `VR-Web.pdf`. I'll leave it as is.

## 7. Key decisions (each traced to the research)

- **Start through Story, but Custom is one click away.** The research says "Two modes, one door". In the lobby, «ابدا الرحلة» is primary and «اختار لحظة» secondary.
- **The guide never interrupts.** Inside a moment it's a silent bubble, and opening it pauses scene audio. Only Story mode narrates between stops (research §AI avatar).
- **Answers ≤ 3 sentences + «زيد».** Every answer carries a source chip. When the guide doesn't know, it says so and offers 2 suggestions.
- **The original always shows first.** The slider handle starts on the original side, with the badge «ملوّن بالذكاء الاصطناعي» and the note «الألوان ممكن موش دقيقة».
- **Effects off** (glow, noise, static) and **reduced motion** are separate toggles. Reduced motion is pre-set from `prefers-reduced-motion`.
- **The guide is text only for the demo.** The mic button is visible but disabled, with the tooltip "قريب".

## 8. Build order and checkpoints

0. Scaffold (Vite, TS strict, ESLint, tokens.css, i18n, fonts, asset optimiser). **First commit on main.** Then branch `feature/web-vr-experience`.
1. Entry. 2. Lobby. 3. Custom. 4. Moments (Choufli Hal, Om Kalthoum). 5. Archive viewer. 6. Guide.
   After each step: `npm run build`, run it, take a Playwright screenshot, fix, commit.
7. Playwright smoke test: entry → lobby → custom → moment → archive → back.
8. Production build + Lighthouse, then fix the top issues.
**Stop for your review after P0.** Then P1: Story, placeholders, booking, 2D fallback, and a deploy script (Vercel: `npx vercel --prod`, or GitHub Pages through Actions).

Nothing gets pushed without asking you.

## 9. Risks

| Risk | Mitigation |
|---|---|
| 13 MB of PNGs → slow lobby | WebP pipeline, preload only the lobby and TV, lazy-load each moment behind 0.5 s of static |
| No lobby render | Ask for the export (§6.1). The fallback is a dim gradient room with the TV, which would hurt the demo |
| Wrong facts on stage | Knowledge file only, TO VERIFY placeholders, "I don't know" path tested |
| Weak jury laptop | dpr capped at 2, demand frameloop, no post-processing beyond a cheap CRT shader, WebGL failure → 2D fallback |
| RTL bugs in mixed AR/FR strings | `dir` on `<html>`, logical CSS properties only (`inset-inline-start`…), `<bdi>` around channel numbers and years |
| Clip rights | Placeholder frames are clearly labelled. Real clips only after the organizer confirms |
