# Proof-of-concept gate (F1–F7) — results

Status as of the implementation session. Each entry says what was actually run.

| # | Test | Result | Evidence |
|---|---|---|---|
| — | Ring API reachable from our code with required headers | **Pass (partial)** | `npm run poc` with an invalid token → `HTTP 401` from `api.amazonvision.com` (not 406), i.e. the request passed Ring's WAF and reached auth. |
| F1 | List devices with a Playground token | **Pass** (2026-10-22 15:06 UTC) | `npm run poc` with a real Playground token: one device, `Playground Device`, type `devices`. |
| F2 | Device status / capabilities | **Pass** | Both endpoints answered 200. Status reported `online: false` (the Playground device is offline unless a simulated stream is running). |
| F3 | Snapshot and/or live view returns media | **Not yet** | Snapshot over the last 24 h → `403 TIME_RANGE_NOT_AUTHORIZED` (the token only authorizes times after it was issued). Windows after issuance → `416 MEDIA_NOT_FOUND` (no media recorded). WHEP live view (recvonly offer from headless Chromium, sent after ICE gathering) → `500 INTERNAL_ERROR` while the device was offline. Next: start a simulated stream (Package) in the Playground, then retry within the token's lifetime. |
| F4 | Signed event reaches the product and renders | **Pass** | Playwright e2e: signed `button_press` → webhook → SSE → `/tv` full-screen alert; p95 14 ms over 50 presses (local loopback). Standalone smoke test: an `openssl`-signed webhook accepted, tampered body → 401, duplicate → `duplicate`. |
| F5 | Fire TV alert visible over another app's playback | **Pending — needs a Fire OS device** | APK builds and its manifest was verified with `aapt2` (leanback launcher, banner, minSdk 25). Not run: no emulator available in the build environment (no KVM). |
| F6 | Compliance: Ring calls in runtime code; simulated events labelled | **Pass** | `lib/ring/client.ts` is used by the console, media pipeline and PoC; UI labels SIMULATED / REPLAY; origin is `ring` only with a Ring-issued key. |
| F7 | Bedrock classifier | **Not attempted** | Optional; out of scope until F1–F5 pass. |

## How to complete the pending checks

1. Ring Developer Playground → **Generate Token**.
2. `cd server && RING_ACCESS_TOKEN=<token> npm run poc` — paste the PASS/FAIL lines here.
3. In the Playground start a **Package** stream, then rerun `npm run poc` to test the snapshot.
4. `RING_ACCESS_TOKEN=<token> npm run capture` to record replay fixtures (commit `fixtures/replay/`).
5. Fire TV: install the APK (README), start a video in another app, press *Doorbell press* in the
   console, and record whether the alert appears over playback.
