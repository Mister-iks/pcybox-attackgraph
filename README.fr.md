<p align="center">
  <img src="docs/images/logo.png" width="240" alt="Logo PCYBOX AttackGraph" />
</p>

# PCYBOX AttackGraph

> **Construire. Attaquer. Défendre. Comprendre.**

Un laboratoire open source qui tourne entièrement dans votre navigateur : construisez une infrastructure fictive, **regardez une attaque la traverser**, et **vérifiez si votre défense fonctionne vraiment**. Chaque étape est accompagnée de la raison de son succès, et chaque contrôle indique précisément quelle précondition il casse.

[English](README.md) · [Cahier des charges](docs/specification.fr.md) · [Fonctionnement du moteur](docs/engine.md) · [Format des labs](docs/lab-format.md) · [Contribuer](CONTRIBUTING.md)

![Une attaque depuis Internet atteint la base clients en 3 étapes](docs/images/attack-reached.png)

## Pourquoi ce projet

Surface d'attaque, mouvement latéral, segmentation, rayon d'impact, défense en profondeur : ces notions sont difficiles à saisir avec des schémas statiques. PCYBOX AttackGraph les rend visibles et manipulables :

- **Visible** : l'attaque se déplace sur la carte, étape par étape, avec des commandes de relecture.
- **Explicable** : le panneau **Pourquoi ?** liste les préconditions remplies, le contrôle qui a stoppé une étape et ceux qui *auraient pu* la stopper, avec un bouton pour les essayer.
- **Causal** : la vue **Avant / après** compare votre architecture avec le même lab sans aucun contrôle.
- **Honnête** : les contrôles n'ont pas d'effet magique. Le MFA ne protège pas un compte de service ; le patch empêche l'entrée mais pas un attaquant déjà à l'intérieur.
- **Accessible partout** : sans compte, sans serveur, sans traceur. Fonctionne sur des appareils modestes, en plusieurs langues, au clavier et avec un lecteur d'écran (la **Vue texte** est un équivalent complet de la carte).

**Simulation uniquement.** Le lab ne scanne, ne contacte et n'attaque jamais un système réel. Les techniques sont décrites au niveau conceptuel, reliées à [MITRE ATT&CK](https://attack.mitre.org/), sans aucune procédure d'exploitation.

## Essayer

```bash
git clone https://github.com/Mister-iks/pcybox-attackgraph.git
cd pcybox-attackgraph
pnpm install
pnpm dev
```

Ouvrez l'adresse affichée, choisissez **Français** en haut à droite, cliquez sur **Lancer l'attaque**, activez **Segmentation réseau**, puis relancez.

Clavier : `Espace` lit ou met en pause, les flèches avancent ou reculent d'une étape, `Début` revient au départ.

## Contribuer

Les contributions sont les bienvenues : code, labs, traductions, et relecture du catalogue de techniques par des praticiens de la sécurité. Commencez par [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

- Code : [Apache License 2.0](LICENSE)
- Contenus pédagogiques (`content/`, `docs/`) : [CC BY 4.0](LICENSE-CONTENT)

MITRE ATT&CK® est une marque déposée de The MITRE Corporation. Ce projet n'est pas affilié à MITRE.
