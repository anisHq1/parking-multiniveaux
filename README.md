# ParkFlow — Système de gestion de parking multi-niveaux

**Projet de graduation — Baccalauréat en informatique**  
Université du Québec en Outaouais | Hiver 2026  
Réalisé par : **Anis Benahmed**  
Encadré par : Mme Ben Yochret Sabrine

---

## Description

ParkFlow est une application web complète de gestion intelligente 
d'un parking multi-niveaux (4 étages, 100 places).

## Fonctionnalités

- Authentification sécurisée (JWT + bcrypt)
- Plan parking interactif en temps réel
- Système de demandes et approbation admin
- Tarification différenciée par type de place
- Tableau de bord avec statistiques
- Notifications en temps réel

## Tarifs

| Type | Prix/heure |
|------|-----------|
| Standard | 5,00 $ |
| Handicap | 6,99 $ |
| Électrique | 8,00 $ |
| VIP | 10,99 $ |

## Stack technique

- **Frontend** : React 18 + Vite + Chart.js
- **Backend** : Node.js + Express
- **Base de données** : PostgreSQL 18
- **Auth** : JWT + bcrypt

## Installation

```bash
# 1. Cloner le repo
git clone https://github.com/anisHq1/parking-multiniveaux.git
cd parking-multiniveaux

# 2. Base de données (pgAdmin)
# Exécuter : backend/src/sql/patch_only.sql

# 3. Backend
cd backend && npm install && npm run dev

# 4. Frontend
cd frontend && npm install && npm run dev
```

## Accès

- **Interface admin** : http://localhost:5173
- **Interface client** : http://localhost:5173/client

## Compte admin

Après inscription :
```sql
UPDATE users SET role = 'admin' WHERE email = 'votre@email.com';
```