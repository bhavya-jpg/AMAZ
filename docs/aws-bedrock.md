# AWS integration: Amazon Bedrock image descriptions

DoorSignal uses **Claude on Amazon Bedrock** to turn the Ring camera image of each doorbell press
into one plain-language sentence, for example *"A person holding a package at the front door."*
The sentence appears under the image on every paired screen and is read by screen readers and
refreshable braille displays.

## Why

DoorSignal's alerts are visual. For a **DeafBlind** person, for example someone with Usher
syndrome (the most common cause of combined hearing and sight loss), the camera image alone does
not say who or what is at the door. A short text description does, through the accessibility tools
they already use. It also helps everyone glance: "a package on the doorstep, no one at the door"
answers "do I need to get up?" before the image is studied.

## How it works

```
Ring button_press webhook
  └─ verify X-Signature, store, answer 200          (app/api/ring/webhook/route.ts)
      └─ processEvent                                (lib/pipeline.ts)
          ├─ alert → every paired screen at once     (no waiting on AWS)
          ├─ Ring snapshot → image update
          └─ describeImage(image) ──► Amazon Bedrock (Claude, image input)   (lib/describe.ts)
              └─ description → stored on the event → "update" to every screen
```

- **Client:** the official Anthropic Bedrock SDK, `AnthropicBedrockMantle` from
  `@anthropic-ai/bedrock-sdk` (Bedrock's Messages API endpoint, `bedrock-mantle.<region>.api.aws`).
- **Model:** Claude Opus 5.5 first, then Sonnet 5.5, Haiku 5.5 and Haiku 4.5 if the AWS account cannot use it (override with `BEDROCK_MODEL`); the model that answered is recorded with each description, `output_config.effort: "low"`,
  one image (base64 JPEG) plus a fixed system prompt. Timeout 20 s, one retry.
- **When:** only for events that put something on screen (doorbell press, person nearby). Log-only
  motion (cars, birds, branches) never calls Bedrock.
- **Order:** the alert and the image are delivered first. The description arrives a moment later
  as a separate update, so an AWS problem can never delay or block a door alert.
- **Failure:** a refused, empty or failed request means "no description". The alert is unchanged,
  and the reason is kept on the event (visible in the console timeline tooltip).

## Privacy and safety rules (in the system prompt)

`DESCRIBE_SYSTEM` in `lib/describe.ts`:

- Never identify anyone; never guess a name, age, gender, race, ethnicity or emotion.
- People are only "a person" / "two people"; a uniform or a parcel may be mentioned.
- Ignore overlays (timestamps, device IDs, logos).
- At most 20 words, plain language.

DoorSignal still does **no face recognition** (Ring developer policy). The image is sent to Bedrock
in your own AWS account and region; DoorSignal stores only the resulting sentence, which is deleted
with the event's other data ("Delete my data").

## Turning it on

Environment variables (Render: *Environment* tab; local: `server/.env.local`):

| Variable | Value |
|---|---|
| `BEDROCK_DESCRIPTIONS` | `on` (anything else, or unset, keeps it off) |
| `AWS_BEARER_TOKEN_BEDROCK` | a Bedrock API key (AWS console → Amazon Bedrock → API keys). Or use standard AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) allowed to invoke Bedrock models. |
| `AWS_REGION` | a region where the model is available, default `us-east-1` |
| `BEDROCK_MODEL` | optional comma-separated list, tried in order; the first model your account can use is kept. Default: `anthropic.claude-opus-5-5,anthropic.claude-sonnet-5-5,anthropic.claude-haiku-5-5,anthropic.claude-haiku-4-5` |

If Bedrock asks for it, enable access to Anthropic's Claude models in that region first (Amazon
Bedrock console → model access).

The console shows **Amazon Bedrock descriptions on** when enabled; `GET /api/status` reports
`bedrock.descriptions`, `bedrock.model` and `bedrock.region`.

## Replay sandbox

Without AWS credentials, the public replay sandbox shows a description **recorded from a real
Bedrock response** of the same Ring Playground snapshot when `server/fixtures/replay/bedrock-description.json`
is present (otherwise no description at all),
labelled *"AI description · Amazon Bedrock · recorded"* on screen and `replay: recorded Amazon
Bedrock response` in the data, the same way Ring responses are replayed. With
`BEDROCK_DESCRIPTIONS=on`, every press makes a live Bedrock call instead.

## Tests

`server/tests/unit/describe.test.ts` (Bedrock mocked): request shape (model, effort, base64 image,
system prompt with the no-identification rules), refusal and HTTP-error handling, output cleaning,
and the pipeline storing the description and sending it to screens after the image, with no call
for log-only motion.

## Cost

One Bedrock request per doorbell press or person-nearby alert: one camera image in, one short
sentence out, at low effort. See Amazon Bedrock pricing for the model and region you choose.
