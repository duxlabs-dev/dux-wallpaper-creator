# Wallpaper Generator

Material 3 wallpaper generator compatible with [DMS](https://duxlabs.dev). Compose shapes, patterns and palettes, then export a PNG or a JSON layout that DMS renders as a live wallpaper.

Live at [wallpaper.duxlabs.dev](https://wallpaper.duxlabs.dev).

## Stack

- Vite+ + React 19 + TypeScript
- Tailwind CSS v4 (Material 3 tokens mapped in `src/globals.css`)
- TanStack Store and Hotkeys
- `material-shapes-ts` for the shape library
- Static build served by nginx in a container

## Develop

```sh
npm install
npm run dev
```

| Script           | What it does                |
| ---------------- | --------------------------- |
| `npm run dev`    | dev server with HMR         |
| `npm run build`  | production build to `dist/` |
| `npm run lint`   | oxlint (vite+)              |
| `npm run format` | oxfmt (vite+)               |

Install [prek](https://prek.j178.dev/) and activate the hooks:

```sh
prek install
```

The hooks runs vite+'s lint and format with typecheck and typeaware linting enabled, plus generic whitespace and YAML checks. `prek run --all-files` runs them on demand.

## Layout

```
src/
  lib/         pure logic: shapes, color math, formats, layout file, png render, storage
  store/       TanStack stores: wallpaper (layers, prefs, undo/redo) and ui (panel state)
  hooks/       theme colors, pattern tiles, export, import, keyboard shortcuts
  components/
    ui/        reusable primitives: button, icon button, slider, radio group, segmented, tabs, swatch, toast
    canvas/    preview and svg stage with drag, wheel resize and rotate
    panel/     settings panel: toolbar, canvas tab, shape tab, shape picker
```

## JSON layout

The export matches the DMS wallpaper format. Positions are centre fractions of the canvas, size is a fraction of the shorter side, rotation is in degrees. `overlap` and `opacity` (0.05 to 1) are optional. An optional top-level `name` becomes the profile name in DMS.

Blobs carry `path` (the rendered outline, M/L/C/Z in a unit square) plus `points` and `smoothness`, which the generator uses to re-edit the blob. DMS renders `path` and rebuilds it from `points` when it is missing.

`dms://wallpaper/install/<base64url of the JSON>` installs a layout into a running DMS; "Install in DMS" in the export menu opens that link.

```json
{
  "layers": [
    {
      "shape": "flower",
      "x": 0.1,
      "y": 0.1,
      "size": 0.52,
      "rotation": 0,
      "fill": "tertiaryContainer",
      "overlap": "primaryContainer"
    },
    {
      "shape": "blob",
      "x": 0.7,
      "y": 0.6,
      "size": 0.4,
      "rotation": 0,
      "fill": "secondary",
      "opacity": 0.8,
      "path": "M0.9 0.5C0.9 0.75 0.75 0.95 0.5 0.95C0.25 0.95 0.08 0.75 0.08 0.5C0.08 0.25 0.25 0.1 0.5 0.1C0.75 0.1 0.9 0.25 0.9 0.5Z",
      "points": [
        { "x": 0.9, "y": 0.5 },
        { "x": 0.5, "y": 0.95 },
        { "x": 0.08, "y": 0.5 },
        { "x": 0.5, "y": 0.1 }
      ],
      "smoothness": 2
    }
  ],
  "pattern": "topography",
  "strength": 0.1
}
```

## Deploy

`Dockerfile` builds the static bundle into an unprivileged nginx image. On every push to `master`, `.github/workflows/ci.yml` runs format, lint and typecheck, builds a multi-arch image to ghcr.io, then applies `k8s/` with kustomize into the `wallpaper` namespace.

The deploy job runs under the `production` GitHub environment, which holds the `KUBE_CONFIG_DATA` secret and is restricted to the `master` branch. That kubeconfig is a service account token scoped to the `wallpaper` namespace only, so the workflow cannot touch anything else in the cluster. To create it:

```sh
./k8s/generate-kubeconfig.sh
base64 -w0 k8s/wallpaper-kubeconfig.yaml
```

## Credits

Ported from the original [wall](https://github.com/hthienloc/wall) generator by **Zurvan** ([@georgestafilidis](https://github.com/georgestafilidis)) and **Stumbling** ([@apollo79](https://github.com/apollo79)). MIT licensed.
