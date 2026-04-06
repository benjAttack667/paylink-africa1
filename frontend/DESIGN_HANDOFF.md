# Design Handoff For Canva

Ce frontend n'utilise pas seulement un fichier CSS classique.
Le visuel est partage entre :

- un fichier CSS global
- la config Tailwind
- des classes Tailwind directement dans les composants React

## 1. Fichiers a donner en priorite

CSS global principal :

- `frontend/src/app/globals.css`

Config visuelle Tailwind :

- `frontend/tailwind.config.js`

Structure visuelle globale :

- `frontend/src/components/ui/page-shell.js`

Page d'accueil :

- `frontend/src/app/page.js`

Auth vendeur :

- `frontend/src/components/ui/auth-card.js`

Dashboard vendeur :

- `frontend/src/components/dashboard/dashboard-page-client.js`
- `frontend/src/components/dashboard/payment-link-card.js`
- `frontend/src/components/dashboard/payment-link-detail-panel.js`

Page publique paiement :

- `frontend/src/components/pay/public-payment-page-client.js`

Checkout mock :

- `frontend/src/components/pay/mock-checkout-page-client.js`

Badges et petits elements visuels :

- `frontend/src/components/ui/status-badge.js`

## 2. Direction visuelle actuelle

Le style actuel est :

- premium léger
- fintech simple
- fond clair creme / sable
- cartes blanches avec blur et ombres douces
- gros contrastes sur les blocs sombres
- accent principal ambre / doré
- accent secondaire vert profond
- typo de titres expressive et typo de texte propre

## 3. Tokens visuels actuels

Couleurs principales :

- `canvas`: `#f5efe4`
- `ink`: `#101010`
- `brand-50`: `#fff3d9`
- `brand-100`: `#fde2a9`
- `brand-300`: `#efb84f`
- `brand-500`: `#d68a16`
- `brand-700`: `#8f530a`
- `pine`: `#1b4d3e`

Typographies :

- texte : `DM Sans`
- titres : `Space Grotesk`

Effets visuels :

- grandes cartes arrondies
- ombres douces
- léger backdrop blur
- boutons principaux en gradient sombre + vert + ambre
- badges arrondis

## 4. Ce que Canva doit ameliorer

Objectif :

- rendre le produit plus desiré visuellement
- garder une image serieuse et moderne
- reduire la sensation de page longue
- mieux hierarchiser les zones importantes
- garder un rendu tres propre sur mobile

Il faut surtout travailler :

- le hero de la home
- la coherence des cartes
- les CTA
- les espacements mobiles
- la sensation premium
- la lisibilite des tableaux/cartes dashboard

Il ne faut pas :

- tomber dans un design trop charge
- ajouter trop de couleurs
- casser la sobriete fintech
- rendre les boutons ou le fond trop agressifs

## 5. Prompt pret a copier dans Canva

```text
Je veux redesign l'interface d'un produit fintech web appele PayLink Africa.

Contexte produit :
- plateforme de liens de paiement pour vendeurs africains
- experience simple, mobile-first, claire et rassurante
- le vendeur cree un lien de paiement, le partage a son client, puis suit les paiements recus

Direction visuelle actuelle :
- base claire, creme/sable
- cartes blanches arrondies
- accent premium ambre/dore
- accent secondaire vert profond
- style fintech sobre, elegant, credible

Ce que je veux ameliorer :
- rendre le hero plus fort visuellement
- rendre l'ensemble plus attractif, plus premium et plus moderne
- reduire l'impression de longueur et de surcharge
- mieux organiser la lecture sur mobile
- creer des boutons CTA plus desirables et dynamiques
- garder une interface legere, rapide, propre et credible

Contraintes importantes :
- pas de design trop charge
- pas de look cheap ou trop marketing
- pas de palette excessive
- il faut garder un rendu pro et rassurant
- l'interface doit tres bien s'adapter au mobile, a la tablette et au desktop

Palette actuelle de reference :
- fond principal: #f5efe4
- texte principal: #101010
- accent ambre: #d68a16
- accent ambre clair: #fde2a9
- vert profond: #1b4d3e

Typographies actuelles :
- titres expressifs, geometriques, premium
- texte simple, lisible, moderne

Pages a imaginer / ameliorer :
- page d'accueil
- login / register vendeur
- dashboard vendeur
- page publique de paiement
- checkout

Je veux une proposition plus belle, plus premium, plus fluide, avec une meilleure hierarchie visuelle, tout en restant simple et credible pour une fintech africaine moderne.
```

## 6. Point important

Si tu veux envoyer le "vrai style actuel", le fichier le plus important reste :

- `frontend/src/app/globals.css`

Mais pour que Canva comprenne vraiment l'interface, il faut aussi montrer les composants React cites plus haut, parce que beaucoup de decoration est directement dans les `className`.
