# Ritika Kalia — Portfolio

An interactive 3D portfolio: six worlds (About, Stack, Research, Work, Journey, Contact) orbit a black hole.
Click a world to open its cards in a tornado; Work and Research are split into categories.

- `index.html` / `classic.html` — the classic scrolling portfolio (also the automatic fallback when WebGL is unavailable)
- `space.html` — the 3D universe (Three.js r128 from unpkg, no build step)
- `js/cards-data.js` — all card content and category lists; edit this to change what the worlds show
- `js/tornado.js`, `css/tornado.css` — the card tornado

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000/space.html
```

## Pip (the guide)
- `js/guide.js` (space) and `js/pip-home.js` (portfolio): the guide fairy and her tips
- `js/pip-warp.js`: the nebula/hyperspace transition when a nav link is clicked
- `js/pip-extras.js`: cursor follow, star trail, quick-reply chips, "best 3 projects" tour, recruiter quick view (`index.html#quick`), black-hole reaction, phone menu
- `js/pip-sound.js`: optional synthesised sound (off by default)
- `js/space-fallback.js`: 2D night-sky background shown when WebGL / three.js is unavailable (replaces the old redirect on `space.html`)
- `css/guide.css`, `css/extras.css`: styles
