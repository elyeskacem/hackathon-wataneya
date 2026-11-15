# 3D handoff: delivering the real scenes

For the 3D team. The site already shows every moment with 2.5D renders. Your scenes replace them
**one moment at a time**: a moment switches to your scene the day its file lands in the repo, and
until then it keeps its render, so nothing breaks while you work.

You can deliver a moment in **one of two forms**. Pick per moment.

| | A. Blender → GLB | B. Unity WebGL build |
|---|---|---|
| Put it here | `assets-src/models/scenes/<moment-id>.glb` | `public/experiences/<moment-id>/` (the whole build) |
| Then run | `npm run assets:scenes` | nothing |
| Drawn by | our own 3D canvas, same camera, hotspots, guide and UI as the lobby | your Unity player, full screen in an iframe, with our buttons on top |
| Pick it when | the scene is a room to look around in | you need Unity features (animation, physics, custom shaders, gameplay) |

If a moment has both, **Unity wins**, then GLB, then the 2.5D render.

## 1. Moment ids

The file or folder name must be exactly one of these six ids (`data/moments.json`):

| Channel | `<moment-id>` | Title |
|---|---|---|
| 01 | `choufli-hal` | Choufli Hal |
| 02 | `om-kalthoum` | Concert of Oum Kalthoum |
| 03 | `news-studio` | The news studio |
| 04 | `el-khottab` | El Khottab Al Bab |
| 05 | `al-ahad-riyadhi` | Al Ahad Al Riyadhi (the Sunday sports show) |
| 06 | `tunisia-mexico-1978` | Tunisia 3–1 Mexico, 1978 World Cup |

A wrong name loads nothing (the build prints a warning for GLBs).

## 2. Form A: Blender → GLB

### Units and axes

