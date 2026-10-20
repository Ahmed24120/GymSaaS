# GymSaaS — Plateforme de gestion de salles de sport (Nouakchott, Mauritanie)

> Fichier de référence unique du projet. À lire en entier avant toute tâche (humain ou IA : Cursor, Codex, Claude Code…).
> Sources : « وصف مشروع تطبيق إدارة الصالات الرياضية » + analyse technique du second document.

## 0. Légende et règles de ce fichier

| Marque | Signification |
|---|---|
| ✅ | Point issu des documents, validé, à respecter tel quel |
| ⚠️ | Correction mineure appliquée (sans changer la vision du projet) |
| ❓ | Point complexe : **NE PAS l'implémenter** tant que le propriétaire n'a pas répondu (voir section 11) |

**Règles pour l'IA / le développeur**
1. Ne jamais modifier la vision, le périmètre ou le modèle économique sans validation.
2. Ne jamais contourner les règles de la section 5 (« Règles non négociables »).
3. Devant un point marqué ❓ ou toute ambiguïté complexe : **s'arrêter et poser la question** au propriétaire (« Voulez-vous ce point : oui/non ? ») au lieu de décider seul.
4. Construire par petites étapes testées, jamais le projet entier d'un coup.
5. Chaque fonctionnalité livrée = code + tests + mise à jour de ce fichier si une règle change.
6. **Langue de réponse : l'IA répond TOUJOURS en arabe (العربية)**, voir le bloc ci-dessous.

### Instruction de langue pour l'IA (Codex / Cursor / Claude Code) ✅

```text
قاعدة إلزامية: أجب دائمًا باللغة العربية الفصحى المبسطة، في كل ردودك:
الشرح، الأسئلة، ملخصات العمل، رسائل الأخطاء الموجّهة لي، وطلبات التأكيد.
استثناءات (تبقى بالإنجليزية): الكود، أسماء المتغيرات والدوال والجداول والأعمدة،
أسماء الملفات، الأوامر في الطرفية، ورسائل الـ commit.
التعليقات داخل الكود: بالعربية عند الحاجة لشرح منطق مهم.
عند مواجهة نقطة معقدة أو مُعلَّمة بـ ❓ توقّف واسألني بالعربية:
"هل تريد هذه الميزة أم لا؟" ولا تنفّذ قبل ردّي.
واجهة التطبيق نفسها تدعم العربية (RTL) والفرنسية.
```

> Astuce : copier ce bloc aussi dans un fichier `AGENTS.md` (Codex) ou `.cursorrules` (Cursor) à la racine du projet, pour que la règle soit lue automatiquement à chaque session.

---

## 1. Vision ✅

- Plateforme **SaaS multi-salles** : une seule application, des dizaines de salles de sport indépendantes.
- Marché de départ : **Nouakchott**, puis autres villes mauritaniennes, puis Afrique.
- Remplace cahiers papier / Excel par un suivi numérique des **abonnements, paiements, présences, revenus**.
- Chaque salle a son espace privé ; **aucune salle ne voit les données d'une autre**.
- Chaque membre a un compte personnel avec **QR code d'entrée**.
- Objectif final : une plateforme complète de gestion, pas seulement un scanner QR.

## 2. Acteurs et permissions ✅

| Rôle | Interface | Peut faire |
|---|---|---|
| `super_admin` (propriétaire plateforme) | Web | Créer/suspendre des salles, suivre leurs abonnements SaaS, stats globales, gérer les publicités |
| `gym_owner` (propriétaire de salle) | Web + mobile | Tout sur sa salle : membres, personnel, tarifs, paiements, revenus, annonces, journal d'audit |
| `receptionist` (réceptionniste) | Mobile | Inscrire membres, activer/renouveler, encaisser, scanner QR — **selon permissions accordées** |
| `member` (membre) | Mobile | Voir son QR, son abonnement, ses visites, notifications, annonces, objectifs |

Exemple de permission fine : le réceptionniste peut scanner et inscrire, mais **ne peut ni changer les tarifs ni supprimer un paiement**.

⚠️ Les permissions sont stockées en base (table de permissions par membre du personnel) et **vérifiées côté serveur (RLS / fonctions)**, jamais seulement dans l'interface.

