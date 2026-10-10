# Colab Edition

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/MasakiNiwa/Composition-Explorer/blob/main/colab/Composition_Explorer_Colab.ipynb)

Runs the **same UI** as the GitHub Pages version on a Google Colab kernel and
prints a link to open it. The UI detects the Colab backend automatically
(see Settings → Compute backend).

| File | Purpose |
| --- | --- |
| `Composition_Explorer_Colab.ipynb` | Notebook: fetch the UI (prebuilt `site.zip` from GitHub Pages, or build from a branch), start the server, show the link |
| `server.py` | Standard-library HTTP server: serves the UI and `api/*` endpoints (`api/health`, `api/info`) |

## How it fits together

- The web build uses relative paths (`base: './'`) and hash routing, so it works under Colab's
  kernel proxy URL without changes.
- On start-up the UI requests `./api/health`. On GitHub Pages this 404s → local Web Workers only.
  On Colab it answers → the UI shows the Colab backend and GPU.
- Future GPU features are added as `api/*` endpoints plus a `ComputeBackend` implementation in
  `src/compute/` (see `docs/SPEC.md`).

Local test without Colab:

```bash
npm run build
python3 colab/server.py --root dist --port 8000
```
