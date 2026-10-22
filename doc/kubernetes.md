# Déployer sur Kubernetes

Les manifestes du dossier [`deploy/kubernetes/`](../deploy/kubernetes) déploient l'image Docker de l'application (voir [docker.md](docker.md)) dans n'importe quel cluster Kubernetes : AKS, EKS, GKE, OpenShift, Scaleway, OVHcloud, k3s…

## Contenu

| Fichier | Ressource | Rôle |
| --- | --- | --- |
| `namespace.yaml` | Namespace `undercover` | Isole l'application et impose le profil de sécurité **restricted** (Pod Security Standards) |
| `deployment.yaml` | Deployment | 2 réplicas du serveur nginx, durcis (voir ci-dessous) |
| `service.yaml` | Service `ClusterIP` | Port 80 du service vers le port 8080 des pods |
| `ingress.yaml` | Ingress | Exposition HTTPS sur un nom de domaine (**à adapter**) |
| `networkpolicy.yaml` | NetworkPolicy | Entrées limitées au port 8080, **aucune connexion sortante** |
| `poddisruptionbudget.yaml` | PodDisruptionBudget | Au moins un pod disponible pendant les maintenances des nœuds |
| `kustomization.yaml` | Kustomize | Assemble le tout, fixe le namespace et l'image à déployer |

## Le pod

Chaque pod contient un seul conteneur `web`, l'image de l'application :

| Réglage | Valeur | Pourquoi |
| --- | --- | --- |
| Port | `8080` (`http`) | nginx tourne sans root |
| Sondes `readiness` et `liveness` | `GET /healthz` | Le pod ne reçoit du trafic que lorsqu'il est prêt, et il est redémarré s'il ne répond plus |
| Ressources demandées | 10 m de CPU, 16 Mi de mémoire | Un serveur de fichiers statiques consomme très peu |
| Limites | 200 m de CPU, 64 Mi de mémoire | Protège le nœud en cas d'anomalie |
| Utilisateur | `runAsNonRoot`, uid/gid 101 | Jamais root |
| `readOnlyRootFilesystem` | `true` | Rien ne peut être modifié dans le conteneur |
| Seul volume inscriptible | `emptyDir` en mémoire (16 Mi) monté sur `/tmp` | Fichiers temporaires et pid de nginx |
| Capacités Linux | toutes retirées (`drop: ["ALL"]`) | Aucun privilège particulier |
| `allowPrivilegeEscalation` | `false` | Aucune élévation de privilèges |
| `seccompProfile` | `RuntimeDefault` | Filtre les appels système |
| `automountServiceAccountToken` | `false` | L'application n'appelle jamais l'API Kubernetes |
| Mise à jour | `RollingUpdate`, `maxUnavailable: 0` | Pas d'interruption pendant un déploiement |
| Répartition | `topologySpreadConstraints` | Les deux réplicas vont sur des nœuds différents si possible |

## Prérequis

- Un cluster Kubernetes **1.25 ou plus récent** (Pod Security Admission et `policy/v1`), et `kubectl` configuré.
- Un **contrôleur d'ingress** (ingress-nginx, Traefik, l'ingress du fournisseur cloud…) et un certificat TLS, par exemple avec cert-manager.
- Pour que la NetworkPolicy soit appliquée : un plugin réseau qui la prend en charge (Calico, Cilium, Antrea, ou celui intégré à k3s, AKS, GKE…).
- L'image publiée dans un registre accessible depuis le cluster (voir [docker.md](docker.md#publier-limage)).

## Déployer

### 1. Adapter l'ingress

Dans `deploy/kubernetes/ingress.yaml`, remplacez :

- `ingressClassName: nginx` par la classe de votre contrôleur, à lire avec `kubectl get ingressclass`. Par exemple `traefik` sur k3s, `webapprouting.kubernetes.azure.com` sur AKS.
- `undercover.example.com` par votre nom de domaine, aux deux endroits.
- `undercover-tls` par le secret qui contient le certificat. Avec cert-manager, décommentez l'annotation `cert-manager.io/cluster-issuer` pour obtenir le certificat automatiquement.

