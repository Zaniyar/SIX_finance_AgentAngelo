# Avatar GLB drop-in

Place your converted **Rocketbox** (or Ready Player Me) avatar here, e.g.
`web/public/avatars/twin.glb`, then set in `web/.env`:

```
VITE_AVATAR_URL=/avatars/twin.glb
```

Requirements (the scene maps these automatically — anything missing is skipped):

- Mixamo-compatible rig
- Oculus visemes: `viseme_sil, viseme_PP, viseme_FF, viseme_TH, viseme_DD,
  viseme_kk, viseme_CH, viseme_SS, viseme_nn, viseme_RR, viseme_aa, viseme_E,
  viseme_I, viseme_O, viseme_U`
- ARKit blink targets (optional): `eyeBlinkLeft`, `eyeBlinkRight`

Rocketbox → GLB pipeline: Blender import → strip rig → export FBX → Mixamo
auto-rig → re-import → run TalkingHead's `rename-rocketbox-shapekeys.py` →
export GLB. Until a file is present, a procedural placeholder head renders and
lip-syncs so the flow is fully demonstrable.
