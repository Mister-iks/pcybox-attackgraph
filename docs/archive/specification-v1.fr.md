# Cyber Attack Surface Lab

## Cahier des charges : MVP v1.0

**Nom du projet :** Cyber Attack Surface Lab  
**Type :** Laboratoire interactif de cybersécurité open source  
**Plateforme cible :** Web  
**Statut :** Spécification fonctionnelle et technique  
**Version :** 1.0  
**Licence recommandée :** MIT ou Apache-2.0  
**Langue initiale :** Anglais  
**Langues futures :** Français, autres langues

---

## 1. Vision du projet

Cyber Attack Surface Lab est une plateforme web interactive permettant de **visualiser, construire et expérimenter avec une infrastructure informatique fictive** afin de comprendre son exposition aux attaques.

L'objectif n'est pas de créer un outil offensif destiné à attaquer des systèmes réels, mais un **laboratoire pédagogique et de simulation** dans lequel l'utilisateur peut :

- construire une architecture ;
- ajouter des machines, services, utilisateurs et composants réseau ;
- visualiser les flux ;
- identifier les surfaces d'exposition ;
- introduire des vulnérabilités simulées ;
- lancer des scénarios d'attaque contrôlés ;
- observer la propagation d'une attaque ;
- analyser les chemins d'attaque ;
- appliquer des mesures de défense ;
- comparer l'état avant/après remédiation.

Le produit doit donner l'impression de manipuler un **organisme numérique vivant**.

---

# 2. Problématique

Les concepts suivants sont souvent difficiles à comprendre avec des diagrammes statiques :

- attack surface ;
- attack path ;
- lateral movement ;
- segmentation réseau ;
- exposition Internet ;
- privilèges ;
- vulnérabilités ;
- défense en profondeur ;
- blast radius ;
- compromission d'un actif ;
- propagation d'une attaque.

Cyber Attack Surface Lab doit transformer ces concepts en une **expérience visuelle et interactive**.

---

# 3. Objectifs

## 3.1 Objectif principal

Créer une expérience web dans laquelle un utilisateur peut comprendre intuitivement :

> **"Comment une faiblesse initiale peut permettre à une attaque de traverser une infrastructure."**

## 3.2 Objectifs secondaires

Le produit doit permettre de :

1. visualiser une infrastructure ;
2. comprendre ses dépendances ;
3. identifier les actifs exposés ;
4. visualiser les chemins d'attaque ;
5. simuler des scénarios contrôlés ;
6. visualiser la progression d'une compromission ;
7. comprendre le rôle des contrôles de sécurité ;
8. comparer plusieurs architectures ;
9. partager une simulation ;
10. exporter/importer un laboratoire.

---

# 4. Public cible

## Primaire

- étudiants en cybersécurité ;
- développeurs ;
- ingénieurs sécurité ;
- pentesters ;
- analystes SOC ;
- architectes sécurité ;
- enseignants ;
- formateurs.

## Secondaire

- entreprises ;
- écoles et universités ;
- communautés cyber ;
- conférences ;
- centres de formation ;
- équipes AppSec / DevSecOps.

---

# 5. Proposition de valeur

Cyber Attack Surface Lab doit répondre à une question simple :

> **"Si cette machine est compromise, jusqu'où l'attaquant peut-il aller ?"**

L'utilisateur doit pouvoir répondre à cette question **en voyant l'attaque se dérouler devant lui**.

---

# 6. Expérience utilisateur

## 6.1 Écran principal

L'interface doit être composée de :

```text
┌───────────────────────────────────────────────────────────────┐
│ Cyber Attack Surface Lab                  ▶ Run Attack        │
├──────────────┬────────────────────────────────────────────────┤
│              │                                                │
│ Components   │                                                │
│              │             LABORATORY                         │
│ 🖥 Server    │                                                │
│ 💻 Client    │          [Web]──────[DB]                       │
│ 🔥 Firewall  │            │          │                        │
│ ☁ Cloud     │          [API]────[Internal]                   │
│ 👤 User      │                                                │
│              │                                                │
├──────────────┴────────────────────────────────────────────────┤
│ Attack Path │ Exposure │ Risk │ Events │ Timeline             │
└───────────────────────────────────────────────────────────────┘
```

