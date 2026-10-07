# Meowfolio User Flows

This document defines the canonical interaction paths. Implementation may change layout, but not the underlying decision points without updating this document.

## Flow A — First launch

```text
Open app
  ↓
Collection bootstrap
  ↓
First-run welcome
  ├─ Learn about local AI
  └─ Start my Meowfolio
        ↓
Empty collection
        ↓
Spot a cat
```

Rules:
- no account,
- no geolocation prompt,
- no model download until it is needed unless preload is explicitly tested and chosen.

## Flow B — Add a brand-new cat

```text
Collection
  ↓
Spot a cat
  ↓
Take photo / choose photo
  ↓
Preview
  ↓
Find the cat
  ↓
Models ready?
  ├─ No → prepare models → continue
  └─ Yes
  ↓
Detect cats
  ├─ 0 → No cat found → retry/change photo
  ├─ 1 → select automatically
  └─ 2+ → user chooses cat
  ↓
Create embedding
  ↓
Collection empty or no candidate above suggestion threshold
  ↓
New cat
  ↓
Enter name
  ↓
Optional note
  ↓
Optional add location
  ├─ denied/error → continue without location
  └─ granted → attach location
  ↓
Save Cat + Encounter
  ↓
Success
  ↓
Cat detail or Collection
```

## Flow C — Possible repeat encounter

```text
Capture + detect + embed
  ↓
Candidate above suggestion threshold
  ↓
Possible familiar face: Mochi
  ├─ Yes, it's Mochi
  │     ↓
  │   optional note/location
  │     ↓
  │   save new Encounter
  │     ↓
  │   update reference embedding
  │
  ├─ No, new cat
  │     ↓
  │   name + save new Cat
  │
  └─ Choose another saved cat (only if implemented)
        ↓
      manual existing-cat selection
        ↓
      confirm encounter
```

Critical rule:
No branch allows the AI to merge identity without human confirmation.

## Flow D — Multiple cats in one photo

```text
Detector returns N > 1 cat boxes
  ↓
Show selectable crops
  ↓
User picks intended cat
  ↓
Embedding generated for selected crop only
  ↓
Continue normal match flow
```

If the user wants to add another cat from the same source image:
- not required for MVP,
- simplest future behavior is start another scan from the same image.

## Flow E — No cat detected

```text
Detection completes
  ↓
No cat class passes detector criteria
  ↓
Show original image
  ↓
"I couldn't find a cat in this photo"
  ├─ Try another photo
  └─ Retry detection (optional)
```

Never allow “save anyway as cat” in the hackathon MVP unless the detector proves too unreliable and the product decision is explicitly changed.

## Flow F — Model first-use

```text
User starts processing
  ↓
Detector unavailable locally
  ↓
Show model preparation
  ↓
Download/cache detector
  ↓
Initialize
  ↓
Need embedder
  ↓
Download/cache embedder
  ↓
Initialize
  ↓
Ready
  ↓
Resume selected photo automatically
```

Failure:
```text
download/init fails
  ↓
explain failure
  ├─ Retry
  └─ Back to collection
```

Do not discard the selected photo unnecessarily on retry.

## Flow G — Browse collection

```text
Open app
  ↓
Load local database
  ├─ empty → empty state
  └─ populated → cat cards
                     ↓
                 select cat
                     ↓
                 cat detail
                     ↓
                 encounter timeline
```

## Flow H — Location permission

```text
Name/confirm cat
  ↓
User chooses Add location
  ↓
Browser permission
  ├─ granted → capture coordinates + accuracy
  ├─ denied → explain optional → continue
  └─ unavailable/error → continue without it
```

Rules:
- never request on page load,
- never repeatedly prompt after denial within the same save flow,
- location is not required.

## Flow I — Storage failure

```text
Save requested
  ↓
IndexedDB transaction
  ├─ success → success state
  └─ failure
       ↓
     do not show saved
       ↓
     preserve form/image in memory if possible
       ↓
     explain + retry
```

## Flow J — Unsupported/slow AI environment

```text
Model manager checks preferred runtime
  ↓
WebGPU available?
  ├─ yes → attempt WebGPU
  │          ├─ success → continue
  │          └─ failure → fallback if supported
  └─ no → fallback runtime
              ├─ success → continue, possibly warn slower
              └─ failure → explain browser/device limitation
```

Do not redirect to cloud inference automatically.

## Navigation safeguards

During an active scan:
- retain selected image while moving between internal processing states,
- browser back should have predictable behavior,
- avoid irreversible actions without confirmation,
- never save a partial cat silently.

## Flow invariants

Across all flows:
1. user controls identity,
2. user controls location,
3. AI uncertainty is visible,
4. no account is required,
5. local persistence is the source of truth,
6. failed processing never fabricates a successful result.
