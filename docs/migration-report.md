# Informe de migració

## Inventari

- Instantani original: `legacy/`, conservat amb l'estructura i els fitxers d'origen. Data deduïda del commit inicial: 29-10-2026 (`057eb60`).
- Catàleg extret de la versió catalana: **420 treballs**. Les versions castellana i anglesa també contenen 420 entrades i coincideixen amb la catalana en artista, títol i data per posició.
- 420 miniatures i 420 portades grans localitzades; totes les imatges referenciades existeixen. No hi ha duplicats d'artista, títol i data a la font catalana.
- Les imatges del catàleg s'han copiat a `public/images/covers/` i `public/images/thumbs/`; les fotografies de l'estudi, el logotip i els recursos de marca necessaris també s'han copiat fora de `legacy/`.

## Incidències i decisions

- Hi ha **13 títols buits** al contingut original. S'han preservat com a buits, sense inventar-ne cap.
- 172 entrades tenen data completa `YYYY-MM-DD`, 6 indiquen any i mes (`YYYY-MM`) i 242 només indiquen l'any. La precisió original de les dates es conserva.
- Sis referències d'imatge contenien caràcters URL codificats (`%26`, `%2B`, etc.). Descodificar el nom resol la correspondència amb els fitxers reals.
- Les miniatures del llegat es fan servir a la graella i les portades grans s'obren sota demanda. No s'ha modificat l'original.
- El fitxer `.DS_Store` de l'arrel no forma part de `legacy/`; s'ha eliminat com a fitxer paràsit de macOS.
- La pàgina `/` porta a la versió catalana amb una redirecció HTML immediata i ofereix enllaços de reserva. Les pàgines antigues `catmastering_*.html` també són pàgines HTML de compatibilitat, no redireccions HTTP 301.

## Reproducció

`node scripts/migrate-legacy.mjs --dry-run` mostra el recompte i les referències sense tocar dades. La migració inicial es pot reproduir amb `node scripts/migrate-legacy.mjs`; si el catàleg ja existeix, cal indicar explícitament `--overwrite`. `npm run check` audita el nombre, els IDs i l'existència de fitxers.
