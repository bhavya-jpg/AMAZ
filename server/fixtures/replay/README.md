# Replay fixtures

Replay mode (the public judge sandbox) serves responses **recorded from the real Ring Developer
Playground**, because Playground tokens expire after ~30 minutes.

Generate them with a fresh Playground token:

```bash
RING_ACCESS_TOKEN=<token> npm run capture
```

This writes `meta.json`, `devices.json` (id, type and name only) and, if the Playground has an
image available, `snapshot.jpg`. Nothing in this folder is hand-written Ring data. Until the files
exist, replay mode reports that no recorded data is available.
