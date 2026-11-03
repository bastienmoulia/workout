# Modifier les animations d'exercices

Toutes les animations sont définies dans [`gestures.json`](./gestures.json). Le fichier est intégré à l'application au build : les changements s'appliquent après redéploiement et ne dépendent pas d'une connexion réseau.

## Structure

- `schemaVersion` identifie la version du format.
- `positions` contient des poses nommées réutilisables. Chaque position renseigne les mêmes angles.
- `animations` contient une définition par exercice. La valeur de `exercice` doit correspondre exactement à un nom de `program.ts`.
- `vue` choisit la vue `face` ou `profil` adaptée au mouvement.
- `description` est le texte visible avec le mouvement réduit et lu par les lecteurs d'écran.
- `poseReduite` est l'index, à partir de zéro, de la pose représentative à afficher lorsque le système réduit les animations.
- `poses` est une suite de poses. `dureeMs` est le temps de transition vers la pose suivante ; la dernière pose revient à la première. La somme des durées donne la durée de la boucle, sans limite de cinq secondes.

Chaque pose peut référencer une position avec `"position": "neutre"` et remplacer certains de ses angles, ou définir directement des valeurs numériques :

```json
{ "position": "neutre", "brasGauche": -90, "brasDroit": 90, "dureeMs": 1800 }
```

Les angles `brasGauche`, `brasDroit`, `jambeGauche` et `jambeDroite` sont en degrés autour de la verticale descendante ; `coudeGauche`, `coudeDroit`, `genouGauche` et `genouDroit` ajoutent une rotation à l'articulation correspondante. `buste` tourne le torse en degrés. `pointes` et `saut` déplacent les pieds ou la silhouette vers le haut, en unités du `viewBox` SVG. Les angles interpolent avec une transition adoucie, y compris entre la dernière et la première pose.

Une durée invalide, une position inconnue, un angle non numérique, un exercice absent ou une définition manquante produit un diagnostic dans la console. L'écran affiche alors « Animation indisponible » pour l'exercice concerné, sans interrompre le minuteur. Vérifier également le dessin dans l'application après chaque modification : des angles valides ne garantissent pas qu'un geste soit lisible ou fidèle.
