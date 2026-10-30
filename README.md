# CatMastering

Web estàtic trilingüe reconstruït amb Astro. El lloc es genera a HTML/CSS/JavaScript estàtic i es desplega amb GitHub Pages. L'instantani importat del lloc antic es conserva, sense publicar-lo, a `legacy/`.

## Desenvolupament

- Requisits: Node.js 22 LTS i npm.
- `npm ci` instal·la dependències.
- `npm run dev` obre el servidor local.
- `npm run check` comprova Astro i audita dades/assets.
- `npm test` executa els tests del processador d'issues.
- `npm run build` genera el web a `dist/`.

El catàleg és a `src/data/credits.json`; les imatges visibles són a `public/images/`. `legacy/` és només de referència. Per reconstruir les dades inicials consulta `docs/migration-report.md` i `scripts/migrate-legacy.mjs`.

## Idiomes i URLs

Hi ha pàgines estàtiques `/ca/`, `/es/` i `/en/`. L'arrel `/` selecciona el català amb una redirecció HTML i deixa enllaços visibles. Les pàgines `.html` antigues mostren enllaços de continuació i deriven a les rutes noves. Vegeu `docs/migration-report.md` per la decisió SEO i els seus límits.

## Afegir treballs

Juanjo pot enviar propostes a través de [Afegir un treball](https://github.com/jordinebot/catmastering/issues/new?template=add-credit.yml). El workflow valida i prepara una PR; el mantenidor la revisa i fusiona. Guia: [docs/JUANJO.md](docs/JUANJO.md). Configuració i incidències: [docs/MAINTENANCE.md](docs/MAINTENANCE.md).

## Desplegament

La workflow `Deploy CatMastering` construeix i publica el lloc de previsualització a `https://jordinebot.github.io/catmastering/` en cada canvi de `main`. A **Settings → Pages**, selecciona GitHub Actions. Quan es configuri `catmastering.cat`, activa `SITE_DOMAIN=true` al workflow i afegeix `public/CNAME` amb el domini; consulta els passos de DNS a la guia de manteniment.
