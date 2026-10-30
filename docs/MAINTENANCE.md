# Manteniment

## Afegir treballs i revisar propostes

El formulari d'issue posa l'etiqueta `new-credit`. El workflow només accepta autors enumerats a la variable de repositori `CREDIT_AUTHORIZED_USERS` (llista separada per comes; configura-la a **Settings → Secrets and variables → Actions → Variables**). No s'ha de posar aquesta llista al codi públic. Verifica l'artista, el títol, la data i la portada a cada PR. La PR tanca l'issue en fusionar-se a `main`.

El cos de l'issue és entrada no fiable. El workflow no l'executa: només analitza camps coneguts, permet adjunts de rutes HTTPS específiques de GitHub, no segueix redireccions fora d'aquesta llista, valida bytes/tipus/mida/dimensions, reescriu la imatge a WebP i executa auditoria, tests i build abans de publicar una branca. Si GitHub no permet recuperar una imatge amb fiabilitat, el workflow deixa la issue oberta i demana revisió. La descàrrega d'un adjunt real d'issue encara requereix prova manual a GitHub Actions.

## Permisos i accions

- A **Settings → Actions → General**, permet que Actions creï i aprovi pull requests si es vol el flux automàtic. El token `GITHUB_TOKEN` no inicia altres workflows quan crea una PR; per això el workflow d'entrada executa comprovacions abans de crear-la. Revisa de nou els checks abans de fusionar.
- Protegeix `main`, exigeix revisió humana i impedeix push directe. Mantén els permisos dels workflows mínims.
- El `CREDIT_AUTHORIZED_USERS` s'ha de configurar abans d'activar el formulari. Sense aquesta variable, ningú està autoritzat.
- Les accions externes estan fixades a versions declarades als workflows; actualitza-les conscientment.

## Publicació, URLs i domini

GitHub Pages publica només `dist/` mitjançant **Settings → Pages → Build and deployment → GitHub Actions**. Les fusions a `main` executen la publicació; les issues per si soles mai no publiquen. El build per defecte usa `https://jordinebot.github.io/catmastering/`. Per al domini personalitzat confirmat, configura la variable `SITE_DOMAIN=true` al workflow de desplegament i afegeix `public/CNAME` amb `catmastering.cat`; activa el domini a Pages i configura DNS amb el proveïdor del domini quan el propietari ho autoritzi. Cap DNS ni CNAME s'ha canviat en aquesta migració.

Les pàgines `catmastering_ca.html`, `catmastering_es.html` i `catmastering_en.html` són pàgines de compatibilitat amb meta refresh i enllaç de reserva. GitHub Pages no emet 301 per a aquestes rutes. Si el DNS/CDN futur admet regles, es poden substituir per redireccions reals.

## Canvis de dades i recuperació

`src/data/credits.json` és el catàleg públic i les imatges són a `public/images/`. No editis `legacy/`: és l'instantani d'origen. L'auditoria valida files i assets abans de build. Revisa les PRs amb `npm run check`, `npm test` i `npm run build`. Les dades d'origen i l'historial es poden recuperar des de `legacy/` i el commit inicial `057eb60`.

## Costos i límits

El lloc és estàtic i no requereix backend, base de dades ni servei de pagament. GitHub Pages i Actions tenen límits que depenen del pla, visibilitat i polítiques vigents del compte; comprova'ls a GitHub abans de canviar visibilitat o automatitzacions. El cost del domini, si n'hi ha, depèn del registrador.
