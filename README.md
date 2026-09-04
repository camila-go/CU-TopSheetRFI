# CU Homepage — Bottom Sheet App

Vanilla HTML / CSS / JS replica of the [capella.edu](https://www.capella.edu/)
homepage, built as the surface for bottom-sheet UI work.
Repo: <https://github.com/camila-go/CU-Homepage-BottomSheetApp>

**Design north star: the live site.** [DESIGN.md](DESIGN.md) is the measured spec —
palette, type, header metrics, band-by-band structure — all read off the rendered
page rather than guessed. Match it when adding anything new.

## Layout

```
index.html          head (fonts) + header + six homepage bands + footer + mobile action bar
DESIGN.md           measured spec for capella.edu — read this first
css/tokens.css      design tokens
css/base.css        reset, .page-container, shared .btn variants
css/nav.css         header structure + the v2 prototype's dark skin
css/nav-live.css    re-paints the header to the LIVE skin  ← remove to get the prototype look
css/main.css        the six homepage bands + mobile action bar
css/footer.css      footer columns, legal block, partner carousel
js/nav.js           nav scroll state, megamenus, mobile view stack
js/footer.js        partner carousel
public/assets/      imagery (1.1 MB total)
```

⚠️ **Stylesheet order is `base → nav → nav-live → main → footer`.** `base` defines
what the others build on, and `nav-live` must follow `nav` to override its skin.

### Why nav-live.css is a separate layer

`nav.css` is the header lifted from the
[CU-Homepage-Test-v2](https://github.com/camila-go/CU-Homepage-Test-v2) prototype
(commit `0e61516`) — a **dark, pill-shaped redesign** that does not match the live
site. Every behaviour in `js/nav.js` was verified against that markup, so rather
than surgically rewriting 1000 lines and risking the megamenu positioning,
`nav-live.css` only re-paints it. The structure and behaviour stay untouched.

## Provenance

| Here | Source |
| --- | --- |
| Header + footer structure, nav JS, tokens | CU-Homepage-Test-v2 `0e61516` |
| Header skin, all six bands, copy, imagery | measured/downloaded from live capella.edu |

Copy is Capella's own published wording. Links are `#` — only the layout and nav
behaviour are real.

## Fonts

Three things must all be right or the headings silently degrade:

1. **Typekit** (`use.typekit.net/rrn6owv.css`) — provides `acumin-variable`.
2. **Google Fonts** — Inter. Keep `1,700` in the `ital,wght` list or bold italic
   falls back to regular weight.
3. **`font-variation-settings: 'slnt' 0, 'wdth' 50, 'wght' 800`** on every display
   heading — this is what makes them condensed.

⚠️ The width axis is not optional. `acumin-variable` defaults to `wdth 100`, which
renders the hero headline **420px instead of 232px** at 40px — about 80% too wide.
Use the `.display` class in `main.css`, which applies family + variation together.
Verified: our headline measures 232px, byte-identical to the live site's.

## Nav behaviour

- **Desktop megamenus** open on **click**, one at a time. `Degrees & Programs` is
  a three-level cascade (level → area → programs); the third level is generated
  from the `MEGA_PROGRAMS` map in `js/nav.js`, not authored in markup.
  The live ramp is dark panel → `#f5f5f5` areas column → white programs column,
  and a row highlights in the colour of the column it opens.
- **Mobile** is a stack of full-screen views sliding in from the right, each with
  a `« Back`. The tree is **derived from the desktop megamenu DOM** at load, so
  the two navs cannot drift — edit the markup and mobile follows.
- **Scrolled state** changes colour only, never geometry: megamenus are positioned
  from the bar's bottom edge when they open, so any height change here reopens a
  gap under an open dropdown.
- The mobile panel is reparented to `<body>` on init because it is
  `position: fixed` and the scrolled header's `backdrop-filter` would otherwise
  become its containing block and collapse it to a sliver.

## Gotchas worth knowing

- **Two hero images.** Desktop is a full-bleed `background-image` (1440×640
  master) so the tan backdrop spans the whole width with the copy on top. Mobile
  is a separate 640×432 `<img>` stacked above the copy. Treating the desktop hero
  as "white panel + photo on the right" is the single thing that makes it read as
  not-quite-right.
- **Accreditor logos.** Use `accred-*.png` (full colour). The prototype's
  `accr-*.svg` were white knockout artwork for a dark band — on this white band
  they load fine, occupy layout, and are invisible.
- **Don't lift the mobile nav panel above the action bar.** The panel has its own
  red Apply/Request footer; ending it at `bottom: 56px` renders two identical red
  bars. Its `z-index: 130` covers the bar's `120` instead.
- **Sampling the live site:** capella.edu ships duplicate desktop/mobile copies of
  several controls. The hidden one reports `border-radius: 0` and a different font
  size. Sample the element with a non-zero bounding box, or use `elementFromPoint`.
- **Browser-pane quirk:** while the preview pane is hidden,
  `document.visibilityState === 'hidden'` and CSS transitions freeze at their
  start value, so `transitionend` never fires. This looks exactly like an
  animation bug and isn't one. Force a frame with a screenshot first.

## Running it

There is no Node on this machine, so `npm run dev` will not work as-is. Serve a
copy with `public/assets` flattened to `/assets` (what Vite does at runtime):

```bash
D=/tmp/cu-bottomsheet-preview && rm -rf $D && mkdir -p $D && cp -R index.html css js $D/ && cp -R public/assets $D/assets && python3 -m http.server 4180 -d $D
```

⚠️ Editing source does **not** update that copy — re-run the command after edits
or you will verify against a stale build.

With Node installed:

```bash
npm install && npm run dev
```

## Next: the bottom sheet

`<main>` ends with the accreditation band; the mobile-only fixed red action bar
(`.action-bar`, "Apply now | Request info") is the surface the sheet is expected
to open from. It's `position: fixed`, `z-index: 120`, 50px tall, and `<body>`
carries a matching `padding-bottom` so the footer clears it.
