# Modifier les animations d'exercices

Toutes les animations sont définies dans [`gestures.json`](./gestures.json). Le fichier est intégré à l'application au build : les changements s'appliquent après redéploiement et ne dépendent pas d'une connexion réseau.

## Structure

- `schemaVersion` identifie la version du format.
- `positions` contient des poses nommées réutilisables. Chaque position renseigne les mêmes angles.
- `animations` contient une définition par exercice. La valeur de `exercice` doit correspondre exactement à un nom de `program.ts`.
- `vue` choisit la vue `face` ou `profil` adaptée au mouvement.
- `description` est le texte visible avec le mouvement réduit et lu par les lecteurs d'écran.
- `appuiAuSol` est facultatif. Avec `true`, le bassin s'ajuste à la portée verticale de la jambe d'appui. Des jambes symétriques, ou de même portée verticale, gardent les deux pieds au sol. `pointes` lève les talons et le corps en gardant les orteils au sol ; `saut` décolle toute la silhouette.
- `poseReduite` est l'index, à partir de zéro, de la pose représentative à afficher lorsque le système réduit les animations.
- `poses` est une suite de poses. `dureeMs` est le temps de transition vers la pose suivante ; la dernière pose revient à la première. La somme des durées donne la durée de la boucle, sans limite de cinq secondes.

Chaque pose peut référencer une position avec `"position": "neutre"` et remplacer certains de ses angles, ou définir directement des valeurs numériques :

```json
{ "position": "neutre", "brasGauche": -90, "brasDroit": 90, "dureeMs": 1800 }
```

Les angles `brasGauche`, `brasDroit`, `jambeGauche` et `jambeDroite` sont en degrés autour de la verticale descendante ; `coudeGauche`, `coudeDroit`, `genouGauche` et `genouDroit` ajoutent une rotation à l'articulation correspondante. De profil, les angles positifs orientent les membres vers l'avant du personnage, à droite de l'écran.

`buste` incline le torse en degrés. Le champ facultatif `rotation` fait pivoter les épaules et les bras en profondeur, sans incliner le torse. `bassinLateral`, également facultatif, décale le bassin horizontalement pour les fentes. Ces deux champs valent zéro par défaut. `pointes`, `saut` et `bassinLateral` s'expriment en unités du `viewBox` SVG. Les pieds montrent le talon et les orteils ; les genoux restent marqués dans les deux vues.

Les poses interpolent avec une transition adoucie, y compris entre la dernière et la première. Ne pas répéter la première pose à la fin : cela ajoute un temps d'arrêt. Pour revenir par une position intermédiaire (genoux alternés, garde entre les coups de poing, milieu entre les fentes), l'insérer explicitement entre les gestes. Les durées de 130 ms des coups de poing et de 180 ms des sautillements rendent ces gestes plus rapides que les mouvements amples.

Une durée invalide, une position inconnue, un angle non numérique, un exercice absent ou une définition manquante produit un diagnostic dans la console. L'écran affiche alors « Animation indisponible » pour l'exercice concerné, sans interrompre le minuteur. Vérifier également le dessin dans l'application après chaque modification : des angles valides ne garantissent pas qu'un geste soit lisible ou fidèle.
