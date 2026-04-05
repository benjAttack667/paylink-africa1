# Demo gratuite: frontend Vercel + backend Render

Cette configuration est pensee pour une demonstration publique a faible cout, pas pour une vraie production stable.

## Architecture demo

- frontend Next.js sur Vercel
- backend Express + Prisma sur Render
- PostgreSQL gratuit sur Render
- paiements en mode `MOCK` avec opt-in explicite de demo

## Avant de commencer

- pousser ce repo sur GitHub
- garder la branche `main` propre
- verifier une derniere fois localement:

```bash
npm run ci:release-readiness
```

## 1. Deployer le backend et la base sur Render

1. Aller sur Render et creer un nouveau Blueprint a partir du repo GitHub.
2. Render detectera automatiquement [`render.yaml`](../../render.yaml).
3. Laisser la base `paylink-africa-demo-db` et le service `paylink-africa-demo-api` se creer.
4. Quand Render demande les variables `sync: false`, renseigner temporairement:

```text
API_PUBLIC_URL=https://replace-after-render-url
CLIENT_URL=https://replace-after-vercel-url
ALLOWED_ORIGINS=https://replace-after-vercel-url
```

5. Lancer le premier deploy.
6. Quand le service est cree, recuperer son URL publique Render:

```text
https://<ton-service-render>.onrender.com
```

7. Revenir dans les variables du service backend et remplacer:

```text
API_PUBLIC_URL=https://<ton-service-render>.onrender.com
```

Puis redeployer le backend.

## 2. Deployer le frontend sur Vercel

1. Aller sur Vercel et importer le meme repo GitHub.
2. Dans les settings du projet:
   - choisir `frontend` comme Root Directory
   - laisser Vercel detecter Next.js
3. Ajouter ces variables d'environnement:

```text
NEXT_PUBLIC_API_BASE_URL=https://<ton-service-render>.onrender.com/api
NEXT_PUBLIC_SITE_STAGE=pre-production
```

4. Lancer le deploy.
5. Recuperer l'URL publique Vercel:

```text
https://<ton-projet>.vercel.app
```

## 3. Rebrancher le backend vers le frontend public

Dans Render, mettre a jour ces variables du backend:

```text
CLIENT_URL=https://<ton-projet>.vercel.app
ALLOWED_ORIGINS=https://<ton-projet>.vercel.app
```

Puis redeployer le backend une derniere fois.

## 4. Verification finale

Verifier:

- frontend: `https://<ton-projet>.vercel.app`
- health backend: `https://<ton-service-render>.onrender.com/api/health`
- readiness backend: `https://<ton-service-render>.onrender.com/api/health/ready`

Flow de smoke test:

1. ouvrir `/register`
2. creer un compte vendeur
3. se connecter
4. creer un lien de paiement
5. ouvrir la page publique du lien
6. payer en mode `MOCK`
7. telecharger le recu

## Notes utiles

- les cookies cross-site entre Vercel et Render exigent `COOKIE_SECURE=true` et `COOKIE_SAME_SITE=none`
- le mode demo utilise `PAYMENT_GATEWAY=MOCK` avec `ALLOW_MOCK_PAYMENTS_IN_PRODUCTION=true`
- quand tu passeras plus tard a un vrai provider, retire ce flag et configure Flutterwave
- le free tier peut dormir apres inactivite et rallonger le premier chargement
