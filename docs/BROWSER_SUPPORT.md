# Meowfolio Browser & Capability Support

Status: test-driven support policy

## 1. Principle

Meowfolio depends on modern browser capabilities:
- JavaScript modules,
- IndexedDB,
- Canvas/image APIs,
- optional Geolocation,
- WebAssembly,
- optionally WebGPU,
- model Cache API behavior.

Support must be based on testing, not assumptions.

## 2. Support tiers

### Tier 1 — must work for hackathon
- current Chrome/Chromium desktop on development machine,
- current Chrome on intended Android demo phone.

### Tier 2 — best effort
- Edge Chromium,
- recent Firefox,
- recent Safari/iOS Safari where available for testing.

### Tier 3 — unsupported
Browsers missing required execution/runtime features after fallback attempts.

Do not block development trying to guarantee every browser during a four-day challenge.

## 3. Feature detection

Prefer capability detection over user-agent checks.

Examples:
- `'gpu' in navigator` where appropriate for WebGPU signal,
- IndexedDB availability,
- Geolocation availability,
- Cache API availability.

Runtime/library behavior still needs real testing.

## 4. WebGPU

Preferred acceleration path.

Important:
- WebGPU is not universally available,
- support and stability vary across browsers/devices,
- Transformers.js can also run models through CPU/WASM paths depending on model/runtime support.

Therefore:
- WebGPU cannot be the only conceptual architecture,
- fallback must be attempted/tested,
- unsupported devices need an honest message.

## 5. IndexedDB

Required for MVP persistence.

If unavailable or opening fails:
- core scrapbook persistence is unavailable,
- show a blocking but understandable error,
- do not silently degrade to volatile in-memory storage while implying persistence.

## 6. Cache API

Useful for model caching.

If unavailable:
- model loading may still work but repeat behavior can differ,
- do not make scrapbook storage depend on Cache API.

## 7. Geolocation

Optional enhancement.

If unavailable:
- hide/disable Add location with explanation if needed,
- save encounter normally.

Geolocation must never define browser support.

## 8. Camera input

Baseline:
```html
<input type="file" accept="image/*" capture="environment">
```

Browser behavior varies:
- some offer camera directly,
- some show chooser,
- desktop uses file picker.

That is acceptable for MVP.

A custom live camera using `getUserMedia` is not required unless testing shows meaningful benefit.

## 9. Secure context

Deployment must use HTTPS.

Reasons:
- modern privileged APIs commonly require secure contexts,
- geolocation behavior,
- PWA features if added,
- normal production hygiene.

## 10. Compatibility test matrix

Track real results:

| Platform | Browser | Detection | Embedding | IndexedDB | Geolocation | Status |
|---|---|---|---|---|---|---|
| Windows dev laptop | Chrome | TBD | TBD | TBD | TBD | Required |
| Android demo phone | Chrome | TBD | TBD | TBD | TBD | Required |
| Windows | Edge | TBD | TBD | TBD | TBD | Best effort |
| Windows | Firefox | TBD | TBD | TBD | TBD | Best effort |
| iOS | Safari | TBD | TBD | TBD | TBD | If available |

Do not mark supported until tested.

## 11. Runtime diagnostics

Development builds may expose:
- browser,
- WebGPU available?,
- selected provider,
- model states,
- cache available?,
- IndexedDB available?

Do not expose unnecessary technical diagnostics prominently in consumer UI.

## 12. Unsupported state

Copy:
> Meowfolio couldn’t start local AI in this browser.

Then:
> Try a recent version of Chrome or another supported browser.

Only recommend a specific browser after testing confirms it.

## 13. Compatibility documentation rule

README support table must match this file's measured matrix.

Do not write “works in all modern browsers.”
