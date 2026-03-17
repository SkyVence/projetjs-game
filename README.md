# Dungeon Crawler

[![TypeScript version](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/) [![CI status](https://img.shields.io/badge/CI-pending-lightgrey)](#ci-status)

A lightweight dungeon crawler project using Vite and TypeScript.

## Stack
- [TypeScript 5.9.x](https://www.typescriptlang.org/)
- [Vite 8](https://vitejs.dev/)
- [Bun](https://bun.sh/) as package manager and runtime

## Getting started
### Prerequisites
- Install Bun from the official site: https://bun.sh

### Install dependencies
Run in the project root:
```
bun install
```

### Development server
Start Vite in watch mode:
```
bun run dev
```
- Open the URL printed in the terminal (typically http://localhost:5173).

### Build
Create a production build in `dist/`:
```
bun run build
```

### Preview (after build)
If you want to preview the build, install `serve` or use any static server to serve `dist/`.

## Development environment tips
- TypeScript config lives in `tsconfig.json`; strict mode is enabled.
- Entry point is `index.html` with scripts under `src/`.
- Linting is not configured yet; add your preferred linter if needed.
- CI is not set up yet; the badge points to the `#ci-status` placeholder—update both link and label once your workflow URL exists.

## Scripts (package.json)
- `bun run dev` — start Vite dev server.
- `bun run build` — generate production build.

## CI status
CI is pending; when you add a workflow (e.g., GitHub Actions), replace the badge link with the workflow’s badge URL and rename the anchor target accordingly.

## Troubleshooting
- If you run into type issues, ensure Bun’s TypeScript version matches `5.9.x`.
- Clear the Bun cache if installs seem stale: `bun pm cache rm`.