# Third-party notices

DoorSignal's own code is MIT licensed. It uses the following third-party software, each under its
own license. No third-party source code has been copied into this repository; the projects below are
used as dependencies or as references.

## Runtime and build dependencies

| Component | License |
|---|---|
| Next.js, React, React DOM | MIT |
| zod | MIT |
| OkHttp, OkHttp SSE (Square) | Apache-2.0 |
| Android Gradle Plugin, Kotlin | Apache-2.0 |
| Gradle wrapper (`firetv/gradle/wrapper/gradle-wrapper.jar`) | Apache-2.0 |

Development only: TypeScript (Apache-2.0), ESLint and eslint-config-next (MIT), Vitest (MIT),
Playwright (Apache-2.0), tsx (MIT).

## References consulted (not copied)

- [AmazonAppDev/ring-api-helloworld](https://github.com/AmazonAppDev/ring-api-helloworld) — MIT,
  Copyright (c) 2026 Amazon. Used as a reference for the Playground token flow and the WHEP proxy
  pattern. DoorSignal follows the official Ring Partner API documentation where the sample differs
  (HMAC `X-Signature` webhook verification, `button_press` events, `recvonly` WHEP transceivers).
- [Ring Partner API documentation](https://developer.amazon.com/docs/ring/api-documentation.html)
- [Fire TV notifications documentation](https://developer.amazon.com/docs/fire-tv/notifications.html)

All icons and the TV banner are original vector drawings in this repository.
