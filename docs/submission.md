# Submission materials (drafts)

## Devpost text description

**DoorSignal — when your Ring doorbell is pressed, the screen you're watching tells you, and motion doesn't.**

Deaf and hard-of-hearing people miss the door when their phone isn't on them. Ring has no light or
vibration accessory, and the common workaround — routines that flash smart lights — is reported to lag
15–30 seconds and to fire on motion too.

DoorSignal listens for Ring's `button_press` webhook, verifies its HMAC signature, and within moments
shows a full-screen **DOORBELL** alert with the latest Ring camera image on every paired screen — a
TV-mode page, a phone page, or a room "light" page. Motion never raises a door alert;
a person detected by motion shows a quiet "person nearby" badge. Pressing OK on the remote
acknowledges once and clears every screen.

**Why not the built-in TV feature:** Fire TV can show a small Ring Picture-in-Picture feed in the
corner of the screen on select models, as part of an Alexa doorbell announcement. DoorSignal is built
for people who can't hear that announcement: full screen, persistent until acknowledged, press vs.
motion, and every paired screen and light at once.

**How it uses Ring:** Ring Partner API for devices, status, capabilities, image snapshots and WHEP live
view (with Ring's required headers), and the documented webhook contract (`button_press`,
`motion_detected.sub_type`, `X-Signature` HMAC-SHA256 verified over raw bytes, idempotent on
`request_id`, answered within 5 s).

**What is simulated:** the Ring Developer Playground cannot send doorbell webhooks, so in the demo a
labelled simulator signs payloads in Ring's documented format and posts them to the real webhook. Every
simulated event is marked SIMULATED in the UI. The hosted sandbox replays responses recorded from the
real Playground because Playground tokens expire after 30 minutes.

**Privacy:** no face recognition; Ring tokens in memory only; images auto-deleted; one-click "delete my data".

**Track:** Ring.

**Built with:** Ring Partner API, Ring Developer Playground, Next.js, TypeScript, SQLite (node:sqlite), Docker, Render.

## Three-minute demo script (captioned, silent-first, English, no music)

| Time | Shot | Caption |
|---|---|---|
| 0:00–0:20 | Phone charging in another room; person watching TV | "Maya is Deaf. Her phone is in the kitchen. Someone is at the door." |
| 0:20–0:35 | Ring community thread on screen | "Today's workaround is slow — and it fires on motion." |
| 0:35–1:15 | Console: paste Playground token → Find devices → Use; pair `/tv` (on a TV or large screen) with its code | "Real Ring Partner API calls." |
| 1:15–1:50 | Playground *Package* stream + console live view; press **Doorbell press** (SIMULATED badge visible) → TV alert with Ring image | "A signed button_press, in Ring's documented format → DOORBELL on the TV." |
| 1:50–2:10 | Phone page vibrates/flashes; OK on the remote → every screen clears | "Acknowledge once, everywhere." |
| 2:10–2:30 | *Bird / other motion* → nothing on the TV; timeline shows LOG ONLY | "Motion is not the doorbell." |
| 2:30–2:45 | Timeline latency column; Delete my data; replay sandbox URL | "Measured, and private by design." |
| 2:45–3:00 | Real-vs-simulated table from the README; repo URL | "Ring Partner API · try it at <Render URL>" |

Record only what is verified on the day. Do not show any third-party video content in frame.
