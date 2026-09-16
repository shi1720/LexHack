# What it found in the wild

> Regenerate with `npm run build && node scripts/wild.mjs`. Every number below
> comes out of that command; nothing here is typed by hand.

The [50-case benchmark](BENCHMARK.md) is written by the people who wrote the
detectors, and it says so in its first paragraph. Its clean sheet is a statement
about the corpus rather than about the world. This is the other measurement.

Five open-source AI products, cloned at their default branch and scanned with
the command a user would run. They were chosen before anything was run, for
being AI systems a person talks to — the population Article 50 is about — and
the list did not change afterwards.

| Repository | What it is | Commit | Tier | Conformity | In force today | Files | Time |
|---|---|---|---|---|---|---|---|
| [`mckaywrigley/chatbot-ui`](https://github.com/mckaywrigley/chatbot-ui) | Self-hostable ChatGPT-style client | `81328b6` | **transparency** | 6/100 | 6/100 | 309 | 1.0 s |
| [`huggingface/chat-ui`](https://github.com/huggingface/chat-ui) | The front end behind HuggingChat | `72976c3` | **transparency** | 25/100 | 20/100 | 691 | 4.3 s |
| [`langgenius/dify`](https://github.com/langgenius/dify) | LLM application platform, agents and workflows | `38f9d85d` | **transparency** | 62/100 | 65/100 | 3544 (truncated) | 30.5 s |
| [`lobehub/lobe-chat`](https://github.com/lobehub/lobe-chat) | Multi-model chat framework with plugins | `52756f69` | **transparency** | 51/100 | 51/100 | 3996 | 37.1 s |
| [`open-webui/open-webui`](https://github.com/open-webui/open-webui) | Self-hosted interface for local models | `0a7c158` | **high** | 30/100 | 29/100 | 3976 | 25.7 s |

## The finding that repeats

All five fail **Article 50(1)** disclosure, machine-readable **Article 50(2)**
marking of generated content, or both — *missing* in some, *partial* in others,
which is Annex saying it found something and not enough. Those are the two
obligations in force *now* rather than in December 2027, and the €15,000,000 or
3 % under Article 99(4)(g) attaches to them today. Article 4 AI literacy is
absent from all five as well.

| Repository | In-force obligations failing |
|---|---|
| `chatbot-ui` | 4 — `eu-ai-act.art4.ai-literacy` *missing*, `eu-ai-act.art50.1.interaction-disclosure` *missing*, `eu-ai-act.art50.2.content-marking` *missing*, `gdpr.art17.erasure` *missing* |
| `chat-ui` | 6 — `eu-ai-act.art4.ai-literacy` *missing*, `eu-ai-act.art50.1.interaction-disclosure` *missing*, `eu-ai-act.art50.2.content-marking` *missing*, `eu-ai-act.art50.4.deepfake-labelling` *missing*, and 2 more |
| `dify` | 3 — `eu-ai-act.art4.ai-literacy` *missing*, `eu-ai-act.art50.1.interaction-disclosure` *partial*, `gdpr.art17.erasure` *partial* |
| `lobe-chat` | 7 — `eu-ai-act.art4.ai-literacy` *missing*, `eu-ai-act.art50.1.interaction-disclosure` *partial*, `eu-ai-act.art50.2.content-marking` *partial*, `gdpr.art22.human-intervention` *partial*, and 3 more |
| `open-webui` | 17 — `eu-ai-act.art5.emotion-workplace` *partial*, `eu-ai-act.art4.ai-literacy` *missing*, `eu-ai-act.art50.1.interaction-disclosure` *partial*, `eu-ai-act.art50.2.content-marking` *partial*, and 13 more |

Said carefully, because the distinction matters: this is **what Annex could see
in the source**, not a legal conclusion about any of these projects. A
disclosure rendered by a component Annex did not recognise is a false negative
here and a discharged duty in reality. Several of these are upstream libraries
rather than products placed on the Union market, and Article 50 binds the
provider or deployer of the deployed system, not necessarily the repository.
What the table supports is narrower and still worth saying: the evidence a
conformity dossier would have to point at is, in five well-run open-source AI
products, not in the code.

## What it got wrong

Running this the first time produced four false positives, and they are the
reason the exercise was worth doing — none of them could have been found by a
benchmark written in this repository.

| What it said | Why it was wrong | Status |
|---|---|---|
| `chat-ui` — **PROHIBITED**, Article 5(1)(b) | `childList`, the second argument to every `MutationObserver.observe` call on the web, matched a pattern for `child` + `list`. A deploy badge produced a €35,000,000 headline. | **Fixed** — the separator is required and `list` is gone |
| `lobe-chat` — **high-risk**, Annex III 5(d) emergency triage | Two lines of `domain.test.ts` reading `description: 'Detect and triage.'`. | **Fixed** — a test may corroborate a classification and can no longer carry one alone |
| `open-webui` — **high-risk**, Annex III 1(a) biometric identification | The string `'generateInitialsImage: failed pixel test, fingerprint evasion'` — browser fingerprinting, which is anti-tracking code and the opposite of biometric identification. | **Fixed** — the biometric sense now needs a finger |
| `open-webui` — **high-risk**, Annex III 1(c) emotion recognition | A prompt template that asks a model to pick an emoji reflecting the tone of a typed message. Article 3(39) defines emotion recognition as inference **on the basis of biometric data**, and text a person typed is not that. | **Open** — see below |

The last one is not fixed, and it is worth being precise about why rather than
quietly dropping the repository from the table. The guard that is supposed to
establish modality asks whether the file mentions a face, a camera, a frame or
audio. Here the emotion pattern and the word `facial` are *the same sentence* —
a forty-word prompt string corroborating itself. Requiring the corroboration to
sit on a different line fixes this case and breaks a real one, because a
two-line Python function that reads `def mood_detection(audio)` has nowhere
else to put it. The honest fix is knowing that the match is inside a
natural-language string literal rather than in code, which is a lexer change
and is not built.

`lobe-chat` also reports GDPR Article 22 against a task supervisor's eligibility
check, which is a decision about a job rather than about a person. That finding
does not move the AI Act tier — a GDPR rule never promotes a system into Annex
III — but it is in the list, and it is wrong.

## What this costs

The largest tree read here is 3,996 files and the slowest scan is 37.1 seconds, on one
core, with no model called and nothing sent anywhere.

`dify` hit an ingest cap, and the report says so on its face rather than
scoring what it happened to read. A partial scan reported as a partial scan
is a different object from a clean one, and `--fail-under` refuses it.

## Every classification, in full

### `mckaywrigley/chatbot-ui` — transparency

| Rule | Tier | Confidence | First evidence |
|---|---|---|---|
| `art50.1.chat-disclosure` | transparency | 87 % | `components/sidebar/items/assistants/assistant-item.tsx:20` |
| `art50.2.generated-text` | transparency | 72 % | `app/api/chat/tools/route.ts:62` |

### `huggingface/chat-ui` — transparency

| Rule | Tier | Confidence | First evidence |
|---|---|---|---|
| `art50.1.chat-disclosure` | transparency | 87 % | `src/routes/api/v2/export/+server.ts:116` |
| `art50.2.synthetic-content` | transparency | 82 % | `src/lib/constants/routerExamples.ts:128` |
| `art50.2.generated-text` | transparency | 75 % | `src/lib/server/endpoints/openai/endpointOai.ts:152` |

### `langgenius/dify` — transparency

| Rule | Tier | Confidence | First evidence |
|---|---|---|---|
| `art50.1.chat-disclosure` | transparency | 87 % | `api/controllers/service_api/app/message.py:73` |
| `art50.2.synthetic-content` | transparency | 85 % | `api/core/app/app_config/features/text_to_speech/manager.py:33` |

### `lobehub/lobe-chat` — transparency

| Rule | Tier | Confidence | First evidence |
|---|---|---|---|
| `gdpr.art22.automated-decision` | high | 70 % | `apps/server/src/services/goal/supervisor/policy.ts:106` |
| `art50.1.chat-disclosure` | transparency | 87 % | `apps/server/src/services/discover/index.ts:391` |
| `art50.2.synthetic-content` | transparency | 85 % | `apps/cli/src/commands/generate/tts.ts:40` |
| `art50.2.generated-text` | transparency | 75 % | `apps/server/src/services/taskLifecycle/index.ts:801` |

### `open-webui/open-webui` — high

| Rule | Tier | Confidence | First evidence |
|---|---|---|---|
| `annex-iii.1c.emotion` | high | 65 % | `backend/open_webui/config.py:2452` |
| `art50.1.chat-disclosure` | transparency | 87 % | `backend/open_webui/utils/middleware.py:2216` |
| `art50.2.synthetic-content` | transparency | 85 % | `src/lib/workers/kokoro.worker.ts:7` |
| `art50.2.generated-text` | transparency | 68 % | `backend/open_webui/retrieval/utils.py:1249` |

