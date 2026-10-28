# Ducted HVAC Card (FR)

Carte Home Assistant pour **climatisation / pompe à chaleur gainable** (ex. Atlantic) : schéma animé (caisson de reprise, unité, 5 gaines dont la couleur suit le mode : chaud, froid, auto, déshumidification, ventilation, arrêt), température, consigne réglable, modes, ventilation, préréglages et capteurs de soufflage/reprise. Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → URL de ce dépôt, catégorie **Tableau de bord** → installer → recharger la page.

## Configuration
```yaml
type: custom:ducted-hvac-card
entity: climate.maison
name: Gainable
return_entity: sensor.temperature_reprise_gainable_temperature   # affichée dans le caisson de reprise
return_name: Reprise
duct_1: sensor.temperature_salle_de_jeux_temperature   # 5 gaines de soufflage, chacune facultative
duct_1_name: Salle de jeux
duct_2: sensor.temperature_suite_temperature
duct_2_name: Suite
# duct_3 … duct_5 : même principe
info_entities:
  - sensor.esp_volet_combles_temperature_soufflage_gainable
theme: auto   # auto | light | dark
```

| Option | Description |
|---|---|
| `entity` | Entité `climate` (obligatoire) |
| `name` | Nom affiché |
| `return_entity`, `return_name` | Température et nom affichés dans le caisson de reprise (sinon la température de la carte) |
| `duct_1` … `duct_5`, `duct_N_name` | Capteur et nom de chacune des 5 gaines de soufflage |
| `info_entities` | Capteurs en tuiles (clic = historique) |
| `temp_step` | Pas de la consigne (0 = automatique) |
| `show_controls` / `show_modes` / `show_fan` / `show_presets` | Afficher les commandes, modes, ventilation, préréglages |
| `theme` | `auto`, `light`, `dark` |

Les modes, vitesses de ventilation et préréglages proposés sont ceux que l'entité expose. Licence MIT.

## Apparence : nuance de couleur

Dans l'éditeur visuel, à côté du thème :

| Option | Valeurs |
|---|---|
| `nuance` | `theme` (par défaut), `braise`, `ocean`, `lagon`, `foret`, `lavande`, `framboise`, `ambre`, `ardoise`, `perso` |
| `nuance_perso` | Couleur au choix (sélecteur de couleur), utilisée avec `nuance: perso` |
| `intensite` | De `0` (neutre) à `2` (très coloré), `1` par défaut |

La nuance teinte le dégradé de fond (et la couleur d'accent quand la carte en a une). Les couleurs d'état (vert, orange, rouge…) ne changent pas.

**Une seule nuance pour toutes les cartes Johan854** : laisse `nuance: theme` et ajoute à ton thème Home Assistant :

```yaml
carte-nuance: "#2f8fd8"
```

Sans cette ligne, `nuance: theme` garde les couleurs d'origine de la carte.

## Historique des versions

- **1.1.0** : nuance de couleur au choix (8 nuances, couleur personnalisée, intensité, ou nuance commune via `carte-nuance` dans le thème).
