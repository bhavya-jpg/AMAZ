# Friction log

Each entry is something we actually ran into while building DoorSignal. "Observed in code" means we
read it in the source or docs but did not reproduce a failure against Ring.

### 1. Sample webhook verification differs from the documented contract
- **Task:** Receive Ring webhooks securely, starting from `AmazonAppDev/ring-api-helloworld`.
- **Steps:** Read `app/api/webhook/route.ts` in the sample, then the Ring Partner API "Notifications" section.
- **Expected:** Sample verifies `X-Signature: sha256=<hex HMAC-SHA256(raw body)>` as documented.
- **Actual:** Sample checks `Authorization: Bearer $RING_WEBHOOK_SECRET` and parses JSON before any signature check. (Observed in code.)
- **Severity:** High — developers copying the sample ship webhooks without signature verification.
- **Workaround:** Implemented the documented raw-body HMAC check (`server/lib/ring/hmac.ts`) with tests.
- **Suggestion:** Update the sample to the documented HMAC flow, verifying the raw bytes before parsing.

### 2. Sample webhook schema has no `button_press`
- **Task:** Handle doorbell presses.
- **Expected:** Event enum matches the documented types (`button_press`, `motion_detected`, `device_*`).
- **Actual:** Sample's zod enum is `motion_detected | device_added | device_removed | person_detected`; `button_press` payloads fall through to "generic" normalization. (Observed in code.)
- **Severity:** Medium.
- **Workaround:** Wrote the schema from the documented payloads (`server/lib/ring/schemas.ts`).
- **Suggestion:** Add `button_press`, `device_online`/`offline`; document whether `person_detected` exists.

### 3. Sample omits the required `User-Agent` and `Hardware_Id` headers
- **Task:** Call the Partner API from our backend.
- **Expected:** Sample requests include the headers the docs mark as required (missing headers "may receive a 406").
- **Actual:** No file in the sample sends either header. (Observed in code; we did not reproduce a 406.)
- **Severity:** Medium — likely to surface only on some networks, which makes it hard to diagnose.
- **Workaround:** Our client sends both on every request.
- **Suggestion:** Add both headers to the sample's fetch helper.

### 4. Sample WHEP offer adds a `sendrecv` audio transceiver
- **Task:** Live view.
- **Expected:** Docs: "All media tracks must use recvonly direction… Bidirectional media is not supported."
- **Actual:** `useWebRTCStream.ts` adds `audio` as `sendrecv`. (Observed in code; not tested against Ring.)
- **Severity:** Low–medium.
- **Workaround:** Both transceivers `recvonly`; send the offer after ICE gathering completes.
- **Suggestion:** Align the sample with the docs.

### 5. The Playground cannot emit `button_press` or motion webhooks
- **Task:** Test the core doorbell flow end to end without hardware.
- **Expected:** A way to trigger a signed test webhook to a registered endpoint.
- **Actual:** The Playground simulates live-view sessions only (confirmed by organizers in the hackathon forum).
- **Severity:** High for event-driven apps — the most important Ring event cannot be tested without a device.
- **Workaround:** A labelled simulator that signs documented payloads and posts them to our real webhook.
- **Suggestion:** A "Send test webhook" button in the Playground / Dev Portal, signed with the app's HMAC key.

### 6. Fire TV docs don't say whether heads-up notifications appear over other apps' playback
- **Task:** Alert a viewer who is watching another app.
- **Expected:** A statement on heads-up behaviour during playback, and whether full-screen intents are honoured.
- **Actual:** The Notifications page describes appearance and Do Not Interrupt but not playback behaviour.
- **Severity:** High for this use case — it decides whether the feature is possible.
- **Workaround:** Implemented a high-priority channel + full-screen intent; documented as unverified until tested on a device.
- **Suggestion:** Document heads-up / full-screen-intent behaviour while media is playing.

### 7. Android TV emulator is not a substitute for Fire OS notification behaviour
- **Task:** Verify Fire TV alert visibility without a device.
- **Actual:** Fire TV's notification UI is Amazon's own, so an Android TV emulator can't answer the question; Vega devices don't allow sideloading.
- **Severity:** Medium.
- **Suggestion:** A Fire OS emulator image, or remote test devices for hackathon participants.

### 8. Datacenter IPs may receive 406 from Ring
- **Task:** Host a live demo.
- **Actual:** Docs warn that cloud-hosting IPs may be blocked even with correct headers, and ask developers to contact support with a static egress IP.
- **Severity:** Medium for hackathons (hosted demos must stay live until judging ends).
- **Workaround:** Replay mode serves recorded Playground responses.
- **Suggestion:** Exempt Playground tokens from the datacenter-IP rule, or document the allowlisting turnaround.
