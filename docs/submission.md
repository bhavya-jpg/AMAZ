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

## Demo video (as produced)

About 2:50, 1920 × 1080, H.264 + AAC. Every narration line is also a burned-in caption.

- **Footage:** the real app in replay mode, recorded with Playwright from four browser contexts at once
  (console, TV, phone, room light). Doorbell presses are simulated and labelled on screen.
- **Motion graphics:** one HTML page driven by `window.seek(t)`, rendered frame by frame and encoded with ffmpeg.
- **Voice:** Chatterbox TTS (Resemble AI, open source), run locally; each line checked against the
  script with a Whisper transcription.
- **Music:** "Pilates and Yoga" by Arulo, Mixkit #419, Mixkit Stock Music Free License (not stored in
  this repo). Sound effects: CC0 (Freesound / Kenney).
- **Mix:** music ducked under the voice; about −16 LUFS integrated, true peak below −4 dBFS.

| Start | Section | Narration (= caption) |
|---|---|---|
| 0:01.2 | hook | A doorbell is a sound. If you can't hear it, you miss the door. |
| 0:05.4 | hook | DoorSignal turns a Ring doorbell press into something you can see, on every screen in your home. |
| 0:13.6 | problem | In the Ring Community, families of Deaf users have asked for a visual doorbell alert for years. |
| 0:19.4 | problem | Ring sells no light or vibration accessory for Deaf users. The usual workaround, smart light routines, is reported to lag fifteen to thirty seconds. |
| 0:29.0 | problem | And it flashes on motion too, when nobody rang. |
| 0:34.1 | what | DoorSignal listens for Ring's doorbell press itself, not a sound. |
| 0:38.4 | what | A press takes over the screen: a full screen alert, with the latest camera image, that stays until someone sees it. |
| 0:45.9 | what | A person on camera gets a quiet notice. Cars, birds and branches are only logged. |
| 0:52.4 | what | And it reaches every paired screen at once: the TV, a phone, and a room light. |
| 1:00.3 | demo | Here it is running, in replay mode, with responses recorded from the Ring Developer Playground. |
| 1:06.7 | demo | Open the TV screen. It shows a six digit pairing code. |
| 1:10.8 | demo | In the console, enter that code, and the TV is paired. The phone pairs the same way. |
| 1:17.7 | demo | Now, a doorbell press. The Playground can't send doorbell webhooks, so this press is simulated, signed in Ring's documented format, and labelled on screen. |
| 1:27.0 | demo | The TV and the phone switch to a full screen alert, with the camera image recorded from the Ring Playground. |
| 1:34.9 | demo | The flash runs twice a second, below the photosensitivity limit, and turns off with reduced motion. |
| 1:41.3 | demo | Press OK on the remote, and every screen clears. |
| 1:46.5 | demo | Now motion. A bird: nothing happens. A person: a quiet notice, not a door alert. |
| 1:54.3 | demo | The timeline shows every event, which screens got it, how fast, and who acknowledged it. |
| 2:02.4 | built | Under the hood, DoorSignal uses the Ring Partner API for devices, snapshots and live view. |
| 2:08.8 | built | Every webhook's signature is checked on the raw bytes, and answered inside Ring's five second window. |
| 2:14.9 | built | Images expire, tokens stay in memory, and there is no face recognition. |
| 2:21.9 | use | To try it yourself, open the live demo, and the TV screen in a second window. Log in to the console with the password from our testing instructions, pair the TV, and press the doorbell. |
| 2:34.4 | end | What's real and what's simulated is labelled everywhere. Next, we'll test it with Deaf and hard of hearing users. |
| 2:40.7 | end | DoorSignal. Know when someone's at the door. Try the live demo, linked below. |