### 2. Choisir l'image

Dans `deploy/kubernetes/kustomization.yaml`, section `images` :

```yaml
images:
  - name: ghcr.io/njko/agent_under_cover
    newTag: sha-1bd2cc2        # en production, épinglez une version plutôt que latest
    # newName: registre.example.com/equipe/undercover   # pour un autre registre
```

Ou en ligne de commande, depuis `deploy/kubernetes/` :

```bash
kustomize edit set image ghcr.io/njko/agent_under_cover=ghcr.io/njko/agent_under_cover:1.0.0
```

### 3. Appliquer

```bash
kubectl apply -k deploy/kubernetes
kubectl -n undercover rollout status deployment/undercover
```

Pour voir le résultat avant de l'appliquer : `kubectl kustomize deploy/kubernetes`, ou `npm run k8s:render`.

### 4. Vérifier

```bash
kubectl -n undercover get pods,svc,ingress
# Accès direct, sans passer par l'ingress :
kubectl -n undercover port-forward svc/undercover 8080:80
curl http://localhost:8080/healthz      # ok
```

Puis ouvrez `https://undercover.example.com` (votre domaine).

## Registre privé

Si l'image est dans un registre privé (l'image publiée sur ghcr.io est publique et n'en a pas besoin) :

```bash
kubectl -n undercover create secret docker-registry registre-undercover \
  --docker-server=ghcr.io --docker-username=<utilisateur> --docker-password=<jeton en lecture seule>
```

Puis ajoutez dans `deployment.yaml`, sous `spec.template.spec` :

```yaml
      imagePullSecrets:
        - name: registre-undercover
```

## Opérations courantes

| Besoin | Commande |
| --- | --- |
| Déployer une nouvelle version | Mettre à jour `newTag`, puis `kubectl apply -k deploy/kubernetes` |
| Redémarrer les pods (même image) | `kubectl -n undercover rollout restart deployment/undercover` |
| Revenir à la version précédente | `kubectl -n undercover rollout undo deployment/undercover` |
| Changer le nombre de réplicas | `kubectl -n undercover scale deployment/undercover --replicas=3` |
| Lire les journaux | `kubectl -n undercover logs deploy/undercover` |
| Tout supprimer | `kubectl delete -k deploy/kubernetes` |

L'application ne garde aucun état côté serveur : les pods sont interchangeables, et il n'y a ni volume persistant ni sauvegarde à prévoir.

## Points d'attention

- **Le profil `restricted`** du namespace refuse tout pod qui ne respecte pas ces règles de sécurité. Si vous ajoutez un conteneur annexe, donnez-lui le même `securityContext`.
- **La NetworkPolicy** autorise l'entrée sur le port 8080 depuis tout le cluster. Pour la limiter au contrôleur d'ingress, ajoutez une règle `from` avec un `namespaceSelector` vers son namespace.
- **Sans HTTPS**, le mode hors ligne et l'installation sur l'écran d'accueil ne fonctionnent pas : servez toujours l'application en HTTPS.
- **Plusieurs environnements** (recette, production) : créez un overlay Kustomize par environnement, qui reprend `deploy/kubernetes` comme base et ne change que l'image, le domaine et le nombre de réplicas.

## Validation effectuée

Le 22/10/2026, sur un cluster k3s v1.34.1 avec Kustomize v5.7.1 :

- Les manifestes rendus par Kustomize ont été acceptés par le serveur d'API avec la validation stricte des champs.
- Les pods de l'application ont été **admis par le profil `restricted`**. À l'inverse, un pod lancé sans ces réglages de sécurité est bien refusé.
- L'image a aussi été lancée sous Docker avec les mêmes contraintes que le pod : lecture seule, uid 101, aucune capacité, `/tmp` en mémoire. Elle est restée `healthy` et l'application était entièrement fonctionnelle.

Le démarrage des pods dans le cluster lui-même n'a pas pu être testé : l'environnement de test ne permettait pas d'imbriquer des conteneurs. À confirmer lors du premier déploiement réel avec `kubectl -n undercover rollout status deployment/undercover`.
