# Documentation Génération de Donjon

## C'est quoi ce truc ?
C'est un générateur de donjon procédural fait en TypeScript (vanilla). Il crée des cartes aléatoires à l'infini pour votre jeu de type RPG.

## Comment ça marche ?

### 1. L'algorithme BSP (Binary Space Partitioning)
L'algorithme découpe l'espace de la carte en morceaux, puis en morceaux plus petits, jusqu'à obtenir des "feuilles". Dans chaque feuille, on place une salle.

**En gros :**
- On divise la carte en deux (horizontalement ou verticalement)
- On recommence sur chaque moitié
- Quand c'est assez petit, on dessine une salle

### 2. Les étapes de génération

**Étape 1 : Initialisation**
On crée une grille vide remplie de murs (`TileType.Wall`).

**Étape 2 : Partitionnement BSP**
On utilise la classe `MapGenerator` pour diviser récursivement l'espace.

**Étape 3 : Création des salles**
Dans chaque feuille de l'arbre BSP, on crée une salle aléatoire :
- Taille aléatoire (entre `minRoomSize` et la taille max de la partition)
- Position aléatoire (avec un padding pour éviter les bords)

**Étape 4 : Connexion des salles**
On connecte les salles avec des couloirs en forme de "L" :
- D'abord horizontal, puis vertical
- Ou l'inverse, selon la direction de la partition

**Étape 5 : Entrée et Sortie**
- Entrée : première salle générée
- Sortie : salle la plus éloignée de l'entrée (distance de Manhattan)

## Fichiers importants

### `src/utils/MapGen.ts`
Contient la logique de génération :
- `MapGenerator` : La classe principale
- `TileType` : Les types de tuiles (Mur, Sol, Couloir, Entrée, Sortie)
- `bsp()` : L'algorithme récursif de partitionnement
- `carveRoom()` : Création d'une salle
- `connectLeaves()` : Connexion entre deux salles

### `src/utils/MapRenderer.ts`
Contient le rendu Canvas :
- `MapRenderer` : Classe qui dessine la carte sur un canvas HTML
- `render()` : Dessine toutes les tuiles
- `tileColor()` : Définit la couleur de chaque type de tuile

## Paramètres ajustables

Dans `main.ts`, tu peux modifier les paramètres de génération :

```typescript
const generator = new MapGenerator({
  width: 80,        // Largeur de la carte (en tuiles)
  height: 50,       // Hauteur de la carte (en tuiles)
  maxDepth: 4,      // Profondeur BSP (plus = plus de salles)
  minRoomSize: 4,   // Taille minimale d'une salle
  padding: 2        // Espace entre les salles et les bords
});
```

## Exemple d'utilisation

```typescript
// Créer un générateur
const generator = new MapGenerator({ width: 64, height: 40, maxDepth: 5 });

// Générer une carte (aléatoire)
const map = generator.generate();

// Générer une carte avec une graine spécifique (même carte à chaque fois)
const map = generator.generate(12345);

// Afficher la carte
const renderer = new MapRenderer(canvas, { tileSize: 16 });
renderer.render(map);
```

## Types de tuiles

- `Wall` (0) : Mur - obstacle
- `Floor` (1) : Sol - marchable
- `Corridor` (2) : Couloir - marchable
- `Entry` (3) : Entrée du donjon (marquée "E")
- `Exit` (4) : Sortie du donjon (marquée "X")

## Astuces

- **Augmenter `maxDepth`** : Plus de petites salles
- **Augmenter `minRoomSize`** : Salles plus grandes mais moins nombreuses
- **Changer les couleurs** : Modifier `DEFAULT_COLORS` dans `MapRenderer.ts`
- **Graine fixe** : Passer un nombre à `generate()` pour obtenir la même carte

## Pour aller plus loin

- Ajouter des objets (clés, portes, ennemis) dans les salles
- Implémenter un système de "seed" avec input utilisateur
- Ajouter des variations de couloirs (pas uniquement en "L")
- Générer des donjons à plusieurs étages
