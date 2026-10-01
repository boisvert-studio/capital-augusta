# capital-augusta

Custom code for the Capital Augusta Webflow site. Built on Finsweet's [developer-starter](https://github.com/finsweet/developer-starter): TypeScript, bundled and minified by esbuild.

## Develop

```bash
pnpm install
pnpm dev
```

Serves `dist/` at `http://localhost:3000` with live reload. Point a Webflow staging embed at `http://localhost:3000/index.js`.

## Ship

```bash
pnpm build
git tag vX.Y.Z && git push --tags
```

Webflow loads the tagged bundle from jsDelivr, pinned with an integrity hash:

```
https://cdn.jsdelivr.net/gh/boisvert-studio/capital-augusta@vX.Y.Z/dist/index.js
```
