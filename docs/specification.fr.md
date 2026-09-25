# PCYBOX AttackGraph

## Cahier des charges : v2.0

| | |
|---|---|
| **Nom** | PCYBOX AttackGraph |
| **Tagline** | *Build. Attack. Defend. Understand.* |
| **Type** | Laboratoire open source de simulation de chemins d'attaque, dans le navigateur |
| **Plateforme** | Web (PWA, fonctionne hors ligne), auto-hébergeable, intégrable (iframe, LMS) |
| **Licences** | Code : Apache-2.0 · Contenus pédagogiques (labs, missions, textes) : CC BY 4.0 |
| **Langue source** | Anglais (clés i18n) : traduction communautaire dès la v0.2 |
| **Statut** | Spécification fonctionnelle et technique |
| **Remplace** | v1.0 (conservée dans `docs/archive/specification-v1.fr.md`) |

---

## 0. Ce qui change par rapport à la v1

| Sujet | v1 | v2 |
|---|---|---|
| Public | Tout le monde, des étudiants aux entreprises | **Priorité : apprenants et formateurs.** Les professionnels sont un public secondaire |
| Moteur | Règle naïve `compromised && allowed && exposure > threshold` | **Modèle capacités → techniques → préconditions/effets**, déterministe et **explicable à chaque étape** |
| Scores | Pourcentages arbitraires (« 82 % ») | **Métriques factuelles** : chemins, sauts, actifs atteints, contrôles traversés, détections |
| Défense | Un contrôle « bloque l'attaque » | Chaque contrôle **invalide une précondition précise** ou **déclenche une détection**, avec la raison |
| Portée mondiale | Anglais puis « autres langues » | **i18n dès le jour 1**, RTL, WCAG 2.2 AA, hors ligne, bas débit, appareils modestes, zéro compte |
| Partage | Backend « plus tard » | **Partage par URL sans serveur dès la v0.1** + intégration iframe + LMS |
| Référentiels | MITRE ATT&CK « plus tard » | ATT&CK, D3FEND et CWE **dès le modèle de données** ; missions alignées sur NICE, ECSF et CyBOK |
| 3D | Phase 3 | **Retirée du périmètre** : elle distrait sans améliorer la compréhension |
| Roadmap | MVP en 1 à 2 semaines avec 20 fonctionnalités | Jalons réalistes avec **critères de sortie** |
| Challenge | Budget en dollars | Budget en **points** (neutre culturellement) |

---

## 1. Vision

PCYBOX AttackGraph permet de **construire une infrastructure fictive, voir comment une attaque la traverse, et vérifier si une défense fonctionne vraiment**, directement dans un navigateur, sans installation, sans compte, dans n'importe quelle langue.

> **« Si cet élément est compromis, jusqu'où l'attaquant peut-il aller, pourquoi, et qu'est-ce qui l'arrêterait ? »**

L'objectif à long terme est de devenir **la référence mondiale ouverte pour enseigner les chemins d'attaque et l'architecture défensive** : l'outil qu'un enseignant à Dakar, São Paulo, Jakarta ou Lyon ouvre en cours, projette, et partage à ses étudiants par un simple lien.

### 1.1 Ce que le projet est

- un **simulateur pédagogique** fondé sur un modèle explicite et vérifiable ;
- un **support de cours** : formateurs, écoles, bootcamps, MOOC, programmes de sensibilisation ;
- un **bac à sable d'architecture** pour réfléchir avant de construire (développeurs, DevSecOps) ;
- un **format ouvert** (`.attackgraph.json`) pour décrire et échanger des scénarios.

### 1.2 Ce que le projet n'est pas

- un scanner, un outil de pentest ou un framework d'exploitation ;
- un outil de gestion de risque certifiable (les résultats ne valent que pour le modèle saisi) ;
- un remplaçant de BloodHound, des plateformes d'exposure management ou des cyber ranges.

---

## 2. Positionnement

### 2.1 Existant

| Outil | Forces | Ce qui manque pour notre cible |
|---|---|---|
| BloodHound | Chemins d'attaque AD sur données réelles | Nécessite un environnement réel ; pas pédagogique |
| Microsoft CyberBattleSim | Simulation de mouvement latéral sur graphe | Orienté recherche en IA ; aucune interface grand public |
| MulVAL | Graphes d'attaque logiques rigoureux | Académique, difficile d'accès |
| CyberCIEGE | Jeu pédagogique de défense avec budget | Client lourd, ancien, non ouvert |
| OWASP Threat Dragon / MS TMT | Modélisation de menaces | Diagrammes statiques, pas de simulation |
| XM Cyber, Tenable, MS Exposure Mgmt | Chemins d'attaque en entreprise | Commerciaux, fermés, pas pédagogiques |
| Cyber ranges (TryHackMe, HTB…) | Pratique technique réelle | Enseignent l'exploitation, pas l'architecture ; souvent payants |

### 2.2 Notre différence

1. **Visible** : l'attaque se déplace sous les yeux de l'utilisateur, étape par étape.
2. **Explicable** : chaque saut réussi ou bloqué est justifié (« pourquoi ? »).
3. **Causal** : on change une variable (« What if? ») et on voit l'effet exact.
4. **Accessible partout** : navigateur, hors ligne, bas débit, multilingue, gratuit, sans compte.
5. **Ouvert** : moteur réutilisable, format de lab documenté, contenus sous CC BY.

