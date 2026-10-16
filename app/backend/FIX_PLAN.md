# Tiby Backend Fix Plan — Spec Audit (2026-10-16 refs)

Scope: `app/backend/src` + `shared/ts-shared/src` vs `app/backend/ref` (SDD, context, glossary, ADR-001..006).
WAHA exception: logic-only review, no live number required. All WAHA fixes below are number-independent.

## P0 — correctness / security
1. `AuditInterceptor` never runs — `audit.module.ts` provides it but `main.ts` never binds `APP_INTERCEPTOR`. Fix: bind `APP_INTERCEPTOR` in `AuditModule`, harden `targetEntity` parsing.
2. `ConsentGuard` dead code — exists but no controller uses it. Fix: `CheckInController`, `PmoController` use `RolesGuard + ConsentGuard`.
3. Ticket close status drift — spec `backend_sdd_spec.md:171` says `RESOLVED_CLOSED`, code `tickets.service.ts:134` writes `RESOLVED`. Fix: write `RESOLVED_CLOSED`, update `tickets.service.spec.ts`.
4. Upload validation missing — spec `backend_sdd_spec.md:299` requires 10MB + `FileTypeValidator /^audio\/(webm|wav|ogg|mp4|mpeg)$/` on `POST /api/check-ins/audio-extract`. Code only sets `FileInterceptor` limits. Fix: `ParseFilePipe` with `MaxFileSizeValidator` + `FileTypeValidator`; add 10MB limit to OCR endpoint. Notes: NestJS v12 `FileTypeValidator` inspects magic numbers via `file-type`, not the mimetype string — so `fallbackToMimetype: true` is set (test buffers have no signatures); `.webm` is accepted as `audio|video` because supertest maps `.webm` → `video/webm` while browsers send `audio/webm`.

## P1 — history / enum consistency
5. Missing `PatientStatusHistory` writes (ADR-004 2.3, ADR-006 2.4):
   - `TICKET_OPENED` on RED_FLAG (`check-in.service.ts`) and SILENCE_H3 (`silence-detector.service.ts`).
   - `PUSH_SUBSCRIBED` on `push.service.ts:subscribe` (needs `TreatmentPlan` + `PatientStatusHistory` repos).
   - `WHATSAPP_CONNECTED` + `AuditLog` on `whatsapp-connect.service.ts:handleInboundWebhook` (needs `TreatmentPlan`, `PatientStatusHistory`, `AuditLog` repos).
6. `NotificationLog` vocab drift — spec `backend_sdd_spec.md:174` lists `SILENCE_H1/H2`, `QUEUED/SENT`; code emits `SILENCE_H*_ESCALATION`, logs `DELIVERED/NO_SUBSCRIPTION`. Fix: keep `_ESCALATION` canonical (tests rely on it), add `DELIVERED`, `NO_SUBSCRIPTION` to `DeliveryStatuses` in `enums.ts`, add `DAILY_REMINDER` / plain `SILENCE_H*` / `WHATSAPP_VERIFIED_ACK` message branches in `notifications.service.ts`.
7. Silent + red-flag bounce — `check-in.service.ts:254-367` recovers to `AKTIF/streak=1` then flips to `BERISIKO`. Fix: skip AKTIF-recovery when `verdict === SEGERA_KE_FASKES`.
8. `PUTUS_FOLLOW_UP` unreachable — ADR-004 says H+3 → `PUTUS_FOLLOW_UP`, code stays `BERISIKO`. Fix: keep H+3 = `BERISIKO` (existing tests), add `PUTUS_FOLLOW_UP` at `consecutiveSilenceDays >= 7` with history + ticket still `SILENCE_H3`.

## P2 — small spec gaps
9. `TreatmentsController.getPatientHistory` uses raw `@Query("page")` instead of `PaginationQuerySchema` (`backend_sdd_spec.md:340`). Fix: use schema.
10. `FacilityAlertTypes` / `PatientStatusEventTypes` ahead of spec (code has `SILENCE_H3_WARNING`, `PMO_OUTREACH`, spec tables omit them). No code change; spec needs update.

## P3 — WAHA hardening (no number needed, env-only when number arrives)
11. `generate6CharCode()` uses hex-only (`0-9A-F`). Fix: full `A-Z0-9` alphabet.
12. Webhook matches code-only, ignores `phone_hash`/`expected_chat_id` (`adr_005.md:24`). Fix: warn on `payload.from !== expectedChatId`, still verify (sender is source of truth for `chatId`).
13. Expired codes stay `PENDING`. Fix: mark `EXPIRED` on late webhook hit.
14. No webhook secret check (`backend_sdd_spec.md:357`). Fix: optional `WAHA_WEBHOOK_SECRET` header check, disabled when empty (dev-friendly).

When number arrives (no code change): set `WAHA_ENABLED=true`, `WAHA_BASE_URL`, `WAHA_SESSION`, `WAHA_BOT_PHONE_NUMBER=628xx` in `app/backend/.env`, point WAHA session webhook to `http://<host>:3001/api/webhooks/waha` for `message` event. Deep link + `sendText`/`sendSeen` already work — verified in `phase5.e2e-spec.ts`.
