# LIVE_STATUS
HEURE: 11:30 GMT (départ 11:24, 2026-11-20)
FAIT: baseline 49 verts/5 rouges (tests/evidence/baseline.txt); SQL 00/07/08 + demo_data/cleanup corrigés; /api/qr/verify via RPC + Bearer (getRequestContext); recordPayment via RPC, entiers stricts; hardcoded gym fallback retiré (lib/data/gym.ts); PERF-01; mobile envoie Bearer; 5 rouges -> verts + 14 tests non-régression (tests/evidence à générer en fin de phase)
EN COURS: /mobile données réelles (MOBILE-01/03)
PROCHAIN: npm run check complet, STAFF-01/SCAN-01 si temps
ATTEND AHMED: PACK SQL A
RISQUES: contrat QR mobile dupliqué (Metro); annulation paiement ne désactive pas l'abonnement