## 3. Périmètre par phases

### Phase 1 — MVP ✅ (c'est ce qu'on construit en premier)
- Multi-salles + isolation des données
- Rôles : super_admin, gym_owner, receptionist, member
- Gestion des membres (photo, infos, recherche par nom/téléphone)
- Types d'abonnements (1 mois, 3 mois, 1 an, durée personnalisée), activation, renouvellement, calcul automatique de la date de fin
- Enregistrement manuel des paiements (Espèces, Bankily, Masrvi, Sedad) + reçu
- QR dynamique + scan + enregistrement automatique de la visite
- Tableau de bord propriétaire (membres, actifs/expirés/bientôt expirés, visites du jour, revenus jour/mois, nouveaux/renouvellements)
- Gestion du personnel + permissions + journal d'audit
- Import Excel de la liste des membres
- Notifications d'expiration, annonces de la salle

### Phase 2 ✅
- Membres inactifs (7/14/30 jours), bouton WhatsApp, objectifs hebdomadaires + séries (streak)
- Publicités commerciales dans l'app membre (gérées par le super_admin)
- Gestion des filiales (branches)
- Pause d'abonnement selon la politique de la salle
- Mode hors-ligne (voir section 8)

### Phase 3 ✅
- Paiement/renouvellement en ligne dans l'app
- Recherche de salles proches + comparaison de prix + demande d'adhésion
- Programmes d'entraînement, vidéos, réservation de cours/coachs
- Récompenses, analyses avancées
- Autres villes et pays

## 4. Stack technique