---

## 3. Publics

### 3.1 Personas prioritaires

| Persona | Besoin | Ce qu'il fait dans l'outil |
|---|---|---|
| **Apprenant** (étudiant, reconversion, autodidacte) | Comprendre le mouvement latéral, la segmentation, le moindre privilège | Suit des missions guidées, joue au mode Challenge |
| **Formateur** (enseignant, formateur en entreprise, créateur de MOOC) | Un support visuel projetable et des exercices corrigés | Ouvre un template, projette, crée des missions, partage un lien |
| **Créateur de contenu** (communauté, conférencier) | Illustrer un incident ou un concept | Construit un lab, l'exporte, l'intègre dans un article ou une présentation |

### 3.2 Personas secondaires

| Persona | Usage |
|---|---|
| Développeur / DevSecOps | Esquisser l'architecture d'un service et repérer les chemins évidents |
| Architecte sécurité | Expliquer une décision (segmentation, bastion, MFA) à un public non technique |
| Analyste SOC débutant | Comprendre où placer la détection sur un chemin |
| Sensibilisation (RSSI, PME, collectivités) | Montrer aux dirigeants l'impact d'une faiblesse |

---

## 4. Principes produit

1. **Correct avant spectaculaire.** Une animation qui enseigne une idée fausse est un échec.
2. **Montrer, puis expliquer.** Chaque visuel a une explication textuelle d'une phrase.
3. **Manipuler.** L'utilisateur apprend en changeant l'architecture, pas en lisant.
4. **Simulation uniquement.** Aucune interaction avec un système réel, jamais.
5. **Partout, pour tous.** Tout choix technique est validé contre les contraintes « bas débit, appareil modeste, autre langue, handicap ».
6. **Ouvert et réutilisable.** Le moteur, le format et les contenus sont utilisables sans l'interface.
7. **Petit et fini plutôt que grand et inachevé.** Chaque version publique est complète dans son périmètre.

---

## 5. Expérience utilisateur

