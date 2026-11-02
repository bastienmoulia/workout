# Workout ⚡

Timer d'entraînement mobile : 10 exercices de 60 s, 10 s de récupération entre chaque, 5 s de préparation (11 min 35 au total).

👉 https://bastienmoulia.github.io/workout/

## Développement

```bash
npm install
npm start            # http://localhost:4200
npm test -- --watch=false
```

Le programme est défini dans `src/app/workout/program.ts`, la logique de la série dans `src/app/workout/series.ts`.

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml`, qui teste, construit et publie sur GitHub Pages.
Prérequis (une fois) : *Settings → Pages → Source : GitHub Actions*.
