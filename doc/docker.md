# Préparer l'image Docker

L'application est un site statique. L'image Docker l'embarque avec un serveur **nginx** configuré pour la servir, sans aucun autre composant.

| Fichier | Rôle |
| --- | --- |
| [`Dockerfile`](../Dockerfile) | Construction de l'image |
| [`.dockerignore`](../.dockerignore) | Seuls les fichiers servis et la configuration nginx entrent dans l'image (pas de `.git`, de tests ni de documentation) |
| [`deploy/nginx/default.conf`](../deploy/nginx/default.conf) | Configuration du serveur : en-têtes de sécurité, compression, cache, sonde de santé |
| [`.github/workflows/docker-image.yml`](../.github/workflows/docker-image.yml) | Construction, test et publication automatiques dans GitHub Container Registry |

## Caractéristiques de l'image

- **Base :** `nginxinc/nginx-unprivileged:1.30-alpine` (nginx 1.30, branche stable, sur Alpine Linux), l'image officielle de nginx prévue pour tourner sans root.
- **Utilisateur :** `nginx` (uid 101). Les fichiers de l'application appartiennent à root et sont en lecture seule pour le serveur.
- **Port :** **8080** (un utilisateur non root ne peut pas écouter sur le port 80).
- **Lecture seule :** compatible avec un système de fichiers racine en lecture seule. Seul `/tmp` doit rester inscriptible (fichiers temporaires et pid de nginx).
- **Sonde de santé :** `GET /healthz` répond `ok`. Elle est utilisée par le `HEALTHCHECK` Docker et par les sondes Kubernetes.
- **En-têtes HTTP :** CSP stricte, `frame-ancestors 'none'`, `nosniff`, `no-referrer`, `Permissions-Policy`, isolation cross-origin (voir [fonctionnement-technique.md](fonctionnement-technique.md)).
- **Compression :** gzip sur HTML, CSS, JavaScript, SVG et manifeste (par exemple `app.js` passe de 72 Ko à 21 Ko).
- **Cache :** `no-cache` avec ETag pour HTML, CSS, JS et service worker. Les noms de fichiers ne sont pas versionnés : le navigateur revalide à chaque visite, et le serveur répond `304` sans contenu si rien n'a changé. Les images, icônes et la bibliothèque QR sont gardées 7 jours.
- **Accès refusés :** les fichiers cachés (`.git`, `.nojekyll`…) ne sont jamais servis.

## Construire l'image

Depuis la racine du dépôt :

```bash
docker build -t undercover:local .
# ou : npm run docker:build
```

Si Docker Hub n'est pas accessible ou limite les téléchargements (erreur `429 Too Many Requests`), utilisez un miroir de l'image de base :

```bash
docker build \
  --build-arg BASE_IMAGE=mirror.gcr.io/nginxinc/nginx-unprivileged:1.30-alpine \
  -t undercover:local .
```

`public.ecr.aws/nginx/nginx-unprivileged:1.30-alpine` fonctionne aussi, tout comme un registre interne d'entreprise.

### Image multi-architecture (Intel et ARM)

Pour des serveurs ARM (AWS Graviton, Raspberry Pi…) et Intel/AMD avec la même image :

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t registre.example.com/undercover:1.0.0 --push .
```

## Lancer le conteneur

```bash
docker run --rm -p 8080:8080 \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges \
  undercover:local
# ou : npm run docker:run
```

L'application est alors disponible sur <http://localhost:8080>.

Les options de cette commande reproduisent les protections du déploiement Kubernetes :

| Option | Effet |
| --- | --- |
| `--read-only --tmpfs /tmp` | Système de fichiers en lecture seule, `/tmp` en mémoire |
| `--cap-drop ALL` | Aucune capacité Linux particulière |
| `--security-opt no-new-privileges` | Aucune élévation de privilèges possible |

Vérifications rapides :

```bash
curl http://localhost:8080/healthz          # ok
curl -I http://localhost:8080/              # en-têtes de sécurité
docker inspect -f '{{.State.Health.Status}}' <conteneur>   # healthy
```

> **HTTPS :** le mode hors ligne (service worker) et l'installation sur l'écran d'accueil ne fonctionnent qu'en HTTPS, ou sur `localhost`. En production, placez le conteneur derrière un reverse proxy, un ingress ou un load balancer qui termine le TLS.

## Publier l'image

### Automatiquement, avec GitHub Actions

Le workflow `.github/workflows/docker-image.yml` s'exécute à chaque push sur `main`, à chaque tag `v*` et à la demande :

1. Il lance les tests (`npm test`).
2. Il construit l'image, puis la démarre en lecture seule et contrôle `/healthz`, la page d'accueil et la présence de la CSP.
3. Il publie l'image multi-architecture sur `ghcr.io/njko/agent_under_cover`. Sur une pull request, l'image est construite et testée mais pas publiée.

| Événement | Étiquettes publiées |
| --- | --- |
| Push sur `main` | `latest`, `sha-xxxxxxx` |
| Tag `v1.2.3` | `1.2.3`, `1.2`, `sha-xxxxxxx` |

Pour publier une version : `git tag v1.0.0 && git push origin v1.0.0`.

Un paquet GitHub Container Registry est **privé** à sa création. Pour que n'importe quel cluster puisse télécharger l'image sans identifiants, rendez-le public : sur GitHub, ouvrez **Packages → agent_under_cover → Package settings → Change visibility**. Sinon, configurez un secret d'accès au registre dans Kubernetes (voir [kubernetes.md](kubernetes.md)).

### Manuellement, vers un autre registre

```bash
docker tag undercover:local registre.example.com/equipe/undercover:1.0.0
docker login registre.example.com
docker push registre.example.com/equipe/undercover:1.0.0
```

Cela vaut pour tout registre compatible OCI : Azure Container Registry, Amazon ECR, Google Artifact Registry, Harbor, GitLab…

## Adapter la configuration

- **Journaux :** nginx écrit les journaux d'accès sur la sortie standard du conteneur. Pour ne rien journaliser, ajoutez `access_log off;` dans le bloc `server` de `deploy/nginx/default.conf`.
- **Durées de cache :** elles se règlent dans le bloc `map` en tête de `deploy/nginx/default.conf`.
- **CSP :** si vous la modifiez, gardez la même politique dans `deploy/nginx/default.conf` et dans la balise `<meta http-equiv="Content-Security-Policy">` de `index.html`.

## Mettre à jour l'application

Après une modification des fichiers de l'application :

1. Incrémentez `VERSION` dans `sw.js`, pour que les téléphones déjà installés récupèrent la nouvelle version.
2. Reconstruisez et republiez l'image, ou laissez le workflow le faire au push sur `main`.
3. Redéployez (voir [kubernetes.md](kubernetes.md)).
