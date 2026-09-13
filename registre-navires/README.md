# Registre des inspections à destination

Application de suivi des ETA navires et des compagnies d'inspection mandatées,
avec rappels dans l'app, notifications navigateur, et un email de synthèse
envoyé automatiquement chaque jour tant qu'une action est nécessaire.

## Ce dont tu as besoin (tout est gratuit pour cet usage)

1. Un compte **GitHub** (pour héberger le code)
2. Un compte **Vercel** (https://vercel.com) — connecte-toi avec GitHub
3. Un compte **Resend** (https://resend.com) — pour l'envoi des emails

## Étape 1 — Mettre le code sur GitHub

1. Crée un nouveau repository sur GitHub (ex. `registre-navires`)
2. Pousse tous les fichiers de ce dossier dedans :
   ```
   git init
   git add .
   git commit -m "Registre inspections navires"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/registre-navires.git
   git push -u origin main
   ```

## Étape 2 — Importer le projet sur Vercel

1. Sur vercel.com, clique sur **Add New → Project**
2. Sélectionne ton repository `registre-navires`
3. Laisse les réglages par défaut et clique sur **Deploy**
   (le premier déploiement échouera peut-être car les variables d'environnement
   ne sont pas encore configurées — c'est normal, continue à l'étape 3)

## Étape 3 — Activer le stockage (Vercel KV)

1. Dans ton projet Vercel, va dans l'onglet **Storage**
2. Clique sur **Create Database → KV** (propulsé par Upstash), donne-lui un nom
3. Connecte-le à ton projet — Vercel ajoute automatiquement les variables
   `KV_REST_API_URL` et `KV_REST_API_TOKEN`

## Étape 4 — Configurer l'envoi d'email (Resend)

1. Crée un compte sur resend.com
2. Dans **API Keys**, crée une clé et copie-la
3. Pour tester rapidement, tu peux envoyer depuis l'adresse de test fournie par
   Resend (`onboarding@resend.dev`) — pour un usage régulier, vérifie ton propre
   domaine dans Resend (**Domains**) pour envoyer depuis une adresse à toi

## Étape 5 — Variables d'environnement sur Vercel

Dans ton projet Vercel → **Settings → Environment Variables**, ajoute :

| Nom                     | Valeur                                              |
|-------------------------|------------------------------------------------------|
| `RESEND_API_KEY`        | ta clé API Resend                                    |
| `ALERT_EMAIL_FROM`      | `onboarding@resend.dev` (ou ton adresse vérifiée)    |
| `ALERT_EMAIL_TO`        | adresse de secours, utilisée si un navire n'a pas de région ou si sa région n'est pas dans `REGION_EMAILS` |
| `ALERT_THRESHOLD_DAYS`  | `2` (nombre de jours avant l'ETA pour déclencher l'alerte) |
| `REGION_EMAILS`         | mapping région → email, en JSON (voir ci-dessous)    |

**Format de `REGION_EMAILS`** — un objet JSON à une seule ligne, ex. :
```
{"Casablanca-Settat":"casa-team@example.com","Tanger-Tetouan":"tanger-team@example.com","Souss-Massa":"agadir-team@example.com"}
```
Le nom de région doit être écrit **exactement** comme tu le saisis dans l'application
(mêmes majuscules/minuscules et accents), sinon le navire tombera sur l'adresse de secours
`ALERT_EMAIL_TO`. Chaque région peut n'avoir qu'une seule adresse — pour plusieurs
destinataires, utilise une adresse de groupe (liste de diffusion) côté email.

Puis clique sur **Redeploy** pour que tout prenne effet.

## Étape 6 — Vérifier le cron

Le fichier `vercel.json` programme une vérification automatique chaque jour à
7h (heure UTC). Tu peux ajuster l'heure dans ce fichier si besoin
(format cron standard). Vercel affiche l'historique d'exécution du cron dans
l'onglet **Cron Jobs** de ton projet — utile pour vérifier que tout tourne bien.

## Utilisation

- Ouvre l'URL fournie par Vercel après le déploiement (ex. `registre-navires.vercel.app`)
- Ajoute un navire avec juste son nom si tu n'as pas encore l'ETA — un rappel
  "ETA à compléter" apparaîtra tant que la date n'est pas renseignée
- Renseigne l'ETA, la destination, la région et la compagnie mandatée
  directement dans le tableau
- Utilise le filtre en haut du tableau pour n'afficher qu'une région à la fois
- Tant qu'aucune compagnie n'est indiquée et que l'ETA approche, le navire
  reste signalé en alerte (dans l'app + email quotidien envoyé à l'équipe de
  sa région, via `REGION_EMAILS`)
- Le bouton "Activer les notifications du navigateur" ajoute des alertes
  système quand l'app est ouverte

## Note

Les données sont stockées sur Vercel KV, partagées par toutes les personnes
qui utilisent l'URL de l'application (pas de compte séparé par utilisateur).
Comme convenu, cette donnée n'est pas considérée comme sensible pour cet usage.
