# Wataniya Zawaya — web VR

A "time machine" through 60 years of Tunisian TV (Al Wataniya), guided by a fictional AI host.
Built with Vite, React, TypeScript, three.js (@react-three/fiber, drei, xr), GSAP and Howler.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Assets

Raw renders live in `assets/renders/`. `npm run assets` crops, cuts out and converts them to WebP in
`public/renders/` (the app only loads those). Drop GLB models in `public/models/` later.

## Docs

- `docs/PLAN.md` — architecture, component and scene mapping, risks.
- `docs/research/VR + Web.pdf` — UX research (source of truth for decisions).
- `docs/figma/` — exported screens.
