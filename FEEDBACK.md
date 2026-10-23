# Product feedback (draft for the Devpost form)

Factual items come from building DoorSignal. Items marked **[team]** need the team's own hands-on
answer (for example after running the Playground and the Fire TV app) before submission.

## Ring Partner API + documentation
- **Used for:** device discovery/status/capabilities, image snapshots, WHEP live view, and the webhook contract (`button_press`, `motion_detected.sub_type`, HMAC `X-Signature`).
- **Worked well:** The docs are unusually complete: exact payloads, signature code with a raw-bytes warning, the 303 pre-signed snapshot flow, `recvonly` SDP examples, rate limits and status codes. We built the webhook receiver and its tests from the docs alone.
- **Needs work:** No way to send a test `button_press` webhook (see FRICTION_LOG #5). The required `User-Agent`/`Hardware_Id` headers and the datacenter-IP 406 rule are easy to miss and have a large impact on hosting.
- **Onboarding (zero to hello world):** **[team]**
- **Build with it again?** **[team]**

## Ring Developer Playground
- **Used for:** short-lived access tokens and simulated live-view streams (Package, Vehicle, Motion).
- **Worked well / needs work / onboarding:** **[team — after running `npm run poc` and the console live view]**
- **Observed constraint:** tokens last ~30 minutes with no refresh, so hosted demos must use recorded responses.

## AmazonAppDev/ring-api-helloworld
- **Used for:** a reference for the Playground token flow and the WHEP proxy pattern.
- **Worked well:** clear README; terminal scripts print equivalent `curl` commands; the webhook test route shows the payload shape.
- **Needs work:** differs from the docs in four places (FRICTION_LOG #1–#4): Bearer-secret instead of HMAC verification, no `button_press` in the schema, missing required headers, `sendrecv` audio in the WHEP offer.

## Fire TV
Not entered: we had no Fire TV device. An experimental Fire OS app is in `firetv/` (builds in CI, never run).
Friction we hit while building it is in FRICTION_LOG #6–#7.

## AWS (Amazon Bedrock)
- **Used for:** a plain-language description of each alert image (Claude through the Anthropic Bedrock SDK, Amazon Nova through the Converse API), read by screen readers and braille displays. See `docs/aws-bedrock.md`.
- **Worked well:** one Bedrock API key works with both the Anthropic Bedrock SDK and the AWS SDK; error messages say exactly what was denied and why.
- **Needs work:** our account could not use Claude models and its organization policy denied Bedrock API keys, which we only learned from the first live call (FRICTION_LOG #12–#13).