- **1 unit = 1 metre.** Unit scale 1.0 in Blender; apply scale (Ctrl+A) on every object.
- Blender is Z-up, glTF is Y-up. The exporter converts, so keep **+Y Up** ticked in the export dialog.
- The camera looks along its own **−Z** (Blender's default for camera objects, same in glTF).
- The scene may sit anywhere; the origin does not matter. Floor at y = 0 is a good habit.
- Character height, door height, the size of a TV: model them real-size. The camera field of view
  and the hotspot placement assume it.

### Export settings (File → Export → glTF 2.0)

- Format **glTF Binary (.glb)**, one file per moment.
- Include: **Cameras on, Custom Properties on**, Punctual Lights only if you use lights (see below).
- Transform: **+Y Up**. Mesh: Apply Modifiers on. Do **not** use Draco or any compression: our
  pipeline compresses the file (Meshopt for geometry, KTX2 for textures) and Draco would clash.
- Images: **PNG or JPEG**, embedded in the GLB (not external files, not WebP).
- Animation: leave off. **Animations are not played yet**; characters stand in the pose you export.
- Keep the empties (markers) in the scene: they are the contract, see below.

### Markers: named empties

The site reads positions from **empties** (Add → Empty → Plain Axes) with these exact names. No
spaces, **lowercase letters, digits and `-`** only. Blender's `.001` duplicate suffix is ignored.

```
<kind>_<name>            in the default room
<kind>_<name>@<room>     in another room of the same GLB
```

| Name | What it is | Properties (Object → Custom Properties) |
|---|---|---|
| `cam_start` | Where the visitor arrives. **Required** in the default room. | – |
| `cam_closeup` | Optional second camera, e.g. the front row of the hall. | – |
| `hotspot_closeup` | The gold ring that switches to `cam_closeup` (needs `cam_closeup`). | `label_ar`, `label_fr` (optional) |
| `char_<id>` | A character. The empty stands **on the floor where the feet are**. | `height` (metres, default 1.7): the talk ring floats this high |
| `door_<room>` | A door that leads to `<room>`. Place it where the door is. | `label_ar`, `label_fr` (optional) |
| `hotspot_<id>` | A point of interest (the TV, a poster). | `entry` (guide knowledge id), `label_ar`, `label_fr` |

Examples: `cam_start`, `cam_closeup`, `char_sliman`, `char_sbou3i@kitchen`, `door_corridor`,
`door_office@corridor`, `hotspot_tv`.

Details that matter:

- **Cameras.** Best: a real **Camera object** named `cam_start`. Its position, direction and
  **field of view** (use 35–60°) are all used. If you use an empty instead, its **local +Y axis
  (the green arrow in Blender) is the look direction** and the field of view is 50°. Eye height is
  about 1.6 m. A visitor can look around a little (drag) but not walk, so frame the scene from this
  point.
- **Characters.** Parent the figure's mesh **under** its `char_<id>` empty. Known ids with a card
  and guide answers today: `sliman`, `sbou3i`, `fochika`, `om-kalthoum`. Any other id gets a
  basic card; tell us the name and we add the text.
- **Oum Kalthoum is a real person.** The figure is hidden unless the team switches on
  `VITE_SHOW_OM_KALTHOUM_FIGURE` (docs/PLAN.md §6.6). Parent her mesh under `char_om-kalthoum` so it
  disappears with it. Never name her figure anything else.
- **`entry`** is an id from `data/guide-knowledge.json` (`how-tv-works`, `choufli-characters`, …).
  Tapping the hotspot opens the guide and asks that question. Without `entry` it only opens the guide.
- **Several rooms in one GLB.** The room without `@` is the default (`main`); the visitor arrives
  there. Every other room needs its own `cam_start@<room>`, and a `door_<room>` in a room takes the
  visitor to it. Room ids use letters and digits only (`corridor`, `kitchen`, not `big-kitchen`).
  For **Choufli Hal** use: office = default room, then `@corridor` and `@kitchen`, so the story
  mode and the door labels (الكولوار, الكوجينة) match the existing renders.
- The build prints every room it found with its cameras, characters, doors and hotspots, and warns
  about names that look like a marker but do not match. **Read that list**: a typo means a missing
  hotspot, not an error in the page.

### Materials, textures and light

- Plain **Principled BSDF** with base colour, metallic/roughness, normal, emissive and ambient
  occlusion maps. No procedural nodes: if the exporter cannot write it, the site cannot show it.
- **Bake your lighting into the base colour** (or emissive). If the file has no lights, the site adds
  one soft hemisphere light. If you do export lights, keep them to **3 or fewer** (Sun, Point, Spot).
  Tell us if the first import looks washed out or too dark; we tune the exposure together.
- Do **not** bake the era look (the black-and-white of 1968, the VHS tint of the 90s). The site
  applies a colour grade over every moment.
- **Textures:** PNG or JPEG, sides a **multiple of 4**, ideally powers of two. **Max 2048 px per
  side**; the build fails above 4096. Use 1024 px for props and characters.

## 3. Budgets per scene (form A)

The build checks these on every run. "Target" is a warning, "limit" fails the build.

| | Target | Hard limit |
|---|---|---|
| Triangles (whole scene) | 120 000 | 250 000 |
| Draw calls (one per mesh and material) | 120 | 250 |
| Materials | 30 | 60 |
| Textures | 20 | 40 |
| Largest texture | 2048 px | 4096 px |
| File after the build | 15 MB | 30 MB |

Phones run the demo too, so the target is what we judge by, not the limit. To stay under the draw
call target: join meshes that share a material, and share materials across objects (atlas small props).

## 4. Form B: Unity WebGL build

1. Build for **WebGL** and copy the **whole output folder** to `public/experiences/<moment-id>/`.
   `index.html` must be directly inside it, next to `Build/`, `TemplateData/` and `StreamingAssets/`.
2. **Player Settings → Publishing → Compression Format: Disabled** (or enable *Decompression
   Fallback*). The static hosts we use cannot send the `Content-Encoding` header that gzip/Brotli
   builds need, and the build would fail to start.
3. In `index.html`, make the canvas fill the page: `body { margin: 0; overflow: hidden }` and
   `#unity-canvas { width: 100%; height: 100% }`. Remove the footer and the fullscreen button; our
   toolbar has its own. Use **relative paths only** (the site may live under a sub-path).
4. Keep the build **under 60 MB** if you can. GitHub refuses single files over 100 MB, so a bigger
   `.wasm` or `.data` file needs Git LFS: tell us before you push.

When the moment opens, the site shows TV static ("on prépare la scène") until your page says it is
ready, then your build fills the screen. On top of it stay **the way back to the living room**, the
**sound** button and the **AI guide**. Your build gets no sound from us: its audio is its own, and the
site's synthetic room tone is switched off for that moment.

### Talking to the site (optional)

Everything below is optional: a plain Unity template works without a line of it. The site only
accepts messages from its own origin and only from this iframe.

**From your page to the site** (`parent.postMessage(message, location.origin)`):

```js
// Tell the site the scene is on screen. Without this the static leaves 3 s after the page loads.
parent.postMessage({ source: 'wataniya', type: 'ready' }, location.origin);
// Send the visitor back to the living room (the Esc key never reaches the site while Unity has focus).
parent.postMessage({ source: 'wataniya', type: 'exit' }, location.origin);
// Open the character card, e.g. when a character is clicked ("sliman", "sbou3i", …).
parent.postMessage({ source: 'wataniya', type: 'character', id: 'sliman' }, location.origin);
// Open the guide on a knowledge entry (ids in data/guide-knowledge.json).
parent.postMessage({ source: 'wataniya', type: 'ask', entry: 'how-tv-works' }, location.origin);
```

In the Unity template, send `ready` right after `createUnityInstance(...)` resolves. To call these
from C#, wrap them in a `.jslib` plugin.

**From the site to your page** (`window.addEventListener('message', …)`, check `e.data.source === 'wataniya'`):

| `type` | Fields | When | What you should do |
|---|---|---|---|
| `mute` | `muted: boolean` | The visitor taps the sound button (also sent on load) | Silence or restore your audio (`AudioListener.pause`) |
| `duck` | `on: boolean` | The guide panel opens or closes | Lower your audio while `on` is true (the site uses 20%) |

## 5. Testing locally

You need Node 20+. Once: `npm install`.

**Form A (GLB)**

1. Copy your file to `assets-src/models/scenes/<moment-id>.glb`.
2. `npm run assets:scenes` compresses it into `public/models/scenes/` and prints the report: size,
   triangles, rooms, markers, warnings and errors.
3. `npm run dev`, open http://localhost:5173, tap enter, then the TV → pick the moment's channel →
   «ادخل للحظة». Or, in the browser console, jump straight in:
   `__app.getState().go({ name: 'moment', momentId: 'choufli-hal' })` (dev server only).
4. Open the browser console: `[<moment-id>.glb]` warnings list markers the page could not use.
5. Check: arrival lands on `cam_start`; every character has its ring at head height; every door
   leads where its label says; the close-up goes in and back; nothing floats or clips.

To see the naming in Blender before you start, run `npm run assets:sample-scene -- choufli-hal`: it
writes `assets-src/models/scenes/_sample-choufli-hal.glb`, a placeholder room with one of every
marker. Files starting with `_` are ignored by the build.

**Form B (Unity)**

1. Copy the build to `public/experiences/<moment-id>/` (restart `npm run dev` if it was running).
2. Open the page as above: the static, then your build with our buttons on top. To check your build
   alone, open http://localhost:5173/experiences/`<moment-id>`/index.html.
3. Check: the sound button mutes it, opening the guide lowers it, the back button returns to the
   living room, and nothing is hidden behind the top bar (keep key UI inside the middle 90%).

**Before you push**: `npm run build` and `npm run lint` pass, and the moment still works at phone
width (browser device mode). Commit the scene source in `assets-src/` **and** the generated file in
`public/models/scenes/`.

## 6. Checklist

- [ ] File or folder named exactly `<moment-id>`
- [ ] 1 unit = 1 m, scale applied, +Y Up on export
- [ ] `cam_start` present (a Camera object, field of view 35–60°)
- [ ] Characters: `char_<id>` at the feet, mesh parented under it, `height` set
- [ ] Doors and hotspots named, rooms use `@room`, every door has a `cam_start@room` to go to
- [ ] Textures: PNG or JPEG, ≤ 2048 px, multiples of 4, embedded
- [ ] Lighting baked, era look not baked, no animation expected
- [ ] `npm run assets:scenes` prints no ERROR and, ideally, no WARN
- [ ] Unity: compression disabled, canvas 100%, relative paths, `ready` message sent