| Couche | Choix | Statut |
|---|---|---|
| Mobile (membres + réceptionnistes) | **React Native + Expo** | ⚠️ Le doc 1 disait Flutter, le doc 2 recommande React Native. **On retient React Native/Expo** (compatible IA, un seul langage JS/TS). Confirmer en ❓ D1 |
| Web (super_admin + propriétaire) | **Next.js (App Router) + TypeScript + Tailwind** | ✅ |
| Backend / BDD / Auth / Storage | **Supabase (PostgreSQL + RLS + Edge Functions)** | ✅ |
| Langage | **TypeScript partout** | ⚠️ ajouté (moins de bugs, meilleur pour l'IA) |
| Langues | **Arabe (RTL) + Français** dès le début | ⚠️ ajouté : à prévoir dans l'UI dès le départ |

## 5. Règles non négociables

### 5.1 Multi-tenant (isolation des salles)
- Toute table métier contient `gym_id` **NOT NULL**.
- **RLS activé sur 100 % des tables** ; aucune table sans politique.
- Aucune requête ne doit dépendre d'un `gym_id` envoyé par le client sans vérification serveur : le `gym_id` est déduit de l'utilisateur authentifié.
- Test automatisé obligatoire : un utilisateur de la salle A ne peut **lire, modifier ni supprimer** aucune donnée de la salle B.
- La clé `service_role` n'est **jamais** dans une application mobile ou dans le code frontend.

### 5.2 Argent
- Montants en **entiers** (MRU, nouvelle ouguiya), jamais en flottants.
- Un paiement **n'est jamais supprimé** : annulation = écriture d'annulation tracée (soft-cancel avec motif et auteur).
- Chaque paiement enregistre : montant, méthode, membre, abonnement, **employé auteur**, date/heure.
- Seuls les rôles autorisés peuvent annuler/modifier un paiement.

### 5.3 Audit ✅
Journal immuable (insertion seule) de : activation d'abonnement, paiement, modification d'un membre, annulation/modification d'abonnement, changement de tarif. Champs : qui, quoi, avant/après, quand.

### 5.4 Données personnelles
- Photos et infos personnelles : accès restreint par RLS, stockage privé (pas d'URL publique permanente).
- Un membre ne voit que ses propres données.
- ❓ Cadre légal local (voir D8).

### 5.5 Temps et devise
- Stockage en UTC (`timestamptz`), affichage en fuseau **Africa/Nouakchott**.
- Les dates de fin d'abonnement sont calculées **côté serveur**, jamais côté client.

### 5.6 Expérience terminal
- Le réceptionniste doit pouvoir travailler sans formation technique : écrans simples, gros boutons, résultat **vert/rouge** immédiat.
- Toujours une **alternative au QR** : recherche par nom ou téléphone.
- Pensé pour téléphones modestes et connexion faible.

## 6. Modèle de données (base de départ)

Toutes les tables ci-dessous (sauf `gyms`, `platform_subscriptions`, `ads`) portent `gym_id`.

| Table | Rôle | Champs clés |
|---|---|---|
| `gyms` | Une salle cliente | name, city, status (trial/active/suspended), created_at |
| `branches` | Filiales d'une salle ⚠️ créée dès le MVP, 1 branche par défaut | gym_id, name |
| `profiles` | Compte utilisateur (lié à `auth.users`) | user_id, full_name, phone, language |
| `gym_staff` | Personnel + rôle + permissions | gym_id, user_id, branch_id, role, permissions (jsonb) |
| `members` | Membres d'une salle ⚠️ séparés du compte : un membre peut exister avant d'avoir un compte | gym_id, branch_id, user_id (nullable), full_name, phone, photo_path, status |
| `plans` | Types d'abonnements | gym_id, name, duration_days, price_mru, active |
| `subscriptions` | Abonnements des membres | gym_id, member_id, plan_id, start_date, end_date, status (active/expired/paused/cancelled) |
| `payments` | Paiements | gym_id, member_id, subscription_id, amount_mru, method (cash/bankily/masrvi/sedad), recorded_by, status, cancelled_by/reason |
| `visits` | Entrées | gym_id, member_id, scanned_by, branch_id, entered_at, method (qr/manual), source (online/offline_sync) |
| `announcements` | Annonces salle | gym_id, title, body, published_at |
| `notifications` | Notifications | gym_id, member_id, type, sent_at |
| `audit_logs` | Journal d'audit | gym_id, actor_id, action, entity, before, after, at |
| `platform_subscriptions` | Abonnement SaaS de chaque salle à la plateforme | gym_id, plan, price_mru (3 000 par défaut), period, status |
| `ads` | Publicités (super_admin) | advertiser, image, link, start/end, status |
| `member_goals` (phase 2) | Objectifs hebdo + séries | gym_id, member_id, target_per_week |

⚠️ **Pourquoi `members` ≠ `profiles`** : le doc 2 mettait un seul `gym_id` dans `profiles`. Cela bloque (a) un membre inscrit à la réception sans compte, (b) un membre dans deux salles, (c) les filiales. La séparation évite une refonte douloureuse plus tard.

## 7. Flux clés

### 7.1 Entrée par QR (flux en ligne) ✅
1. Le membre ouvre l'app → QR dynamique affiché (renouvelé toutes les ~30 s, barre de progression/animation visible).
2. Le réceptionniste scanne.
3. Le **serveur** vérifie : signature du jeton, non-expiration, même salle, abonnement actif.
4. Écran : photo + nom + statut + date de fin. **Vert** = entrée enregistrée automatiquement ; **Rouge** = adhésion invalide.
5. Le réceptionniste compare la photo à la personne présente.

### 7.2 Jeton QR ⚠️ (correction importante)
Le doc 2 propose `user_id + timestamp` en clair : **n'importe qui peut le fabriquer**. Règle retenue :
- Le QR contient un **jeton signé par le serveur** (HMAC / JWT court) : `member_id`, `gym_id`, `issued_at`, `expires_at` (≈30–60 s), `nonce`.
- Le jeton est généré par une Edge Function, vérifié côté serveur.
- Un même jeton ne peut pas être accepté deux fois (anti-rejeu via `nonce`).
- Le scan hors QR (nom/téléphone) reste possible.

### 7.3 Inscription + paiement ✅
Réception → crée le membre (photo, infos) → choisit un plan → saisit le paiement (montant + méthode) → l'abonnement est activé, la date de fin calculée par le serveur, le reçu généré, l'action journalisée.

## 8. Mode hors-ligne (Phase 2) ⚠️/❓

Coupures d'internet = risque n°1 pour la crédibilité du produit en Mauritanie.
- ✅ Idée de base (doc 2) : téléchargement quotidien de la liste des membres actifs, vérification locale, visites en file d'attente puis synchronisation.
- ⚠️ Contrainte : **un QR dynamique signé serveur ne se vérifie pas hors-ligne**. Voir ❓ D3 pour la décision.
- Dans tous les cas : visites hors-ligne marquées `source = offline_sync`, synchronisation idempotente (pas de doublons).

## 9. Points faibles détectés dans les documents

| # | Problème | Gravité | Traitement |
|---|---|---|---|
| 1 | Contradiction Flutter (doc 1) vs React Native (doc 2) | Moyenne | ⚠️ React Native/Expo retenu ; confirmation en D1 |
| 2 | QR = `user_id + timestamp` non signé (falsifiable) | **Haute** | ⚠️ Jeton signé serveur (7.2) |
| 3 | `gym_id` dans `profiles` : un seul gym par utilisateur, pas de filiales, pas de membre sans compte | **Haute** | ⚠️ Tables `members`, `gym_staff`, `branches` (section 6) |
| 4 | Vérification hors-ligne incompatible avec un QR signé serveur | **Haute** | ❓ D3 |
| 5 | Paiements « Bankily / Masrvi / Sedad » = simple saisie manuelle : le réceptionniste peut déclarer un paiement jamais reçu | Moyenne | ✅ Accepté en MVP (audit + justificatif). Rapprochement automatique → ❓ D4 |
| 6 | Pas de modèle pour l'abonnement SaaS des salles (facturation, essai, suspension) | Moyenne | ⚠️ Table `platform_subscriptions` ajoutée ; mécanisme d'encaissement → ❓ D5 |
| 7 | Revenus estimés (15 000 → 90 000 MRU) sans coûts ni taux d'attrition | Faible | ✅ Bruts, avant coûts/impôts (déjà précisé dans le doc 1). Ne pas les traiter comme des garanties |
| 8 | Affirmation « 3 000 MRU ≈ 1 à 2 abonnements » non vérifiée | Faible | ❓ À confirmer par une enquête de prix auprès de 5–10 salles de Nouakchott |
| 9 | Pas de langue/RTL, pas de gestion des fuseaux/monnaie | Moyenne | ⚠️ Arabe RTL + Français, UTC + Africa/Nouakchott, MRU entier |
| 10 | Pas de stratégie de sauvegarde/restauration | Moyenne | ⚠️ Sauvegardes automatiques activées + test de restauration avant mise en production |
| 11 | Pas de stratégie de tests | Moyenne | ⚠️ Section 12 |
| 12 | Connexion membre non définie (email ? téléphone ?) | Moyenne | ❓ D2 |
| 13 | Cadre légal données personnelles / publicités non traité | Moyenne | ❓ D8 |
| 14 | Sécurité des photos / pièces personnelles non détaillée | Moyenne | ⚠️ Stockage privé + accès par RLS |
| 15 | Publication sur App Store / Play Store non planifiée (comptes développeur, politique de confidentialité) | Faible | ⚠️ À prévoir avant la bêta publique |

## 10. Ordre de construction recommandé

1. **Base de données** : tables, RLS, fonctions, données de test, **tests d'isolation**.
2. **Auth + rôles** (super_admin, gym_owner, receptionist, member).
3. **Web propriétaire** : membres, plans, abonnements, paiements, dashboard.
4. **Mobile réceptionniste** : recherche membre, scan QR en ligne, écran vert/rouge.
5. **Mobile membre** : QR dynamique, abonnement, visites, notifications.
6. **Audit + permissions fines**.
7. **Import Excel**.
8. **Super-admin web** : salles, abonnements SaaS.
9. **Bêta fermée** : 2–3 salles pilotes (essai gratuit).
10. **Phase 2**, puis **Phase 3** — chaque élément ❓ seulement après décision.

## 11. ❓ Décisions à valider par le propriétaire (aucune n'est implémentée tant que non répondue)

Répondre simplement **Oui / Non / Plus tard** (ou l'option A/B).

| ID | Question | Option A | Option B | Défaut si pas de réponse |
|---|---|---|---|---|
| **D1** | Confirmer React Native + Expo à la place de Flutter ? | Oui, React Native/Expo | Garder Flutter | A |
| **D2** | Comment le membre se connecte-t-il ? | Numéro de téléphone + code SMS (OTP) | Téléphone + mot de passe (SMS coûteux) | B (pas de coût SMS au départ) |
| **D3** | Mode hors-ligne : quelle approche ? | Pas de QR hors-ligne en MVP : liste en cache + **recherche nom/téléphone** + visites synchronisées | QR hors-ligne avec secret par membre mis en cache (plus complexe, risque de fuite) | A |
| **D4** | Paiements mobiles : saisie manuelle seulement, ou intégration réelle (Bankily/Masrvi/Sedad) plus tard ? | Manuel (+ champ référence de transaction) | Intégration API (dépend des opérateurs) | A |
| **D5** | Comment les salles paient-elles les 3 000 MRU/mois ? | Encaissement manuel hors-app, activation par le super_admin | Facturation automatisée | A |
| **D6** | Essai gratuit : durée et nombre de salles ? | ex. 30 jours, 3–5 salles | Autre à préciser | 30 jours, 5 salles |
| **D7** | Politique de pause d'abonnement : fixée par la plateforme ou par chaque salle ? | Par salle (paramétrable) | Règle unique plateforme | A |
| **D8** | Données personnelles et publicités : valider le cadre légal mauritanien (loi sur la protection des données personnelles) et le consentement membres ? | Oui, faire vérifier avant le lancement | Plus tard | A |
| **D9** | Forfait « Premium » (5 000 MRU, analyses + SMS auto) proposé par le doc 2 : on le garde pour plus tard ? | Oui, après le MVP | Non | A |
| **D10** | Hébergement Supabase : choisir la région la plus proche (Europe) et accepter une latence modérée ? | Oui | Autre solution | A |

## 12. Stratégie de tests (à exécuter à chaque livraison)

**Priorité 1 — Sécurité multi-tenant (bloquant)**
- Utilisateur salle A ne voit/modifie aucune donnée de salle B (membres, paiements, visites, photos).
- Un `member` ne lit que ses propres données.
- Un `receptionist` ne peut pas changer un tarif ni annuler un paiement.
- Appel direct à l'API avec un autre `gym_id` → refusé.

**Priorité 2 — Logique métier**
- Calcul des dates de fin (1 mois, 3 mois, 1 an, personnalisé, fin de mois, année bissextile).
- Renouvellement avant/après expiration.
- Pause d'abonnement et reprise.
- Paiement → abonnement activé → audit écrit (atomique : tout ou rien).
- Montants entiers, pas d'arrondi.

**Priorité 3 — QR**
- Jeton valide → vert ; expiré, falsifié, d'une autre salle, déjà utilisé → rouge.
- Abonnement expiré → rouge, message clair.
- Capture d'écran réutilisée après expiration → refusée.

**Priorité 4 — Hors-ligne / réseau**
- Coupure en plein scan, reconnexion, synchronisation sans doublon.

**Priorité 5 — Utilisabilité**
- Test avec 2–3 vrais réceptionnistes : inscription + scan en moins d'une minute, sans aide.
- Test sur un téléphone Android modeste.

**Outils suggérés** : tests SQL/pgTAP pour les politiques RLS, Vitest/Jest pour la logique, Playwright pour le web, Maestro ou Detox pour le mobile.

## 13. Définition de « terminé » pour une fonctionnalité
- [ ] Conforme aux règles de la section 5
- [ ] RLS en place et testée
- [ ] Tests (section 12) écrits et au vert
- [ ] Textes en arabe et français
- [ ] Action sensible journalisée
- [ ] Aucun point ❓ implémenté sans réponse
- [ ] Ce fichier mis à jour si une règle a changé

## 14. Interdits
- ❌ Désactiver RLS « pour tester rapidement » sur des données réelles.
- ❌ Mettre la clé `service_role` dans l'application mobile ou le front web.
- ❌ Supprimer physiquement un paiement ou un enregistrement d'audit.
- ❌ Calculer les dates d'abonnement ou valider un QR uniquement côté client.
- ❌ Ajouter une fonctionnalité de la Phase 2/3 pendant la Phase 1.
- ❌ Changer la vision, le prix (3 000 MRU/mois) ou la stack sans validation.