---

# 7. Modèle de données du laboratoire

Chaque laboratoire est composé d'un graphe.

## 7.1 Node

Un node représente un actif ou composant.

Types minimum :

- Internet;
- router;
- firewall;
- workstation;
- laptop;
- server;
- web server;
- API server;
- database;
- cloud service;
- container;
- Kubernetes cluster;
- IoT device;
- user;
- administrator;
- domain controller;
- VPN;
- jump host.

Chaque node possède :

```json
{
  "id": "server-01",
  "type": "server",
  "name": "Web Server",
  "zone": "dmz",
  "os": "linux",
  "services": [],
  "vulnerabilities": [],
  "credentials": [],
  "privileges": [],
  "securityControls": []
}
```

---

# 8. Connexions

Les nodes peuvent être reliés.

Exemple :

```text
Internet
   │
   ▼
Firewall
   │
   ▼
Web Server
   │
   ▼
Application Server
   │
   ▼
Database
```

Une connexion doit pouvoir représenter :

- réseau ;
- protocole ;
- port ;
- direction ;
- confiance ;
- chiffrement ;
- ACL ;
- firewall rule ;
- dépendance applicative.

Exemple :

```json
{
  "source": "web-01",
  "target": "db-01",
  "protocol": "tcp",
  "port": 5432,
  "encrypted": true,
  "allowed": true
}
```

---

# 9. Zones de sécurité

Le laboratoire doit permettre de créer des zones :

- Internet ;
- DMZ ;
- Internal;
- Restricted;
- Management;
- Production;
- Development;
- Cloud;
- Third Party.

Les zones doivent être visuellement distinctes.

---

# 10. Assets

Chaque asset possède un niveau d'importance.

Exemple :

```text
Public Web Server
        ↓
Internal API
        ↓
Customer Database
        ↓
Identity Provider
        ↓
Domain Administrator
```

Attributs :

- criticality ;
- confidentiality ;
- integrity ;
- availability ;
- business value.

---

# 11. Services

Chaque machine peut exposer plusieurs services.

Exemple :

```text
Web Server

443/tcp HTTPS
22/tcp SSH
8080/tcp HTTP
```

Chaque service peut avoir :

- port ;
- protocole ;
- version ;
- authentication ;
- encryption ;
- exposure ;
- associated vulnerability.

---

# 12. Vulnérabilités simulées

Le système doit pouvoir associer des vulnérabilités fictives ou éducatives à des composants.

Exemples :

- weak authentication ;
- exposed admin panel ;
- outdated software ;
- insecure configuration ;
- default credentials ;
- excessive privileges ;
- missing MFA ;
- unrestricted network access ;
- vulnerable dependency.

Le MVP peut utiliser des vulnérabilités prédéfinies plutôt qu'une base CVE complète.

Une version ultérieure pourra intégrer des données CVE publiques.

---

# 13. Utilisateurs et identités

Le laboratoire doit représenter les identités.

Types :

- anonymous user ;
- normal user ;
- developer ;
- service account ;
- administrator ;
- domain administrator.

Attributs :

- privileges ;
- groups ;
- credentials ;
- MFA ;
- access rights.

---

# 14. Attack Surface

Le système doit calculer une représentation pédagogique de la surface d'attaque.

Exemples de facteurs :

```text
Internet Exposure
Open Ports
Weak Authentication
Missing MFA
Vulnerabilities
Excessive Privileges
Flat Network
Sensitive Assets
```

Le résultat peut être représenté par :

```text
ATTACK SURFACE

████████████████░░ 82%
```

Important : ce score est un **indicateur pédagogique du laboratoire**, pas une mesure universelle de risque.

---

# 15. Attack Paths

Le moteur doit identifier les chemins possibles entre :

```text
Entry Point
      ↓
Compromised Asset
      ↓
Privilege Escalation
      ↓
Lateral Movement
      ↓
Target Asset
```

Exemple :

```text
Internet
   ↓
Web Server
   ↓
API Server
   ↓
Internal Server
   ↓
Database
```

