# Annex launch report

Completed on 16 September 2026.

- Live application: https://annex-evidence.web.app
- Public demo video: https://www.youtube.com/watch?v=BaLlSJhui1I
- Submitted LexHack project: https://devpost.com/software/annex-0myxl6
- Source: https://github.com/shi1720/LexHack
- Passing CI: https://github.com/shi1720/LexHack/actions/runs/35079351087

## Delivered

The repository's actual product is Annex. Its name and identity are consistent across the application, video and submission. Firebase Hosting serves the clean URL and routes to a dedicated Cloud Run service. The OpenAI key is stored in Google Secret Manager and is used on the server.

The landing page has been rebuilt around a clear problem, a concrete hiring-system example and a readable path into the working demo. Each visitor gets an isolated workspace with four scanned samples. The core scanner runs without a language model. Optional OpenAI explanations work against actual findings and cannot modify the engine's outputs.

Fixed Firebase session forwarding, private-response caching, settings clearing and zero-value handling, source archive size limits, copied trust URLs, public-demo credential boundaries and bounded AI use. Added a health endpoint, a container build and a reproducible deployment script. Public demo features include public GitHub scanning, evidence search, dossiers, patch downloads, report exports, history and trust pages.

The Devpost submission includes the project story, technology tags, working links, cover, five captioned screenshots, testing guidance and the video. Devpost displayed "Project submitted!". The public YouTube video is 2:45, 1920 by 1080, with AI narration, burned-in captions, a custom thumbnail, chapters, a description and an English subtitle file.

The full original development history is preserved on main. Main is the default and only remaining branch. The local checkout is synchronized with the remote.

## Validation

| Check | Result |
| --- | --- |
| Production build and TypeScript checks | Passed |
| Engine tests | 461 passed |
| Browser workflows from an empty database | 30 passed in GitHub CI |
| Hosted API and integration checks | 45 passed |
| Accessibility/responsive audit | Passed in GitHub CI |
| Corpus count consistency | 41 documented claims verified |
| Adversarial remediation cases | Passed |
| Live OpenAI explanation | Successful with gpt-4.1-mini |
| Live GitHub import and rescan | Successful; unchanged source produced the same ledger root |
| Live mobile evidence view | No page overflow at 320, 390 and 768 pixels |
| YouTube playback | Confirmed running, 164.6 seconds, ready state 4 |
| YouTube checks | No copyright or Community Guidelines issues reported |

The hosted checks cover separate visitor sessions, access denial across workspaces, settings validation, JSON/SARIF/ML-BOM/CycloneDX exports, English/German/French dossier output, patch downloads, public and unpublished trust pages, ledger verification, tamper detection, AI explanation and cross-origin rejection. The browser suite also exercises self-hosted account creation and account workflows.

The compiler self-scan retains its score threshold of 70. Its scope excludes the optional narrative layer, that layer's deployment binding, legal rule fixtures and generated reports. This is a regression check on the compiler, not a compliance assessment of the hosted application.

## Operating boundaries

- Public demo data is temporary and expires after 24 hours or a Cloud Run restart. Export reports to keep them.
- Private repositories, persistent teams and direct remediation PR creation belong to a self-hosted installation. Patch downloads work in the public demo.
- Static analysis can miss implementation context or produce false positives. A finding, score or signature is not a legal compliance certificate.
- The 50-case benchmark is an in-house regression corpus. Independent repository evaluation and legal expert review remain future work.
- Dossier language choices translate document structure; they do not guarantee a complete professional translation of source evidence.

## Judging criteria review

- **Impact and feasibility:** The pitch focuses on a concrete gap between an AI governance claim and the implementation. The live demo requires no credentials.
- **Technical execution:** Findings connect to source lines, exports and verifiable ledgers. Isolation, negative paths, downloads and actual hosted behavior were tested.
- **Experience and design:** The redesigned entry point explains the workflow. Mobile views, explicit loading states and clear data boundaries reduce setup and review friction.
- **Originality:** Deterministic evidence, recorded negative searches and tests that refuse unused safeguards distinguish the project from a policy text generator.
- **Presentation:** The submitted story, 2:45 walkthrough, captions and real screenshots follow the same review journey and disclose AI assistance and limitations.

This is a self-review against the rubric, not feedback from external judges. No result in the competition is guaranteed.
