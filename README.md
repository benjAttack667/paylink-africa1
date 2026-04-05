# PayLink Africa

MVP d'une plateforme de liens de paiement pour l'Afrique, inspiree de Stripe Payment Links.

Le projet permet a un vendeur de:
- creer un lien de paiement public
- partager ce lien a un client
- simuler ou verifier un paiement
- suivre les paiements recus depuis un dashboard
- telecharger un recu PDF apres paiement confirme

## Apercu

PayLink Africa repose sur une architecture simple et evolutive:

- frontend `Next.js 15` avec `App Router` et `Tailwind CSS`
- backend `Node.js + Express`
- base de donnees `PostgreSQL`
- ORM `Prisma`
- authentification `JWT` en cookie `HttpOnly`
- tests API avec `Robot Framework`
- tests navigateur avec `Playwright`

## Fonctionnalites actuelles

- inscription et connexion vendeur
- dashboard vendeur avec creation de liens de paiement
- edition, activation, desactivation et suppression des liens
- page publique de paiement accessible sans compte
- paiement mock pour les demonstrations
- architecture prete pour un vrai provider de paiement
- recu PDF telechargeable apres paiement confirme
- validation backend centralisee
- audit logs, health checks et quality gate CI

## Structure du projet

```text
paylink-africa/
|- backend/                 # API Express + Prisma + JWT
|- frontend/                # Application Next.js
|- deploy/demo/             # Guide demo gratuite Vercel + Render
|- deploy/production/       # Stack VPS Docker + Caddy + backups
|- tests/                   # Robot Framework + Playwright
|- docker-compose.yml       # PostgreSQL local pour le dev
|- render.yaml              # Blueprint Render pour la demo backend + DB
`- package.json             # Scripts racine
```

## Stack technique

- Frontend: `Next.js 15`, `React 18`, `Tailwind CSS`
- Backend: `Express 5`
- Base de donnees: `PostgreSQL`
- ORM: `Prisma 6`
- Auth: `JWT`, cookie `HttpOnly`, `CSRF`
- PDF: `pdfkit`
- Tests: `Robot Framework`, `Playwright`

## Demarrage local

### 1. Installer les dependances

```bash
npm run install:all
```

### 2. Configurer les variables d'environnement

Backend:

```bash
cd backend
cp .env.example .env
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
```

### 3. Demarrer PostgreSQL

```bash
npm run db:up
```

### 4. Appliquer Prisma

```bash
npm run prisma:generate
npm run prisma:deploy
```

### 5. Lancer le backend

```bash
npm run dev:backend
```

Backend local:

- `http://localhost:4000`
- `http://localhost:4000/api/health`
- `http://localhost:4000/api/health/ready`

### 6. Lancer le frontend

```bash
npm run dev:frontend
```

Frontend local:

- `http://localhost:3000`

## Variables d'environnement principales

### Backend

Copier `backend/.env.example` vers `backend/.env`.

Variables importantes:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_COOKIE_NAME`
- `JWT_COOKIE_MAX_AGE`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `COOKIE_DOMAIN`
- `CSRF_HEADER_NAME`
- `PAYMENT_GATEWAY`
- `ALLOW_MOCK_PAYMENTS_IN_PRODUCTION`
- `PAYMENT_CURRENCY`
- `API_PUBLIC_URL`
- `CLIENT_URL`
- `ALLOWED_ORIGINS`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_WEBHOOK_HASH`

### Frontend

Copier `frontend/.env.example` vers `frontend/.env.local`.

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SITE_STAGE`

## Scripts utiles

- `npm run install:all`
- `npm run db:up`
- `npm run db:down`
- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run start:backend`
- `npm run start:frontend`
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run prisma:deploy`
- `npm run test:robot:api`
- `npm run test:e2e`
- `npm run security:secrets`
- `npm run security:audit`
- `npm run ci:quality`
- `npm run ci:release-readiness`

## Qualite et tests

Le projet inclut une vraie barriere qualite:

- scan de secrets
- audit des dependances production
- validation Prisma
- build frontend
- tests API Robot Framework
- tests E2E Playwright
- verification Docker production

Commandes principales:

```bash
npm run ci:quality
npm run ci:release-readiness
```

Rapports generes:

- `tests/robot/results/output.xml`
- `tests/robot/results/log.html`
- `tests/robot/results/report.html`
- `playwright-report/index.html`

## Securite actuelle

- JWT en cookie `HttpOnly`
- protection `CSRF` sur les ecritures protegees
- `rate limiting` sur auth et checkout
- autorisations vendeur strictes
- validation backend centralisee
- erreurs API normalisees
- logs JSON structures
- audit logs persistants
- health checks `/api/health` et `/api/health/ready`
- mode `MOCK` interdit en production sauf opt-in explicite de demo

## Deploiement

### 1. Demo gratuite

Chemin recommande pour une demo publique:

- frontend sur `Vercel`
- backend + PostgreSQL sur `Render`

Guide complet:

- [deploy/demo/README.md](deploy/demo/README.md)

Fichiers utiles:

- [render.yaml](render.yaml)

### 2. Production sur VPS

Le projet inclut une stack Docker securisee avec:

- `Caddy` pour le HTTPS
- `frontend` et `backend` separes
- `PostgreSQL` non expose publiquement
- services non-root
- scripts de backup et restore

Fichiers utiles:

- `deploy/production/docker-compose.yml`
- `deploy/production/Caddyfile`
- `deploy/production/.env.example`

## API utile

- `GET /api/health`
- `GET /api/health/ready`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/payment-links`
- `POST /api/payment-links`
- `GET /api/payment-links/:slug`
- `POST /api/payment-links/:slug/pay`
- `GET /api/payment-links/mine/:productId`
- `PATCH /api/payment-links/mine/:productId`
- `PATCH /api/payment-links/mine/:productId/status`
- `DELETE /api/payment-links/mine/:productId`
- `GET /api/payments/flutterwave/callback`
- `POST /api/payments/flutterwave/webhook`

## Roadmap

Pistes de prochaines evolutions:

- vrai paiement live Flutterwave
- gestion livraison apres paiement
- notifications vendeur/client
- export des paiements
- analytics plus riches
- reset password et verification email

## Notes importantes

- le mode demo gratuit est fait pour une demonstration, pas pour une vraie production
- Vercel Hobby est reserve a un usage personnel et non commercial
- les services gratuits peuvent dormir apres inactivite
- pour une vraie mise en ligne stable, privilegier le deploiement VPS
