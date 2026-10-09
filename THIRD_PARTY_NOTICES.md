# Third-party notices and attribution

Meowfolio's original project code is licensed under the **Mozilla Public License 2.0**; see [LICENSE](LICENSE). Copyright © 2026 ThunderKhan (project source and original documentation). The MPL is a file-level copyleft license. Third-party packages and model weights are **not relicensed** by Meowfolio, and your own cat photographs are **not** part of the project's license.

## Runtime software

| Component | Role | Upstream license | Source |
| --- | --- | --- | --- |
| [React](https://github.com/facebook/react) and React DOM | User interface | MIT | [LICENSE](https://github.com/facebook/react/blob/main/LICENSE) |
| [Transformers.js](https://github.com/huggingface/transformers.js) (`@huggingface/transformers`) | In-browser model runtime | Apache-2.0 | [LICENSE](https://github.com/huggingface/transformers.js/blob/main/LICENSE) |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) | WebAssembly inference, used via Transformers.js | MIT | [LICENSE](https://github.com/microsoft/onnxruntime/blob/main/LICENSE) |

Other packages used **to develop and test** the website include Vite, Tailwind CSS, TypeScript, Vitest, and Playwright. Their respective upstream repositories and license texts remain authoritative; the package lockfile records exact installed versions. For detailed dependency and model documentation, see [docs/DEPENDENCIES_LICENSES.md](docs/DEPENDENCIES_LICENSES.md).

## Open-weight models

| Model used at runtime | Original creators / model | Attribution | Exact pinned browser revision |
| --- | --- | --- | --- |
| [Xenova/yolos-tiny](https://huggingface.co/Xenova/yolos-tiny) | [HUST Vision Lab, YOLOS-tiny](https://huggingface.co/hustvl/yolos-tiny) | Upstream model card declares **Apache-2.0**. Xenova provides a Transformers.js-compatible ONNX conversion. | `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d` |
| [Xenova/dinov2-small](https://huggingface.co/Xenova/dinov2-small) | [Meta AI, DINOv2-small](https://huggingface.co/facebook/dinov2-small) | Upstream model card declares **Apache-2.0**. Xenova provides a Transformers.js-compatible ONNX conversion. | `a5406bdfce9ac07eb3dc08dd05cbea034f4648d8` |

The browser retrieves approved model/runtime assets from Hugging Face and supporting runtime CDNs only after explicit first-download consent. **Model weights are not bundled with this repository**, and model names/weights remain credited to their respective publishers. Refer to the linked upstream pages for any model-specific conditions or notices.

## Images and data

- Images taken or imported by users are retained within that user's browser and are not published or licensed to this repository.
- The publicly committed Meowfolio favicon and Open Graph artwork are application branding. Project branding is not a claim of affiliation with Mozilla, Hugging Face, HUST Vision Lab, or Meta.
- The [Cat Individuals](https://www.kaggle.com/) dataset subset was used for local research evaluation; **its photographs are not redistributed** with this repository. Only aggregate, anonymized evaluation evidence is kept in source control.
- Product behavior does not infer or certify ownership of animals. Do not publish location data or personal cat photo backups without permission.

## Licensing scope

MPL-2.0 is an open-source license, not an exclusivity or non-commercial restriction. It permits commercial usage and distribution, provided its conditions are met. File-level modifications to MPL-covered code must meet MPL obligations when distributed. Its grant does **not** convey third-party trademarks, upstream model copyrights or rights to users' personal media.

This file is a source attribution register, not a substitute for upstream legal notices or legal advice. Please refer to each upstream project's license for exact terms.