Le chemin actif doit être animé.

---

# 16. Attack Simulation Engine

Le MVP doit proposer des scénarios contrôlés.

### Scenario 1 : Exposed Web Server

```text
Internet
   ↓
Exposed Web Server
   ↓
Application
   ↓
Database
```

### Scenario 2 : Credential Reuse

```text
User
 ↓
Workstation
 ↓
Shared Credentials
 ↓
Server
```

### Scenario 3 : Lateral Movement

```text
Compromised Workstation
        ↓
Internal Server
        ↓
Admin Workstation
        ↓
Critical Server
```

### Scenario 4 : Missing Segmentation

```text
Internet
   ↓
DMZ
   ↓
Internal Network
   ↓
Critical Assets
```

### Scenario 5 : Privilege Escalation

```text
Low Privilege User
        ↓
Misconfiguration
        ↓
Administrator
        ↓
Critical Asset
```

Les scénarios sont purement simulés dans le graphe.

Aucune exploitation réelle ne doit être exécutée.

---

# 17. Visualisation de l'attaque

Pendant une simulation :

```text
00:00  Initial access
00:03  Web server compromised
00:07  Credential discovered
00:12  Internal server reached
00:17  Privilege escalation
00:21  Database accessed
```

Chaque événement doit apparaître dans une timeline.

---

# 18. Attack Replay

Après une simulation, l'utilisateur doit pouvoir :

- pause ;
- play ;
- speed x1 ;
- speed x2 ;
- speed x4 ;
- revenir au début ;
- avancer événement par événement.

---

# 19. Blast Radius

Après compromission d'un asset :

> **"What can this compromise reach?"**

Le système doit mettre en évidence :

- assets directement accessibles ;
- assets indirectement accessibles ;
- données sensibles ;
- identités ;
- zones atteignables.

Exemple :

```text
COMPROMISED

Web Server

Can Reach:

✓ API
✓ Internal Server
✓ Database
✗ Admin Network
✗ Backup Network
```

---

# 20. Défense

L'utilisateur doit pouvoir ajouter des contrôles.

Exemples :

- firewall ;
- network segmentation ;
- MFA ;
- EDR ;
- WAF ;
- IDS ;
- IPS ;
- least privilege ;
- encryption ;
- jump host ;
- Zero Trust policy ;
- monitoring.

---

# 21. Attack vs Defense

Le système doit permettre une comparaison.

### Avant

```text
Internet
 ↓
Web
 ↓
Internal
 ↓
Database
```

### Après segmentation

```text
Internet
 ↓
WAF
 ↓
DMZ
 ↓
Firewall
 ↓
Internal
 ↓
Database
```

L'utilisateur relance le scénario.

Résultat :

```text
ATTACK STOPPED

Reason:
Network segmentation prevented lateral movement.
```

---

# 22. Security Controls Lab

Un mode spécifique permettra d'expérimenter avec les contrôles.

Exemple :

```text
MFA
[ OFF ] ──────── [ ON ]

Segmentation
[ OFF ] ──────── [ ON ]

EDR
[ OFF ] ──────── [ ON ]
```

Puis :

**Run Attack**

Le résultat change selon l'architecture.

---

# 23. Scoring pédagogique

Le laboratoire peut calculer plusieurs indicateurs :

```text
Exposure            72
Attack Paths        8
Critical Assets     4
Privilege Risk      61
Segmentation        30
Defense Coverage    42
```

Ces indicateurs doivent être explicitement présentés comme des **métriques de simulation**.

---

# 24. Mode "Build Your Own Lab"

L'utilisateur doit pouvoir créer son propre scénario.

Workflow :

```text
Create Lab
   ↓
Add Assets
   ↓
Connect Assets
   ↓
Configure Services
   ↓
Add Vulnerabilities
   ↓
Add Security Controls
   ↓
Define Attack Scenario
   ↓
Run Simulation
```

---

# 25. Templates

Le MVP doit proposer plusieurs laboratoires prêts à l'emploi.

### Template 01

**Small Corporate Network**

### Template 02

**Web Application**

### Template 03

**Banking Environment**

