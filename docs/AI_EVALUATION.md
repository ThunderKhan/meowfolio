# Meowfolio AI Evaluation Protocol

Status: Required before claims or threshold tuning

## 1. Purpose

Meowfolio uses general computer-vision models in a product that can *suggest* a familiar cat.

That creates two distinct evaluation problems:

1. **Can the detector find cats well enough for the product flow?**
2. **Do the embeddings rank visually familiar cats usefully enough to assist human memory?**

Neither problem should be evaluated by vibes.

## 2. Non-claim

Meowfolio does **not** claim validated individual-animal biometric recognition.

DINOv2 is used for visual representation and similarity retrieval.

The product outcome is:
> candidate suggestion for human confirmation.

## 3. Evaluation artifacts

Create a local development-only evaluation dataset or manifest.

Do not commit private/sensitive field photos without permission.

Suggested metadata:

```text
asset_id
cat_identity_label (local test label)
capture_session
lighting
viewpoint
distance
occlusion
notes
```

Identity labels are test annotations, not AI outputs.

## 4. Detector test set

Categories:
- clear close cat,
- small/distant cat,
- partial occlusion,
- unusual pose,
- dark coat,
- light coat,
- cluttered background,
- multiple cats,
- cat + person,
- cat + dog,
- no-cat negatives.

For each image record:
- cat expected?,
- detections,
- confidence,
- selected box quality,
- latency,
- browser/device.

## 5. Detector success definition

For hackathon use, prioritize:
- reliable clear-cat detection,
- useful bounding box,
- graceful failure.

Do not tune acceptance around one perfect demo image.

A false negative is recoverable through retry.
A false positive can create a bogus scrapbook entry, so the UI must still present the detected crop visibly before save.

## 6. Embedding pair dataset

Construct pairs:

### Positive pairs
Same known cat:
- same session / nearby frame,
- different angle,
- different distance,
- different lighting,
- different day if available.

### Hard negatives
Different cats that are visually similar:
- same coat color,
- similar markings,
- similar size.

### Easy negatives
Clearly different cats.

The hard negatives matter most.

## 7. Metrics

For each pair calculate cosine similarity.

Summarize:
- positive min/median/max,
- negative min/median/max,
- hard-negative distribution.

Optional:
- ROC curve,
- threshold table,
- precision among suggested matches.

The MVP does not need a research paper, but it needs evidence.

## 8. Threshold objective

Optimize for **suggestion precision**, not maximum recall.

Why:
- failing to suggest a known cat is mildly inconvenient,
- confidently suggesting the wrong cat damages trust.

Therefore use a conservative threshold.

## 9. Threshold table

Maintain a table during testing:

| Threshold | Positive suggestions | False suggestions | Notes |
|---:|---:|---:|---|
| TBD | TBD | TBD | measured only |

Do not fill with invented values.

## 10. Top-k fallback

If one threshold does not separate identities well:

Option:
- show up to 3 visually similar saved cats,
- user selects one or chooses new cat.

This changes the UX but remains honest.

Prefer this over pretending the top-1 candidate is reliable.

## 11. Candidate margin

Potential enhancement:
require both:
- top score > threshold,
- top score sufficiently above second score.

Only use if testing demonstrates it improves suggestions.

Do not invent a margin constant.

## 12. Multiple reference embeddings

Baseline architecture uses an aggregate reference.

If quality is poor, test:
- max similarity across confirmed encounter embeddings,
- average of top confirmed embeddings,
- centroid/reference average.

Compare on the same labeled pair/candidate set.

Choose the simplest method that improves real behavior.

## 13. Image preprocessing experiments

Test:
- detector crop only,
- padded crop,
- square padded crop,
- resized crop,
- background-heavy crop.

Record changes rather than silently tweaking.

## 14. Performance evaluation

For both models record:
- first model download/initialization,
- cached initialization,
- per-image inference,
- memory symptoms,
- device/browser,
- runtime provider.

At minimum:
- development laptop,
- intended mobile demo phone.

## 15. WebGPU vs fallback

Compare:
- availability,
- initialization success,
- latency,
- correctness consistency.

WebGPU support is not universal, so do not make unsupported devices crash.

## 16. Regression set

Once the pipeline is usable, preserve a small non-sensitive regression set.

Every major model/preprocessing change should rerun:
- detection cases,
- similarity cases,
- latency checks.

## 17. Model replacement criteria

Do not swap models because a different model is fashionable.

A replacement must improve at least one meaningful constraint:
- browser compatibility,
- transfer size,
- memory,
- latency,
- detector quality,
- similarity utility,
- licensing.

And must not cause an unacceptable regression elsewhere.

## 18. Reporting in README/submission

Allowed:
- measured inference time with device/browser named,
- measured model transfer size,
- examples of same/different similarity,
- honest failure cases.

Avoid:
- “95% accurate” without a defined dataset and metric,
- “identifies cats” when the product only suggests similarity,
- “works on all browsers.”

## 19. Field evaluation note

Outdoor photos are part of the evaluation, not just marketing.

Record:
- sunlight,
- movement,
- distance,
- framing,
- mobile connection,
- user time-to-save.

The product fails the theme if it only works on curated desktop test images.
