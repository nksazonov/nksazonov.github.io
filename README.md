# nksazonov.github.io

Source of [nksazonov.github.io](https://nksazonov.github.io), the technical blog of Nikita Sazonov: how to design and secure smart contracts that hold user funds.

Built with [Astro](https://astro.build/) and the [AstroPaper](https://github.com/satnaing/astro-paper) theme by Sat Naing (MIT license, see [LICENSE](LICENSE)).

## Add a post

1. Create a Markdown file in `src/content/posts/`, e.g. `src/content/posts/my-post.md`. The file name becomes the URL: `/posts/my-post`.
2. Start it with front matter:

   ```yaml
   ---
   title: My post title
   description: One or two sentences shown in lists, search results and link previews.
   pubDatetime: 2026-12-01T09:00:00Z
   tags:
     - smart-contracts
   draft: true
   ---
   ```

3. Remove `draft: true` (or set it to `false`) when the post is ready. A post with a future `pubDatetime` is published by the first build on or after that day.
4. Optional fields: `modDatetime` (last update), `featured: true` (shown on the home page), `ogImage` (otherwise a preview image is generated), `canonicalURL`.

Site settings (title, description, social links) live in `astro-paper.config.ts`. The About page is `src/content/pages/about.md`.

## Build and deploy

Builds run only in GitHub Actions. Every push to `main` runs `.github/workflows/deploy.yml`, which installs dependencies, builds the site and publishes it to GitHub Pages. In the repository settings, Pages → Source must be "GitHub Actions".

## Local preview

Never run `pnpm install` (or `npm`, `npx`, `astro`) directly on the host machine: dependency install scripts run with full access to it. Preview only inside an isolated environment, such as a GitHub Codespace or a container.

Use the hardened preview setup:

```sh
docker compose -f compose.preview.yaml up --build
```

Then open http://localhost:4321 in a browser window without wallet extensions (for example, a Chrome Guest window). Stop with Ctrl+C, then `docker compose -f compose.preview.yaml down`.

What it does (`Dockerfile.preview`, `compose.preview.yaml`, `Dockerfile.preview.dockerignore`):

1. Dependencies are installed inside the image, as an unprivileged user. `.git`, `node_modules` and secret-looking files are never copied in.
2. Only `src/content/` and `public/` are shared from the host, read-only. Edits to posts reload live; changes to theme code need `--build` again.
3. The port is published on `127.0.0.1` only, so other devices on the same network cannot connect.
4. No secrets, SSH agent, Docker socket or home folder are passed in.

Search does not work in the dev preview: its index is created only by the production build.