### 5.1 Écran principal

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ☰ Lab: Web Application          [What if?] [Share]  🌐 FR   ▶ Run Attack │
├───────────────┬──────────────────────────────────────────┬───────────────┤
│ Library       │                                          │ Inspector     │
│  Assets       │      ┌─ DMZ ─────┐   ┌─ Internal ──────┐ │  Web Server   │
│  Identities   │ 🌐 ──│  [Web] ───┼───│─ [API] ── [DB]  │ │  Zone: DMZ    │
│  Controls     │      └───────────┘   └─────────────────┘ │  Services…    │
│  Zones        │                                          │  Weaknesses…  │
│               │                                          │  Controls…    │
├───────────────┴──────────────────────────────────────────┴───────────────┤
│ Timeline │ Why? │ Attack paths │ Blast radius │ Metrics │ Text view      │
│ ◀◀ ▶ ▶▶  x1 x2 x4   ●────●────●────○                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Text view** : une représentation complète du lab et de la simulation sous forme de tableau et de récit, équivalente au graphe (accessibilité, lecteurs d'écran, impression).
- **Why?** : pour l'étape sélectionnée, la technique utilisée, les préconditions remplies, et les contrôles qui auraient pu l'arrêter.
- Sur mobile, les panneaux deviennent des onglets et le canvas reste consultable (pan/zoom tactile). L'édition complète est optimisée pour tablette et ordinateur.

### 5.2 La démonstration de 30 secondes (GIF du README)

1. Ouvrir le template **Web Application**.
2. Cliquer **Run Attack**.
3. L'attaquant exploite une vulnérabilité du serveur web (étape expliquée : *« Exploit Public-Facing Application : le service 443 est exposé à Internet et utilise un composant vulnérable »*).
4. Il lit des identifiants de base de données dans la configuration du serveur web.
5. Le réseau étant plat, il se connecte directement à la base : **DATABASE REACHED : 3 étapes**.
6. L'utilisateur active **« Segmentation : Web → API uniquement »** et **« Secrets dans un coffre »**.
7. Il relance.
8. Le serveur web est toujours compromis, **mais l'attaque s'arrête là** :

```text
ATTACK CONTAINED at Web Server

Why:
✗ Web → DB:5432    blocked by segmentation rule "dmz→internal: api:443 only"
✗ Credential theft no DB credentials stored on Web Server

Blast radius: 5 assets → 1 asset
```

> Leçon correcte : la défense en profondeur **limite le rayon d'impact**, elle n'empêche pas forcément la première compromission.

### 5.3 Parcours

```text
Nouveau visiteur ─▶ Démo guidée (60 s) ─▶ Template ─▶ Run ─▶ What if? ─▶ Partage
Formateur        ─▶ Template ─▶ Modifier ─▶ Créer une mission ─▶ Lien / export / LMS
Apprenant        ─▶ Lien reçu ─▶ Mission ─▶ Choisir des contrôles ─▶ Résultat + correction
```

---

## 6. Modèle de données

### 6.1 Format de fichier

- Extension : `.attackgraph.json` ; type MIME : `application/vnd.pcybox.attackgraph+json`.
- Décrit par un **JSON Schema publié et versionné** (`schema/lab.schema.json`, SemVer).
- Chaque version du moteur sait **migrer** les versions antérieures du format.
- Les identifiants sont neutres (`web-01`) ; tous les textes affichés passent par des **clés de traduction** ou des champs `label` localisables.

```json
{
  "$schema": "https://github.com/Mister-iks/pcybox-attackgraph/schema/lab/1.0.json",
  "formatVersion": "1.0.0",
  "id": "tpl-web-application",
  "meta": {
    "title": { "en": "Web Application", "fr": "Application web" },
    "authors": ["..."],
    "license": "CC-BY-4.0",
    "difficulty": "beginner",
    "tags": ["segmentation", "credential-access"],
    "frameworks": { "nice": ["..."], "ecsf": ["..."] }
  },
  "zones": [],
  "nodes": [],
  "edges": [],
  "identities": [],
  "assets": [],
  "controls": [],
  "scenarios": [],
  "missions": []
}
```

### 6.2 Zones

Types : `internet`, `dmz`, `internal`, `restricted`, `management`, `production`, `development`, `cloud`, `third-party`, `ot` (industriel).
Une zone porte des **règles de flux par défaut** (deny / allow) et peut être imbriquée (ex. un VPC dans `cloud`).

### 6.3 Nodes

Types minimum : `internet`, `router`, `firewall`, `workstation`, `laptop`, `server`, `web-server`, `api-server`, `database`, `file-share`, `cloud-service`, `container`, `k8s-cluster`, `iot-device`, `plc` (OT), `domain-controller`, `identity-provider`, `vpn-gateway`, `jump-host`, `backup-server`, `saas-app`.

```json
{
  "id": "web-01",
  "type": "web-server",
  "label": { "en": "Web Server" },
  "zone": "dmz",
  "os": "linux",
  "services": [
    { "id": "https", "port": 443, "protocol": "tcp", "app": "http",
      "auth": "none", "runsAs": "svc-web", "weaknesses": ["vulnerable-component"] }
  ],
  "storedSecrets": [ { "grants": "id-db-app" } ],
  "sessions": [],
  "controls": ["edr"],
  "position": { "x": 320, "y": 180 }
}
```

### 6.4 Edges (flux)

Un edge est un **flux autorisé**, pas un câble. Il est dirigé.

```json
{
  "id": "e-web-db",
  "source": "web-01",
  "target": "db-01",
  "port": 5432,
  "protocol": "tcp",
  "purpose": "app-dependency",
  "encrypted": true,
  "via": ["fw-01"]
}
```

La connectivité effective est calculée : `edges` + règles des zones + contrôles réseau (segmentation, firewall).

### 6.5 Identités

Types : `anonymous`, `user`, `developer`, `service-account`, `admin`, `domain-admin`, `cloud-admin`.
Attributs : `groups`, `privileges` (sur quels nodes, à quel niveau), `mfa`, `passwordPolicy` (`weak` / `reused` / `strong`), `usedOn` (nodes où l'identité ouvre des sessions, ce qui laisse des secrets récupérables).

### 6.6 Actifs à protéger (crown jewels)

Un **actif** est une donnée ou une fonction portée par un node : `customer-data`, `payment`, `patient-records`, `source-code`, `domain-control`, `backups`, `industrial-process`.
Attributs : `confidentiality`, `integrity`, `availability` (échelle 1 à 4) et `label` métier.

### 6.7 Faiblesses (et non « CVE »)

Le lab utilise un **catalogue de faiblesses génériques**, chacune reliée à des CWE ou à des classes de mauvaise configuration. Aucune CVE réelle ni procédure d'exploitation n'est incluse dans le MVP.

| ID | Libellé | Référence |
|---|---|---|
| `vulnerable-component` | Composant logiciel vulnérable | CWE-1395 |
| `injection` | Injection (SQL, commande…) | CWE-74 |
| `default-credentials` | Identifiants par défaut | CWE-1392 |
| `weak-password` | Mot de passe faible | CWE-521 |
| `exposed-admin-interface` | Interface d'administration exposée | - (mauvaise configuration) |
| `missing-authentication` | Authentification absente | CWE-306 |
| `excessive-privileges` | Privilèges excessifs | CWE-250 / CWE-269 |
| `plaintext-secrets` | Secrets stockés en clair | CWE-256 / CWE-798 |
| `unpatched-os` | Système non à jour (élévation locale) | - |
| `misconfigured-storage` | Stockage cloud public | - |

---

## 7. Moteur de simulation

C'est le cœur du projet. Il doit être **déterministe, explicable, testable et indépendant de l'interface**.

### 7.1 Concepts

**Capacités** : ce que l'attaquant possède à un instant donné.

| Capacité | Sens |
|---|---|
| `netAccess(node, port)` | L'attaquant peut joindre ce service |
| `codeExec(node, level)` | Exécution de code sur le node (`user` ou `admin`) |
| `credential(identity)` | Il possède un secret valide pour cette identité |
| `session(identity, node)` | Il est authentifié sur ce node avec cette identité |
| `dataAccess(asset, cia)` | Il peut lire / modifier / rendre indisponible cet actif |

**Techniques** : des règles `préconditions → effets`, chacune reliée à une tactique et une technique MITRE ATT&CK (niveau conceptuel, sans procédure).

```ts
type Technique = {
  id: string;                    // "exploit-public-service"
  attack: { tactic: string; technique: string }; // "TA0001", "T1190"
  when: Condition[];             // préconditions
  then: Effect[];                // nouvelles capacités
  blockedBy: ControlEffect[];    // contrôles qui invalident une précondition
  detectedBy: ControlEffect[];   // contrôles qui génèrent une détection
  explain: MessageKey;           // phrase traduisible avec paramètres
};
```

Exemple :

```text
exploit-public-service   (Initial Access · T1190)
  WHEN  netAccess(N, S.port)
   AND  S.weaknesses ∋ vulnerable-component | injection
  THEN  codeExec(N, S.runsAs.level)
  BLOCKED BY  patch(S) · waf(S) [injection uniquement]
  DETECTED BY ids(zone(N)) · edr(N)

credential-from-files    (Credential Access · T1552)
  WHEN  codeExec(N, any)
   AND  N.storedSecrets ∋ secret(I)
  THEN  credential(I)
  BLOCKED BY  secrets-vault(N)

valid-accounts           (Lateral Movement · T1078)
  WHEN  credential(I) AND netAccess(M, authPort)
   AND  I.privileges ∋ M
  THEN  session(I, M)
  BLOCKED BY  mfa(I) [si le secret n'inclut pas le facteur]
```

**Contrôles** : ils n'ont jamais d'effet magique. Chaque contrôle déclare **ce qu'il modifie** :

| Contrôle | Effet dans le modèle | Référence |
|---|---|---|
| Segmentation / règles de pare-feu | Retire des `netAccess` | D3FEND Network Isolation |
| MFA | Rend `credential(I)` insuffisant pour `session(I, *)` | D3FEND Multi-factor Authentication |
| Patch / mise à jour | Retire une faiblesse `vulnerable-component` / `unpatched-os` | D3FEND Software Update |
| WAF | Bloque la classe `injection` sur HTTP ; **pas** les composants vulnérables en général | D3FEND |
| Coffre à secrets | Retire les `storedSecrets` lisibles | - |
| Moindre privilège | Réduit `privileges` et `runsAs` | - |
| Bastion (jump host) | Seul chemin d'administration autorisé, avec MFA | - |
| EDR | Détecte, et optionnellement bloque, des techniques sur le node | - |
| IDS / journalisation | Détecte uniquement (n'arrête rien) | - |
| Sauvegardes hors ligne | Préserve la disponibilité des actifs | - |

> Distinction pédagogique centrale : **prévenir** (bloquer une précondition), **détecter** (générer une alerte), **limiter l'impact** (réduire le blast radius).

### 7.2 Algorithme

1. **Normaliser** le lab : calculer la connectivité effective (edges, zones, contrôles réseau).
2. **Saturer** : chaînage avant à point fixe à partir des capacités initiales de l'attaquant (`internet`, ou un node « assumed breach »). On obtient **toutes** les capacités atteignables, sous forme de graphe d'attaque (capacités ↔ techniques).
3. **Extraire les chemins** : plus courts chemins (nombre d'étapes, ou poids « difficulté ») vers chaque actif ; les *k* meilleurs chemins par objectif.
4. **Scénariser** : produire une séquence d'événements ordonnée pour l'animation.
5. **Expliquer** : pour chaque événement, les préconditions satisfaites, les contrôles présents, les contrôles qui auraient bloqué.

```ts
type SimEvent = {
  step: number;
  t: number;                         // temps de l'animation (ms), pas un temps réel
  technique: string;
  attack: { tactic: string; technique: string };
  from?: string;
  target: string;
  result: "success" | "blocked" | "detected";
  gained: Capability[];
  because: Evidence[];               // préconditions satisfaites
  stoppedBy?: { control: string; rule: string };
  explain: { key: string; params: Record<string, string> };
};
```

### 7.3 Exigences

- **Déterminisme** : même lab + même version du moteur = mêmes résultats (tests « golden »).
- Un **mode probabiliste** optionnel (probabilité de succès par technique, graine fixée) pourra venir plus tard. Il ne doit jamais remplacer le mode déterministe.
- **Pureté** : TypeScript sans dépendance DOM ; exécution dans un Web Worker ; utilisable en Node.js et en CLI.
- **Extensibilité** : techniques, faiblesses et contrôles sont déclarés en **données** (JSON/YAML), validées par schéma, pas codées en dur.
- **Performance** : saturation d'un lab de 500 nodes en moins de 200 ms sur un ordinateur portable courant.
- **Relecture experte** : chaque technique du catalogue est revue par au moins deux contributeurs ayant une expérience offensive ou défensive, avant d'être intégrée.

---

## 8. Fonctionnalités

### 8.1 Construire

- Glisser-déposer des assets, identités, zones et contrôles ; connexions à la souris ou au clavier.
- Inspecteur : services, faiblesses, secrets stockés, privilèges, contrôles.
- **Validation en direct** : incohérences signalées (service sans port, identité sans usage, zone vide…).
- Annuler / rétablir, copier-coller, alignement automatique (layout par zones).

### 8.2 Simuler

- Point d'entrée : Internet, utilisateur piégé (phishing, niveau conceptuel), prestataire, ou « assumed breach » sur un node choisi.
- Objectif : un actif précis, ou « tout ce qui est atteignable ».
- Animation du chemin, **timeline** et panneau **Why?**
- **Replay** : lecture, pause, x1 / x2 / x4, pas à pas avant / arrière, retour au début.

### 8.3 Analyser

- **Attack paths** : liste des chemins vers chaque actif, triés par longueur ; mise en évidence du **point de passage obligé** (un node ou flux présent dans tous les chemins, idéal pour la défense).
- **Blast radius** : depuis un node compromis, ce qui est atteignable (directement / indirectement) : nodes, identités, actifs, zones.
- **Couverture de détection** : pour chaque chemin, à quelle étape l'attaquant est détecté (ou jamais).

### 8.4 What if?

- Changer **une** variable (activer MFA, supprimer un flux, patcher un service…) et comparer avant / après côte à côte.
- **Suggestions de remédiation** : le moteur calcule les *k* modifications minimales qui coupent tous les chemins vers un actif. Elles sont présentées comme des pistes à discuter, pas comme une prescription.

### 8.5 Challenge (mode jeu)

```text
MISSION 03 : Protect the patient records
Objective : l'attaquant ne doit pas atteindre patient-records (confidentialité)
Contrainte : le service de prise de rendez-vous doit rester accessible depuis Internet
Budget     : 100 points

  Segmentation   40 pts     MFA            30 pts
  Patch          25 pts     Secrets vault  20 pts
  EDR            35 pts     Logging        10 pts
```

- **Contraintes métier** (disponibilité d'un service, coût) pour éviter la solution triviale « tout couper ».
- Évaluation : réussite, points utilisés, étape de détection, **correction expliquée**.
- Niveaux : Beginner, Intermediate, Advanced, Expert.

### 8.6 Mode formateur

- Créer une mission à partir de n'importe quel lab : objectif, contraintes, budget, indices, correction.
- Mode **présentation** : gros caractères, interface épurée, pilotage au clavier, pointeur.
- Mode **lecture seule** pour les liens partagés aux apprenants.
- Export d'une **fiche imprimable / PDF** (lab + questions + correction) pour les salles sans ordinateurs.

### 8.7 Métriques (factuelles uniquement)

```text
Entry points exposed        3
Attack paths to crown jewels 7
Shortest path               4 steps
Critical assets reachable   2 / 4
Choke points                1  (api-01)
First detection             step 3 of 4
Controls traversed          2
```

Aucun score global en pourcentage. Si un indicateur synthétique est ajouté plus tard, sa formule doit être affichée à côté du chiffre.

---

## 9. Contenus

### 9.1 Templates de la v1.0

| # | Template | Concepts clés |
|---|---|---|
| 01 | Web Application | Exposition, secrets, segmentation |
| 02 | Small Office / PME | Réseau plat, réutilisation de mots de passe, sauvegardes |
| 03 | Active Directory | Sessions admin, mouvement latéral, tiering |
| 04 | Cloud Architecture | Stockage public, identités cloud, rôles |
| 05 | Hospital Network | Disponibilité, dispositifs médicaux, prestataires |
| 06 | Industrial (OT) | Frontière IT/OT, accès distant |
| 07 | Zero Trust | Comparaison avec 02 |
| 08 | Supply chain / Prestataire | Accès tiers, VPN, confiance |

Les templates utilisent des noms **génériques et neutres** (pas de marques, pas de pays, pas de monnaie).

### 9.2 Missions et alignement sur les référentiels

Chaque mission indique :
- des objectifs pédagogiques explicites (« À la fin, l'apprenant sait expliquer… ») ;
- les compétences visées dans le **NICE Framework** (États-Unis), **ENISA ECSF** (Europe) et les domaines **CyBOK**. Cela facilite l'adoption dans les programmes officiels de plusieurs pays ;
- une durée estimée et un niveau.

### 9.3 Contenus communautaires

- Dépôt `content/` : labs et missions sous **CC BY 4.0**, relus avant fusion (exactitude technique + clarté pédagogique).
- Un lab communautaire doit passer la validation de schéma, les tests golden et la revue d'un mainteneur.
- Galerie de labs publiée statiquement, filtrable par langue, niveau, concept et référentiel.

---

## 10. Portée mondiale

C'est le critère qui fait passer le projet d'une bonne démo à un outil utilisé partout.

### 10.1 Internationalisation (i18n)

- **Aucune chaîne en dur** dans l'interface ni dans le moteur : messages au format **ICU MessageFormat** (pluriels, genres, paramètres).
- Explications du moteur = clés + paramètres, donc traduisibles.
- Contenus (labs, missions) : fichiers de traduction séparés (`labs/web-app/i18n/fr.json`) avec **repli sur l'anglais**.
- **RTL** complet (arabe, hébreu, persan, ourdou) : propriétés CSS logiques, inversion du layout, tests visuels dédiés.
- Dates, nombres et listes via l'API `Intl` ; aucune unité monétaire.
- Polices : pile système + sous-ensembles Noto pour les écritures non latines, chargés à la demande.
- Plateforme de traduction communautaire : **Weblate** (libre, hébergement gratuit pour les projets open source) ou Crowdin.
- Glossaire terminologique par langue : garder les termes anglais reconnus (*lateral movement*) quand c'est l'usage du métier local, et le documenter.

**Langues prioritaires :**

| Vague | Langues |
|---|---|
| v0.2 | Anglais, Français, Espagnol, Portugais (Brésil) |
| v1.0 | + Arabe, Chinois simplifié, Hindi, Indonésien, Allemand |
| après v1.0 | Toute langue atteignant 90 % de traduction et un relecteur actif |

### 10.2 Accessibilité

Cible : **WCAG 2.2 niveau AA**.

- Le graphe n'est **jamais** la seule représentation : la **Text view** (tableaux + récit de la simulation) est équivalente et navigable au lecteur d'écran.
- Navigation clavier complète dans le canvas : nodes, edges, création de connexions.
- **Ne pas coder l'information uniquement par la couleur** : compromis = rouge + icône + motif ; bloqué = bouclier + texte. Palette testée contre les daltonismes.
- `prefers-reduced-motion` respecté : transitions remplacées par des états successifs.
- Thèmes sombre, clair et contraste élevé ; zoom jusqu'à 200 % sans perte.
- Tests automatisés (axe-core) + tests manuels avec NVDA, VoiceOver et TalkBack avant chaque release majeure.

### 10.3 Bas débit, appareils modestes, hors ligne

| Budget | Cible |
|---|---|
| JS initial (gzip) | ≤ 250 Ko ; éditeur avancé et langues chargés à la demande |
| Premier affichage utile | < 3 s sur un Android d'entrée de gamme en 3G rapide |
| Interaction | 60 FPS jusqu'à 200 nodes sur ordinateur ; 30 FPS sur mobile d'entrée de gamme |
| Mémoire | < 150 Mo pour un lab de 200 nodes |

- **PWA installable**, fonctionne **entièrement hors ligne** après la première visite (templates et langue choisie inclus).
- **Archive téléchargeable** (zip statique) pour les écoles sans Internet fiable : ouvrir `index.html` ou servir sur le réseau local.
- Aucune dépendance à des CDN tiers au runtime (souveraineté, pare-feux scolaires, pays où certains services sont bloqués).

### 10.4 Zéro friction

- Aucun compte nécessaire pour utiliser, créer ou partager.
- Aucun cookie ni traceur tiers par défaut.
- Fonctionne dans les navigateurs evergreen des 2 dernières années (Chrome, Edge, Firefox, Safari, Samsung Internet).

---

## 11. Partage et intégration

| Mode | Fonctionnement | Version |
|---|---|---|
| **Lien** | Lab compressé dans le fragment d'URL (`#lab=…`), rien n'est envoyé à un serveur | v0.1 |
| **Fichier** | Export / import `.attackgraph.json` | v0.1 |
| **Embed** | `<iframe src="…/embed#lab=…&mode=readonly&autoplay=1">` pour blogs, docs et slides | v0.3 |
| **Galerie** | Labs publiés via pull request, servis statiquement | v0.5 |
| **LMS** | **LTI 1.3** (Moodle, Canvas, Blackboard…) et export **SCORM/xAPI** des résultats de missions | v1.x |
| **Liens courts / collaboration** | Backend optionnel et auto-hébergeable | après v1.0 |

Si le lab est trop gros pour une URL (> ~8 Ko compressés), l'outil propose l'export fichier.

---

## 12. Architecture technique

### 12.1 Stack

| Couche | Choix |
|---|---|
| Langage | TypeScript strict |
| Build | Vite, monorepo pnpm |
| UI | React, Tailwind CSS (propriétés logiques pour le RTL) |
| Graphe | React Flow (xyflow) ; layout ELK.js par zones |
| État | Zustand + historique (undo/redo) |
| i18n | FormatJS / ICU |
| Moteur | Package TS pur, exécuté dans un Web Worker (Comlink) |
| Validation | JSON Schema (Ajv) |
| Tests | Vitest, Playwright, axe-core, tests golden du moteur |
| PWA | Workbox |

### 12.2 Organisation du dépôt

```text
pcybox-attackgraph/
├── apps/
│   ├── web/                  # application principale (PWA)
│   └── docs/                 # site de documentation (multilingue)
├── packages/
│   ├── schema/               # JSON Schema du format .attackgraph + migrations
│   ├── engine/               # saturation, chemins, blast radius, what-if
│   ├── catalog/              # techniques, faiblesses, contrôles (données)
│   ├── i18n/                 # messages ICU de l'interface et du moteur
│   ├── ui/                   # composants
│   └── cli/                  # `attackgraph validate|simulate|diff lab.json`
├── content/
│   ├── templates/
│   ├── missions/
│   └── i18n/
├── tests/golden/             # lab + résultat attendu, un dossier par cas
├── CONTRIBUTING.md  GOVERNANCE.md  SECURITY.md  CODE_OF_CONDUCT.md
├── LICENSE (Apache-2.0)  LICENSE-CONTENT (CC BY 4.0)
└── README.md (+ traductions)
```

### 12.3 CLI et usage « as code »

```bash
attackgraph validate lab.attackgraph.json
attackgraph simulate lab.attackgraph.json --from internet --target customer-data --format md
attackgraph diff before.attackgraph.json after.attackgraph.json
```

Cette CLI sert les tests, la CI des contenus, et les enseignants qui génèrent des exercices. Plus tard, elle permettra d'importer des architectures depuis `docker-compose` ou Terraform (en lecture seule, hors ligne).

---

## 13. Sécurité, confidentialité et éthique

### 13.1 Frontière simulation / réel

Le projet **ne doit jamais** :
- émettre du trafic réseau vers un système autre que son propre hébergement statique ;
- scanner, découvrir ou importer automatiquement un réseau réel ;
- contenir du code d'exploitation, des payloads ou des procédures pas-à-pas d'attaque ;
- collecter des identifiants.

Les descriptions de techniques restent au **niveau conceptuel** (« ce que c'est, pourquoi ça marche, comment s'en protéger »).

### 13.2 Sécurité de l'application

- Tout lab importé (fichier, URL, embed) est une **entrée non fiable** : validation stricte par schéma, limites de taille et de profondeur, aucun HTML interprété (texte uniquement ; Markdown restreint et assaini si nécessaire).
- **Content-Security-Policy** stricte, aucun `eval`, pas de script tiers.
- Chaîne d'approvisionnement : dépendances minimales, lockfile, Renovate, **SBOM** publiée, releases signées (Sigstore), GitHub Actions épinglées par hash.
- Processus de divulgation responsable dans `SECURITY.md`.

### 13.3 Confidentialité

- Aucune donnée personnelle collectée. Les labs restent dans le navigateur (IndexedDB) sauf export volontaire.
- Mesure d'audience **optionnelle**, sans cookie, auto-hébergée (ex. Plausible/Umami), désactivable, respectant le RGPD et les législations équivalentes (LGPD, POPIA…).
- Un avertissement discret invite à **ne pas saisir d'informations réelles et sensibles** sur une organisation dans un lab partagé par lien.

---

## 14. Qualité

- **Definition of Done** : implémentation, tests, textes via i18n (anglais complet), accessibilité vérifiée, documentation, exemple, pas de régression des budgets de performance.
- **Tests golden du moteur** : chaque template et chaque technique a un cas `lab → événements attendus`. Toute modification du résultat doit être assumée dans la PR.
- **Tests de propriétés** : ajouter un contrôle de prévention ne peut jamais *augmenter* le nombre de capacités atteintes (monotonie).
- **Revue pédagogique** : chaque template est testé avec au moins 3 apprenants et 1 formateur avant publication. On mesure s'ils expliquent correctement le chemin après usage.
- CI : lint, types, tests, a11y, taille des bundles, validation de tous les contenus, rendu RTL.

---

## 15. Open source et gouvernance

- **GOVERNANCE.md** : rôles (mainteneurs, relecteurs contenu, coordinateurs de langue), prise de décision, succession.
- **Processus RFC** pour toute modification du format de lab ou du modèle du moteur.
- Labels `good first issue`, `translation`, `content`, `engine` ; guide de contribution illustré.
- **Coordinateurs régionaux** : un référent par grande région linguistique, pour les traductions et l'adoption dans l'enseignement local.
- Partenariats visés : universités, programmes nationaux de formation cyber, associations (OWASP chapters, communautés locales), ONG d'inclusion numérique.
- Financement : GitHub Sponsors / Open Collective, subventions (ex. NLnet, fonds pour les communs numériques), sans jamais restreindre la version gratuite.
- Attribution des référentiels : MITRE ATT&CK®, D3FEND™ et CWE™ sont cités selon leurs conditions d'utilisation.

---

## 16. Roadmap

Les durées supposent 1 à 2 contributeurs réguliers. Elles sont indicatives ; seuls les **critères de sortie** comptent.

### v0.1 : « One network. One attack. One defense. » (≈ 3 à 4 semaines)

- Template **Web Application** uniquement, non modifiable (sauf les contrôles).
- Moteur : 5 techniques (`exploit-public-service`, `credential-from-files`, `valid-accounts`, `local-privilege-escalation`, `data-access`) et 4 contrôles (segmentation, secrets vault, MFA, patch).
- Animation, timeline, panneau **Why?**, avant / après.
- Partage par URL, export / import JSON.
- Interface déjà branchée sur l'i18n (anglais seul), navigation clavier de base, Text view minimale.

**Critère de sortie :** une personne qui découvre l'outil sait expliquer en une phrase pourquoi la segmentation a limité l'attaque, sans aide, en moins de 2 minutes.

### v0.2 : Éditeur (≈ 4 à 6 semaines)

- Construction libre : nodes, edges, zones, services, faiblesses, identités.
- Validation en direct, undo/redo, layout par zones.
- 3 templates ; 4 langues (EN, FR, ES, PT-BR) ; RTL prêt techniquement.
- CLI `validate` / `simulate`.

### v0.3 : Analyse (≈ 4 semaines)

- Attack paths multiples, choke points, blast radius, couverture de détection.
- What if? avec comparaison côte à côte.
- Embed iframe ; PWA hors ligne.

### v0.5 : Apprendre (≈ 6 semaines)

- Mode Challenge + 10 missions alignées NICE / ECSF / CyBOK.
- Mode formateur (création de missions, présentation, fiche imprimable).
- Galerie communautaire ; 6 templates.
- Audit WCAG 2.2 AA.

### v1.0 : Stable

- Format `.attackgraph` 1.0 figé (compatibilité garantie par migrations).
- 8 templates, 20+ missions, 9 langues dont arabe et chinois.
- Suggestions de remédiation (coupes minimales).
- Documentation complète multilingue, archive hors ligne pour les écoles.

### Après v1.0 (non engagé)

- Intégration LMS (LTI 1.3, xAPI).
- Mode probabiliste avec graine.
- Import en lecture seule depuis docker-compose / Terraform.
- Collaboration temps réel et backend optionnel auto-hébergeable.

---

## 17. Critères d'acceptation v1.0

L'utilisateur peut, **dans au moins 5 langues, au clavier seul, hors ligne, sur un ordinateur ou une tablette d'entrée de gamme** :

- [ ] ouvrir un template et lancer une simulation en moins de 10 secondes ;
- [ ] créer un lab avec au moins 15 types de nodes, des zones, des services, des identités et des faiblesses ;
- [ ] définir un point d'entrée et un objectif ;
- [ ] voir l'attaque se propager, avec une explication pour chaque étape ;
- [ ] lire la simulation en Text view avec un lecteur d'écran ;
- [ ] rejouer la simulation (pause, vitesses, pas à pas) ;
- [ ] voir les chemins d'attaque, les choke points et le blast radius ;
- [ ] ajouter un contrôle, relancer, et comparer avant / après ;
- [ ] jouer une mission Challenge et obtenir une correction ;
- [ ] partager le lab par lien, fichier ou embed ;
- [ ] importer un lab d'une version antérieure du format ;
- [ ] utiliser l'application sans compte, sans backend et sans connexion après la première visite.

---

## 18. Indicateurs de succès

Mesurés sans collecte de données personnelles (compteurs agrégés, signaux publics) :

| Horizon | Indicateurs |
|---|---|
| 6 mois après v0.1 | 1 000 étoiles GitHub · 20 contributeurs · 4 langues complètes · 5 formateurs utilisant l'outil en cours |
| 12 mois | 30 labs communautaires · 9 langues · adoption documentée dans 10 établissements sur au moins 3 continents |
| 24 mois | Intégration dans un programme de formation reconnu · format `.attackgraph` utilisé par un projet tiers |

---

## 19. Hors périmètre

- Visualisation 3D.
- Base de CVE réelles et scoring CVSS.
- Connexion à des infrastructures réelles, scans, agents.
- Comptes utilisateurs obligatoires, fonctionnalités payantes réservées.
- Classement global (leaderboard) public avant d'avoir une modération adaptée.

---

## 20. Risques et parades

| Risque | Impact | Parade |
|---|---|---|
| Modèle trop simpliste → enseigne des idées fausses | Perte de crédibilité auprès des experts | Revue experte du catalogue, tests golden, explications visibles, section « limites du modèle » dans chaque template |
| Périmètre qui explose | Projet jamais fini | Jalons avec critères de sortie, hors périmètre explicite, RFC |
| Détournement perçu comme outil offensif | Réputation, blocages | Frontière simulation/réel stricte, pas de procédures, communication claire |
| Traductions de mauvaise qualité | Confusion pédagogique | Coordinateurs de langue, glossaire, seuil de 90 % avant publication |
| Dépendance à un seul mainteneur | Abandon | Gouvernance, documentation d'architecture, co-mainteneurs dès la v0.3 |
| Lab partagé contenant des infos réelles sensibles | Fuite d'informations | Aucun envoi serveur, avertissement, données restant dans l'URL / le fichier |

---

## 21. Glossaire

| Terme | Définition |
|---|---|
| **Attack surface** | Ensemble des points par lesquels un attaquant peut interagir avec le système |
| **Attack path** | Suite d'étapes menant d'un point d'entrée à un objectif |
| **Blast radius** | Tout ce qu'un attaquant peut atteindre après avoir compromis un élément |
| **Choke point** | Élément présent sur tous les chemins vers un objectif ; le protéger coupe tous les chemins |
| **Capability** | Ce que l'attaquant possède à un moment de la simulation |
| **Crown jewel** | Actif le plus précieux pour l'organisation |
| **Assumed breach** | Hypothèse où l'attaquant est déjà présent sur un élément interne |
| **Lateral movement** | Déplacement d'un élément compromis vers un autre |
| **Defense in depth** | Superposition de contrôles pour qu'une défaillance unique ne suffise pas |

---

## 22. Résultat attendu

> **Je vois mon infrastructure.**
> **Je vois ce qui est exposé.**
> **Je vois comment une attaque se déplace, et pourquoi.**
> **Je vois ce qu'elle peut atteindre.**
> **Je change l'architecture.**
> **Je vois si ma défense fonctionne vraiment.**
>
> **Dans ma langue, sur mon appareil, où que je sois.**

C'est le cœur de **PCYBOX AttackGraph**.