### Template 04

**Cloud Architecture**

### Template 05

**Active Directory**

### Template 06

**Hospital Network**

### Template 07

**Industrial Network**

### Template 08

**Zero Trust Architecture**

---

# 26. Mode "What If?"

Fonctionnalité majeure.

L'utilisateur peut modifier une seule variable.

Exemple :

```text
What if MFA is enabled?

[ Run Simulation ]
```

Le système compare :

```text
BEFORE

Attack Success: YES
Attack Path: 6 steps

AFTER

Attack Success: NO
Attack Path: blocked at authentication
```

---

# 27. Mode Challenge

Ajouter un mode gamifié.

Exemple :

> **MISSION 01 : Protect the Database**

Objectif :

```text
Prevent the attacker from reaching DB-01.
```

Budget :

```text
Security Budget: $100
```

Contrôles disponibles :

```text
Firewall       $20
MFA            $30
WAF            $25
EDR            $35
Segmentation   $40
```

L'utilisateur choisit ses contrôles puis lance l'attaque.

---

# 28. Niveau de difficulté

### Beginner

Concepts simples.

### Intermediate

Plusieurs chemins.

### Advanced

Multiples assets, identités et dépendances.

### Expert

Architecture complexe, chemins multiples, défense en profondeur.

---

# 29. Architecture technique

## Frontend

Recommandation :

- React ;
- TypeScript ;
- Vite ;
- Tailwind CSS ;
- React Flow ou moteur de graphe équivalent ;
- WebGL / Three.js pour les visualisations 3D ;
- Zustand ou équivalent pour l'état.

## Backend

Le MVP peut fonctionner **sans backend**.

Architecture :

```text
Browser
   │
   ├── UI
   ├── Graph Engine
   ├── Simulation Engine
   ├── Scoring Engine
   └── Scenario Engine
```

Le backend sera ajouté ultérieurement pour :

- comptes ;
- sauvegarde cloud ;
- partage ;
- leaderboard ;
- collaboration ;
- analytics.

---

# 30. Simulation Engine

Le moteur doit être indépendant de l'interface.

Architecture :

```text
Scenario
   ↓
Graph
   ↓
Rules Engine
   ↓
Attack Engine
   ↓
Event Stream
   ↓
Visualization
```

Exemple :

```typescript
type AttackEvent = {
  timestamp: number;
  source: string;
  target: string;
  technique: string;
  result: "success" | "blocked";
  reason?: string;
};
```

---

# 31. Rule Engine

Le moteur doit fonctionner avec des règles déterministes.

Exemple conceptuel :

```text
IF
source.compromised == true
AND
connection.allowed == true
AND
target.exposure > threshold

THEN
target.status = "reachable"
```

Les règles doivent être faciles à étendre.

---

# 32. MITRE ATT&CK

Une version ultérieure pourra mapper les événements simulés à MITRE ATT&CK.

Exemple :

```text
Initial Access
     ↓
Execution
     ↓
Credential Access
     ↓
Discovery
     ↓
Lateral Movement
     ↓
Privilege Escalation
```

Le MVP peut afficher les catégories sans reproduire les procédures offensives réelles.

---

# 33. Visual Design

Direction artistique :

**Cybersecurity command center + scientific laboratory.**

Principes :

- dark interface ;
- graph lumineux ;
- animations fluides ;
- minimisation du texte ;
- forte hiérarchie visuelle ;
- interactions immédiates.

Le produit doit être spectaculaire dans une capture vidéo de 10 secondes.

---

# 34. Interaction

Les actions principales doivent être possibles par :

- drag & drop ;
- click ;
- double click ;
- context menu ;
- keyboard shortcuts ;
- sliders ;
- toggles.

Exemple :

```text
Drag "Web Server"
        ↓
Drop on canvas
        ↓
Configure
        ↓
Connect to Database
        ↓
Run Attack
```

---

# 35. Export / Import

Format principal :

```text
.json
```

Exemple :

```json
{
  "version": "1.0",
  "name": "Corporate Network",
  "nodes": [],
  "edges": [],
  "scenarios": [],
  "controls": []
}
```

Fonctions :

