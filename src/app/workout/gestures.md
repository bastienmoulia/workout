# Modifier les animations d'exercices

Toutes les animations sont définies dans [`gestures.json`](./gestures.json). Le fichier est intégré à l'application au build : les changements s'appliquent après redéploiement et ne dépendent pas d'une connexion réseau.

## Structure

- `schemaVersion` identifie la version du format.
- `positions` contient des poses nommées réutilisables. Chaque position renseigne les mêmes angles.
- `animations` contient une définition par exercice. La valeur de `exercice` doit correspondre exactement à un nom de `program.ts`.
- `vue` choisit la vue `face` ou `profil` adaptée au mouvement.
- `ecartProfil` est facultatif (de 0 à 18, zéro par défaut). Il sépare légèrement les épaules de profil pour distinguer les deux bras, notamment lors du clap. Les mouvements de bras devant le corps utilisent cette vue, contrairement aux battements sur les côtés.
- `description` est le texte visible avec le mouvement réduit et lu par les lecteurs d'écran.
- `appuiAuSol` est facultatif. Avec `true`, le bassin s'ajuste à la portée verticale de la jambe d'appui. Des jambes symétriques, ou de même portée verticale, gardent les deux pieds au sol. `pointes` lève les talons et le corps en gardant les orteils au sol ; `saut` décolle toute la silhouette.
- `piedsPivots` est facultatif (faux par défaut), réservé à la vue de face avec `appuiAuSol`. Il ancre les pointes aux abscisses 70 et 170 et fait pivoter les talons avec `rotation`. Le bassin et les genoux s'ajustent à ces appuis en conservant la longueur des jambes et une jambe tendue. Les angles des jambes ne pilotent alors plus le dessin ; `bassinLateral` transfère le poids d'un côté à l'autre. Pour conserver des appuis atteignables pendant toute l'interpolation, limiter `rotation` à ±90° et `bassinLateral` à ±24, et garder `pointes` et `saut` à zéro.
- `poseReduite` est l'index, à partir de zéro, de la pose représentative à afficher lorsque le système réduit les animations.
- `poses` est une suite de poses. `dureeMs` est le temps de transition vers la pose suivante ; la dernière pose revient à la première. La somme des durées donne la durée de la boucle, sans limite de cinq secondes.

Chaque pose peut référencer une position avec `"position": "neutre"` et remplacer certains de ses angles, ou définir directement des valeurs numériques :

```json
{ "position": "neutre", "brasGauche": -90, "brasDroit": 90, "dureeMs": 1800 }
```

Les angles `brasGauche`, `brasDroit`, `jambeGauche` et `jambeDroite` sont en degrés autour de la verticale descendante ; `coudeGauche`, `coudeDroit`, `genouGauche` et `genouDroit` ajoutent une rotation à l'articulation correspondante. Les valeurs vont de -360 à 360 : l'interpolation suit la différence numérique, ce qui permet de choisir le sens de passage d'un bras (par exemple par le côté plutôt que devant le corps). De profil, les angles positifs orientent les membres vers l'avant du personnage, à droite de l'écran.

`buste` incline le torse en degrés. Le champ facultatif `rotation` fait pivoter les épaules et les bras en profondeur, sans incliner le torse. `bassinLateral`, également facultatif, décale le bassin horizontalement pour les fentes. Ces deux champs valent zéro par défaut. `pointes`, `saut` et `bassinLateral` s'expriment en unités du `viewBox` SVG. Les pieds montrent le talon et les orteils ; les genoux restent marqués dans les deux vues.

Les poses interpolent avec une transition adoucie, y compris entre la dernière et la première. Ne pas répéter la première pose à la fin : cela ajoute un temps d'arrêt. Pour revenir par une position intermédiaire (genoux alternés, garde entre les coups de poing, milieu entre les fentes), l'insérer explicitement entre les gestes. Les durées de 130 ms des coups de poing et de 180 ms des sautillements rendent ces gestes plus rapides que les mouvements amples.

Pour les fentes, commencer l'inclinaison du buste et le mouvement du bras dès la pose latérale intermédiaire, plutôt que d'attendre la fin de la descente. Pour les bras croisés en squat, deux poses suffisent : les angles des bras vont de 20° à -200° (et l'inverse pour l'autre bras), si bien que l'interpolation passe d'elle-même par les côtés, sans arrêt intermédiaire. Les coudes fléchis vers l'intérieur croisent les avant-bras, pas les coudes.

Une durée invalide, une position inconnue, un angle non numérique, un exercice absent ou une définition manquante produit un diagnostic dans la console. L'écran affiche alors « Animation indisponible » pour l'exercice concerné, sans interrompre le minuteur. Vérifier également le dessin dans l'application après chaque modification : des angles valides ne garantissent pas qu'un geste soit lisible ou fidèle.
