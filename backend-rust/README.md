# PayLink Africa API Rust

Ce service est la première étape de la migration du backend Express vers Rust.
Le frontend Next.js continue d'appeler le contrat `/api` existant pendant la migration.

## État actuel

- serveur Axum et arrêt propre du processus ;
- connexion PostgreSQL avec SQLx ;
- CORS configurable ;
- logs JSON avec `tracing` ;
- `GET /api/health` ;
- `GET /api/health/ready` ;
- passerelle Rust compatible avec toutes les routes `/api` existantes ;
- conservation des cookies, headers CSRF et réponses de l'API pendant la migration ;
- authentification native Rust pour inscription, connexion, profil et déconnexion ;
- JWT signé avec cookie HttpOnly et vérification CSRF ;
- gestion native des liens de paiement vendeur et de la page publique ;
- cache Redis optionnel pour les pages publiques, avec repli automatique sur PostgreSQL ;
- rate limiting Redis sur l'authentification, le checkout et le webhook Flutterwave ;
- création, modification, activation, désactivation et suppression des liens ;
- checkout mock, confirmation idempotente et reçu PDF signés par JWT ;
- Dockerfile non-root pour la production.

## Ordre de migration

1. passerelle Rust et bascule du frontend sur le port `4200` ;
2. middleware de contexte, erreurs et authentification JWT/cookie ;
3. inscription, connexion, profil et déconnexion ;
4. liens de paiement et dashboard vendeur ;
5. paiements mock et reçus PDF ;
6. Flutterwave, callbacks et webhooks signés ;
7. remplacement progressif de la passerelle par les modules Rust natifs ;
8. retrait du backend Express après passage des tests Robot et Playwright.

Le schéma PostgreSQL existant reste la source de vérité pendant cette migration.
Chaque étape doit conserver les réponses JSON, les cookies et les statuts HTTP attendus
par `frontend/src/lib/api.js` et les tests d'intégration.

Pour activer le paiement réel, renseigner `FLUTTERWAVE_SECRET_KEY` et
`FLUTTERWAVE_WEBHOOK_HASH`, exposer `API_PUBLIC_URL`, puis définir
`PAYMENT_GATEWAY=FLUTTERWAVE`. Le backend Rust vérifie le montant, la devise et la
référence auprès de Flutterwave avant de marquer le paiement comme payé.

## Développement

```bash
cargo run --manifest-path backend-rust/Cargo.toml
```

Variables minimales : copier `.env.example` vers `.env` et configurer `DATABASE_URL`.
Le service Rust peut fonctionner seul sur le port fourni par `PORT` ; `UPSTREAM_API_URL`
reste disponible uniquement pour les routes encore proxifiees pendant la migration.

Avec `REDIS_URL`, le rate limiting applique 10 requêtes/minute pour l'authentification,
20 pour le checkout et 60 pour le webhook Flutterwave.