- Export Lab;
- Import Lab;
- Duplicate Lab;
- Reset Lab.

---

# 36. Shareable Labs

Version ultérieure :

```text
https://cyberlab.dev/lab/abc123
```

Une personne ouvre le lien et peut immédiatement explorer la simulation.

Objectif :

**zéro installation pour consulter un laboratoire partagé.**

---

# 37. GitHub

Le dépôt doit être conçu pour devenir un projet open source sérieux.

Structure recommandée :

```text
cyber-attack-surface-lab/
│
├── apps/
│   └── web/
│
├── packages/
│   ├── graph-engine/
│   ├── simulation-engine/
│   ├── scenario-engine/
│   ├── scoring-engine/
│   └── ui/
│
├── scenarios/
│
├── templates/
│
├── docs/
│
├── examples/
│
├── tests/
│
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── LICENSE
└── README.md
```

---

# 38. README GitHub

Le README doit commencer par une démonstration.

```text
# Cyber Attack Surface Lab

> Build. Attack. Defend. Learn.

Interactive cybersecurity laboratories
running entirely in your browser.

[Live Demo] [Documentation] [Contribute]
```

Ajouter :

- GIF ;
- screenshots ;
- architecture ;
- quick start ;
- roadmap ;
- contribution guide.

---

# 39. Performance

Objectif :

- chargement initial < 3 secondes sur une connexion correcte ;
- simulation fluide ;
- 100+ nodes dans le MVP ;
- animations à ~60 FPS lorsque possible ;
- aucune dépendance serveur obligatoire pour le mode local.

---

# 40. Sécurité

Le projet doit être conçu avec une séparation claire entre :

### Simulation

Autorisé :

- graphes ;
- règles ;
- événements fictifs ;
- données synthétiques ;
- scénarios pédagogiques.

### Systèmes réels

Le MVP ne doit pas :

- scanner automatiquement Internet ;
- lancer des exploits ;
- collecter des credentials réels ;
- attaquer des IP réelles ;
- automatiser du pentesting contre des tiers.

Le laboratoire doit rester **sandboxed et simulation-first**.

---

# 41. Accessibilité

Prévoir :

- navigation clavier ;
- contraste suffisant ;
- labels accessibles ;
- réduction des animations ;
- alternative textuelle aux visualisations ;
- responsive design.

---

# 42. Analytics locales

Le MVP ne nécessite pas de collecte utilisateur.

Les métriques peuvent être calculées localement :

- simulation duration ;
- scenario completion ;
- attack success ;
- controls deployed ;
- number of nodes.

Aucune donnée personnelle n'est nécessaire.

---

# 43. Roadmap

## Phase 0 : Prototype

Durée cible : 3 à 5 jours.

Livrables :

- canvas ;
- nodes ;
- edges ;
- drag & drop ;
- première simulation ;
- animation d'un attack path.

---

## Phase 1 : MVP

Durée cible : 1 à 2 semaines.

Fonctionnalités :

- graph engine ;
- asset model ;
- services ;
- vulnerabilities ;
- zones ;
- attack paths ;
- attack simulation ;
- timeline ;
- scoring ;
- 5 templates ;
- export/import JSON.

---

## Phase 2 : Advanced Lab

- identity model ;
- privilege escalation ;
- lateral movement ;
- blast radius ;
- security controls ;
- what-if mode ;
- challenge mode ;
- MITRE ATT&CK mapping.

---

## Phase 3 : 3D

Ajouter une visualisation 3D :

```text
Network
   ↓
3D Infrastructure
   ↓
Attack Packets
   ↓
Compromise Visualization
```

Technologies possibles :

- Three.js ;
- WebGL ;
- WebGPU.

---

## Phase 4 : Collaborative

Ajouter :

- partage de laboratoire ;
- comptes ;
- collaboration temps réel ;
- commentaires ;
- leaderboard ;
- classrooms.

---

# 44. Fonctionnalité "wow"

Le produit doit avoir une démonstration principale de moins de 30 secondes.

### Démo

