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

**Try it:** https://amaz-1r9h.onrender.com/

## Devpost testing instructions (paste into the form; type the password there, never in this repo)

1. Open https://amaz-1r9h.onrender.com/ and wait up to a minute if it is waking up (free hosting).
2. Open https://amaz-1r9h.onrender.com/tv in a second window. It shows a 6-digit pairing code.
3. Open https://amaz-1r9h.onrender.com/console and log in with the admin password: `<type it in the Devpost form only>`.
4. Under "2 · Screens and lights", enter the code. The TV window switches to a clock.
5. Under "3 · Try it", press **Doorbell press**: the TV shows a full-screen DOORBELL alert with a
   recorded Ring Playground camera image, labelled SIMULATED PRESS. Press Enter (OK) in the TV window
   to acknowledge.
6. Press **Bird / other motion**: nothing appears on the TV. Press **Person nearby (motion)**: a quiet
   blue PERSON NEARBY screen appears instead of a door alert.
7. The Timeline shows each event, the decision, which screens received it, how long each took, and the
   acknowledgement.

The hosted sandbox runs in replay mode: Playground tokens expire after 30 minutes, so it replays
responses recorded from the real Ring Developer Playground. Live mode (paste a Playground token in the
console) is described in the README.

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
| 2:45–3:00 | Real-vs-simulated table from the README; repo URL | "Ring Partner API · try it at amaz-1r9h.onrender.com" |

Record only what is verified on the day. Do not show any third-party video content in frame.
