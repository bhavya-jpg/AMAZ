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

### 9. Snapshot time range is limited to after the token was issued (undocumented)
- **Task:** Fetch the latest Playground snapshot.
- **Actual:** `latest_in_range` over the last 24 h → `403 TIME_RANGE_NOT_AUTHORIZED`; the same request starting after the token's `iat` succeeded.
- **Severity:** Medium. **Workaround:** clamp the window start to the token's `iat`. **Suggestion:** document the authorized range for Playground tokens.

### 10. Intermittent `422 GRECO_NO_VALID_KEY` from the pre-signed snapshot URL
- **Task:** Repeat the same snapshot request minutes later.
- **Actual:** `303` as before, but the pre-signed GET returned `422 GRECO_NO_VALID_KEY`; the code is not in the docs' error list.
- **Severity:** Medium — it makes alert images unreliable. **Workaround:** fall back to a live-view frame. **Suggestion:** document the code and when it occurs.

### 11. WHEP returns a generic 500 when the offer has no common codec
- **Task:** Start live view from a Chromium build without H264.
- **Actual:** `500 INTERNAL_ERROR`; with H264 added to the offer the same request returned `201`.
- **Severity:** Low–medium. **Suggestion:** return a 4xx naming the missing codec (H264/90000).

### 12. Bedrock API keys denied by the account's organization policy, with no hint in the console
- **Task:** Call Amazon Bedrock from the deployed app with a Bedrock API key (`AWS_BEARER_TOKEN_BEDROCK`).
- **Actual:** Every Converse call returned `403 ... not authorized to perform: bedrock:CallWithBearerToken ... with an explicit deny in a service control policy`. The console let us create the API key anyway.
- **Severity:** Medium — the key looks valid until the first call, and the fix (use IAM credentials) is only discoverable from the error text.
- **Workaround:** Keep AWS's error text on the event (with ARNs masked) so the console shows why; switch to IAM credentials.
- **Suggestion:** Warn at API-key creation when an SCP denies `bedrock:CallWithBearerToken`; document which credential types hackathon accounts allow.

### 13. Claude models "not available for this account" on Bedrock
- **Task:** Image descriptions with Claude on Bedrock.
- **Actual:** `403 anthropic.claude-<model> is not available for this account ... contact AWS Sales` for Opus 5.5, Sonnet 5.5, Haiku 5.5 and Haiku 4.5.
- **Severity:** Medium. **Workaround:** try models in order and fall back to Amazon Nova through the Converse API, recording which model answered.
- **Suggestion:** Show model availability per account in the Bedrock console, and list the models hackathon accounts can use.