1. L'utilisateur ouvre un réseau.
2. Il clique sur **Run Attack**.
3. Un node Internet devient rouge.
4. L'attaque se déplace vers le Web Server.
5. Le serveur devient compromis.
6. Une ligne lumineuse se dirige vers l'API.
7. Puis vers la base de données.
8. La base devient rouge.
9. Le panneau affiche :

```text
DATABASE COMPROMISED

Attack Path:
Internet
→ Web
→ API
→ Database

4 steps
3 vulnerable paths
1 critical asset
```

10. L'utilisateur active **Network Segmentation**.
11. Il relance l'attaque.
12. L'animation s'arrête sur le firewall.

```text
ATTACK BLOCKED

Network segmentation
prevented lateral movement.
```

C'est cette séquence qui doit devenir le GIF principal du projet.

---

# 45. Critères d'acceptation du MVP

Le MVP est considéré comme fonctionnel lorsque l'utilisateur peut :

- [ ] créer un laboratoire ;
- [ ] ajouter au moins 10 types d'assets ;
- [ ] connecter les assets ;
- [ ] définir des zones ;
- [ ] ajouter des services ;
- [ ] ajouter des vulnérabilités simulées ;
- [ ] définir une entrée attaquante ;
- [ ] lancer un scénario ;
- [ ] voir l'attaque se propager ;
- [ ] voir les événements dans une timeline ;
- [ ] identifier le chemin d'attaque ;
- [ ] voir le blast radius ;
- [ ] ajouter un contrôle de sécurité ;
- [ ] relancer l'attaque ;
- [ ] observer le changement ;
- [ ] exporter le laboratoire ;
- [ ] importer un laboratoire ;
- [ ] utiliser l'application sans backend.

---

# 46. Definition of Done

Une fonctionnalité est terminée lorsqu'elle possède :

- implémentation ;
- tests ;
- gestion des erreurs ;
- interface ;
- documentation ;
- exemple ;
- compatibilité avec l'architecture du moteur.

---

# 47. Principes produit

Le projet doit suivre cinq principes.

### 1. Visual first

Montrer avant d'expliquer.

### 2. Interactive first

L'utilisateur doit manipuler les concepts.

### 3. Simulation first

Aucune action offensive réelle nécessaire.

### 4. Open source first

Le moteur doit être réutilisable.

### 5. Shareability first

Une simulation doit pouvoir être montrée facilement.

---

# 48. Vision long terme

Cyber Attack Surface Lab peut évoluer d'une simple application vers une **plateforme open source de simulation de cybersécurité**.

Vision :

```text
                 CYBER ATTACK SURFACE LAB
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       Learn            Build            Simulate
          │                │                │
       Courses          Labs             Attacks
          │                │                │
          └────────────────┼────────────────┘
                           │
                      Open Source
                           │
                 ┌─────────┴─────────┐
                 │                   │
              Students            Experts
                 │                   │
                 └─────────┬─────────┘
                           │
                       Community
```

À terme, le projet doit pouvoir devenir :

> **"The interactive playground for cybersecurity architecture and attack paths."**

---

# 49. Première version à construire

Pour éviter de transformer le projet en usine à gaz, la première release publique doit rester très focalisée.

### V0.1

**One network. One attack. One defense.**

Scénario :

```text
Internet
   ↓
Web Server
   ↓
API
   ↓
Database
```

Puis :

```text
Attacker
   ↓
Web Server
   ↓
API
   ↓
Database
```

Ajout :

```text
Firewall
```

Résultat :

```text
Attacker
   ↓
Web Server
   ↓
🛑 FIREWALL
```

Si cette expérience est extrêmement fluide, visuelle et satisfaisante, elle constitue la base du reste du produit.

---

# 50. Résultat attendu

Le produit final doit donner à l'utilisateur une compréhension intuitive de la cybersécurité :

> **"Je peux voir mon infrastructure.**
>
> **Je peux voir ce qui est exposé.**
>
> **Je peux voir comment une attaque se déplace.**
>
> **Je peux voir ce qu'elle peut atteindre.**
>
> **Je peux modifier l'architecture.**
>
> **Je peux voir si ma défense fonctionne."**

C'est le cœur de **Cyber Attack Surface Lab**.
