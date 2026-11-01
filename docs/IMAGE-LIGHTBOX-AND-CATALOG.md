# Image preview zoom and portal catalogue separation

Date: 2026-10-31

## Image preview lightbox

The shared client component, `src/components/ui/image-lightbox.jsx`, provides a viewport-filling image viewer rendered through a body-level portal. The overlay avoids clipping and stacking-context issues from cards, figures, and overflow containers.

Controls and behavior:

- Click an image preview to open the viewer; click the dark backdrop to close.
- Zoom from 100% to 500% with 50% button/keyboard steps. Mouse-wheel zoom is also supported.
- Double-click toggles between fit-to-screen and 200% zoom.
- Drag to pan while zoomed; touch pinch zoom and touch swipe navigation are supported.
- Dataset previews, infographic detail images, CMS galleries, and Markdown image sets can be grouped. Group navigation wraps at either end, shows a selectable thumbnail filmstrip, and preloads adjacent images.
- `+` / `=` and `-` zoom; `0` resets the view; `Escape` closes; left/right arrows navigate a grouped gallery while the image is at fit zoom.
- The toolbar provides reset, open-original, previous/next, and close actions as applicable.
- Loading and broken-image states are explicit; a failed source offers a link to open the original.
- The dialog traps keyboard focus, makes background siblings inert/hidden from assistive technology, locks document/body scrolling, compensates for the scrollbar, and restores prior state and focus on close.
- Controls use accessible names and visible focus states; the image title and gallery position are announced to assistive technology.

Integrated on:

- Image resources in dataset detail previews, grouped by dataset.
- Infographic thumbnails in the infographic catalogue and grouped image resources in infographic detail pages.
- CMS image blocks and per-block galleries.
- Markdown image tokens within a CMS Markdown body.
- Cover images on information and news detail pages.

The full-size preview uses the same already-sanitized public resource/media URL as the thumbnail. It does not bypass CKAN access checks or invent a direct storage URL.

## Separating public catalogues without duplicating CKAN records

CKAN's native package type remains `dataset`. The portal's `portal_type` field is a classification for public presentation, not a new CKAN package type or a separate storage system.

The ordinary `/dataset` catalogue, its facets, and the public dashboard's general dataset count now exclude the following types:

- `indikator` / `portal-indikator`
- `infografik` / `portal-infografik`
- `publikasi` / `portal-publikasi`

Both the discovery tags and `extras_portal_type` are excluded. The tags retain compatibility with legacy records whose `portal_type` extra was not populated. The dedicated pages continue to use their existing tag-based CKAN adapters:

- `/statistik` reads indicator records and their tabular DataStore resources.
- `/infografik` reads infographic records and their image/PDF resources.
- `/publikasi` reads publication/report records and their document resources.

This is catalogue separation only. It does not delete records, move files, create duplicate records, or change CKAN permissions. Native CKAN package search remains available to API clients and exposes the original CKAN objects and tags for harvesting/integration.

## Content modeling recommendation

1. **Indicator/statistical series:** keep it as a CKAN Package with `portal_type=indikator`, a stable tag, metadata for definition/unit/formula/geography/periodicity, and a canonical tabular DataStore resource. The statistics page is a derived presentation of the same source rows. Do not duplicate the observations into an unrelated CMS database.
2. **Infographic as a standalone published product:** use a CKAN Package with `portal_type=infografik` only when the visual has its own title, period, publisher/attribution, and lifecycle. Attach the image/PDF resource and identify its source dataset(s) in metadata or explanatory links. If the image is merely a visual attachment to one dataset and has no independent publication identity, attach it as a resource to that dataset instead of making a second package.
3. **Publication/report:** use a CKAN Package with `portal_type=publikasi` for a formal report or statistical publication that needs a publisher, release date, period, license, version, methodology, and downloadable files. Use CKAN Pages/Blog for narrative website content such as news, announcements, articles, and evergreen information; do not force those into dataset records.
4. **Geospatial data:** keep as dataset content (`portal_type=geospasial`) because the source resource and its schema are the data product; present spatial preview in the dataset detail or GeoPortal view.

This keeps one authoritative CKAN source for ownership, organization, licenses, resource files, permissions, versions, and revisions while keeping the public UX clear and avoiding duplicate catalogue entries.

## Validation update — 2026-11-01

- `bash scripts/check-static.sh` passed after the lightbox enhancement.
- TypeScript's JSX parser successfully parsed all six changed JSX files: the shared viewer, CMS Markdown and content blocks, dataset detail, infographic detail, and infographic listing.
- `node --check` passed for the changed JavaScript contract checks and Playwright specification.
- Playwright coverage was added for grouped previous/next navigation, thumbnail selection, focus containment and restoration, zoom reset, Escape close, and source-load failure recovery. The E2E suite itself was not executable in this workspace.
- Full ESLint, Vitest, Next.js production build, and execution of Playwright E2E have not been run because project `node_modules` is not installed and npm registry access is unavailable. Run these in the normal npm environment before production deployment.
