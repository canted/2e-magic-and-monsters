# AD&D 2e Compendium

Static React/Vite compendium for AD&D 2e spells, monsters, and magic items.

## Development

```sh
npm ci
npm run dev
```

## Build

```sh
npm run build
```

The app loads static JSON from `public/data/` and deploys as a fully client-side site.

## GitHub Pages

This directory is intended to be its own Git repository. The included workflow builds this app and deploys only `dist/` to GitHub Pages.

After creating the separate GitHub repository:

```sh
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git push -u origin main
```

In the GitHub repo settings, set Pages source to GitHub Actions. For project Pages, the workflow sets Vite's base path to `/<repo-name>/`. For a user/organization Pages repo or a custom domain, change `VITE_BASE_PATH` in `.github/workflows/pages.yml` to `/`.
