# Workout ⚡

Timer d'entraînement mobile : 10 exercices de 60 s, 10 s de récupération entre chaque, 5 s de préparation (11 min 35 au total).
Installable comme PWA, avec icône dédiée et fonctionnement hors ligne après le premier chargement.
Les mises à jour sont téléchargées automatiquement et appliquées lorsque la séance est en pause ou
terminée ; la progression est sauvegardée avant le rechargement.
Le rond et l'animation s'adaptent à l'espace disponible en gardant les commandes visibles.
Les signaux sonores restent actifs : leur volume se règle sur l'appareil, sans bouton mute dans l'app.
Le double toucher ne déclenche pas de zoom ; le zoom par pincement reste disponible.

👉 https://bastienmoulia.github.io/workout/

## Développement

```bash
corepack enable       # Une fois par installation de Node.js
pnpm install
pnpm start            # http://localhost:4200
pnpm test --watch=false
```

Le programme est défini dans `src/app/workout/program.ts`, la logique de la série dans `src/app/workout/series.ts`.

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml`, qui teste, construit et publie sur GitHub Pages.
Prérequis (une fois) : _Settings → Pages → Source : GitHub Actions_.
