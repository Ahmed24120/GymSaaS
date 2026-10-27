# GymSaaS — Protocole de Passage de Relais (HANDOFF.md)

**Dernière mise à jour :** 2026-10-27  
**Auteur :** Antigravity (Constructeur)  
**Branche active :** `ag/work`  

---

## 📥 Ce que Codex (Testeur / Déploiement) doit récupérer

```bash
git fetch origin
git checkout cx/work
git merge origin/ag/work
npm run check --workspace=@gymsaas/web
```

---

## ✅ Ce qui a été réalisé avec preuves complètes

### 1. BLOC 1 : Preuves d'intégrité et sécurité
- **0 mockData :** `grep -rn "mockData" apps/web/src` → 0 occurrence.
- **Single Source of Truth QR :** `apps/web/src/lib/qr/contract.ts` est l'unique contrat.
- **Cryptographie HMAC & Anti-timing attack :** `crypto.timingSafeEqual` dans `qrSecurity.ts`, 6 tests Vitest passés avec succès.
- **Anti-Replay Serverless Persistant :** Fichier `supabase/dev/qr_nonces.sql` créé avec clé primaire unique sur `nonce`, RLS et trigger de purge automatique des nonces > 10 min.
- **Contrôle des rôles dans le Middleware :** `/super-admin` est réservé aux utilisateurs ayant `is_super_admin = true`. Réceptionnistes et propriétaires sont redirigés vers `/403`.
- **Soft-Cancel :** `cancelPayment()` dans `payments.ts` met à jour `status = 'cancelled'`, `cancelled_by` et `cancellation_reason`. Le trigger PostgreSQL `trg_audit_payments` insère automatiquement dans `audit_logs`.
- **Import Excel :** Validation des téléphones mauritaniens (222...), détection des doublons intra-fichier et inter-base. Rapport d'erreurs détaillé pour les rejets.
- **Isolation Multi-Salles (RLS) :** Script `supabase/dev/multi_tenant_test.sql` créé pour valider l'isolation hermétique entre salles via `is_gym_staff(gym_id)`.

### 2. BLOC 2 : Application Mobile Native Réelle (`apps/mobile`)
- **Suppression du pseudo-HMAC local :** Plus aucun secret ni hash local dans le code mobile. Les jetons QR sont demandés via l'API web `GET /api/qr?member_id=...`.
- **Client Supabase réel :** `apps/mobile/src/services/supabase.ts` utilise uniquement la clé publique anonyme (`EXPO_PUBLIC_SUPABASE_ANON_KEY`). Jamais de `service_role`.
- **6 écrans membres complets :**
  1. `MemberQRScreen.tsx` : QR dynamique HMAC, compte à rebours 30s, barre de progression, zones tactiles >= 44px, états loading/vide/erreur.
  2. `SubscriptionScreen.tsx` : détails abonnement, dates, prix MRU, jours restants, état actif/expiré.
  3. `VisitsHistoryScreen.tsx` : historique des visites réelles depuis Supabase.
  4. `GoalsStreakScreen.tsx` (Écran 22) : objectifs de présence hebdomadaires, compteur de streak (semaines consécutives), badges de motivation.
  5. `AnnouncementsScreen.tsx` : annonces et offres de la salle.
  6. `ProfileScreen.tsx` : profil adhérent, salle et succursale, déconnexion.
- **Contrôles de qualité mobile :**
  - `npx tsc --noEmit` dans `apps/mobile` → **0 erreur (Exit code 0)**.
  - `npx expo-doctor` → **17/17 checks passed. No issues detected!**
  - `npx expo export --platform web` → **345 modules packagés avec succès dans dist (Exit code 0)**.
- **Configuration EAS Build :** `apps/mobile/eas.json` configuré avec profil `preview` pour générer des fichiers APK Android autonomes.
- **Procédure Expo Go :** Documentée dans README via `npx expo start --tunnel`.

### 3. BLOC 3 : Préparation au Déploiement Web
- **PWA Mobile :** `apps/web/src/app/manifest.ts` génère `/manifest.webmanifest`, icônes 192x192 et 512x512 dans `public/`.
- **En-têtes de sécurité :** `apps/web/next.config.mjs` intègre `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (caméra autorisée pour le scanner QR), et `Strict-Transport-Security`.
- **Étanchéité des secrets :** `QR_SIGNING_SECRET` uniquement lu côté serveur dans `apps/web/src/lib/services/qrSecurity.ts` (rejet strict de tout préfixe `NEXT_PUBLIC_`).
- **Engines Node :** Ajout de `"engines": { "node": ">=20.0.0 <23.0.0" }` dans `package.json` et `apps/web/package.json` pour cibler Node 20/22 sur Vercel.
- **Configuration Vercel :** `apps/web/vercel.json` créé avec framework `nextjs`.
- **Écrans 24 et 25 :** Déclarés hors périmètre MVP.

### 4. BLOC 4 : Qualité et Finition
- **Aucun TODO / Lorem :** 0 occurrence dans `apps/web/src` et `apps/mobile/src`.
- **Page 404 :** Entièrement traduite en arabe avec boutons d'action conformes (>= 44px).
- **Compilation & Tests :** `npm run check` passe à 100% (22/22 pages statiques/dynamiques générées, 24/24 tests vitest réussis).
- **Audit npm sans --force :** 2 vulnérabilités identifiées dans Next 14/PostCSS pour le web et dépendances imbriquées pour Expo, documentées sans casser les dépendances principales.

---

## 🎯 Ce qui reste à faire par l'opérateur / Codex

1. **Exécuter dans Supabase SQL Editor :**
   - `supabase/dev/qr_nonces.sql` (Requis pour l'Anti-Replay serverless)
   - `supabase/dev/multi_tenant_test.sql` (Optionnel pour tester l'isolation)
2. **Déploiement Vercel :**
   - Connecter le dépôt `Ahmed24120/GymSaaS`
   - Définir `Root Directory = apps/web`
   - Configurer les 3 variables d'environnement dans Vercel :
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `QR_SIGNING_SECRET` (sans préfixe NEXT_PUBLIC_)
3. **Tester sur l'URL publique :**
   - Exécuter les scénarios S1 à S6 décrits dans `DEMO_SCRIPT.md`.
