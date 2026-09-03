---
project: json-data-drift-analyzer
description: "A browser-only QA tool that diffs scraped-data exports, separates systemic field loss from drift, and recovers only what policy allows."
updated: "2026-09-03"
---

## The problem

Scraper pipelines fail quietly. A changed page layout empties one field across every record; a source hiccup drops records while gaining others; duplicates slip in. Eyeballing two multi-megabyte JSON exports does not catch that, and the person who notices "something looks off about this run" usually cannot say *what*, *how much*, or *whether it is safe to fix*.

The tool had to answer those questions with evidence, in the browser, without sending the data anywhere: the exports are the client's, and a QA tool that uploads them is a non-starter.

## The design

**Findings, not verdicts.** The drift engine does a per-record deep diff (added, removed, modified, emptied, restored fields), field fill-rate statistics, and a quality gate with a deterministic plain-language narrative. QA emits structured findings, each with severity, category, evidence and a recommended action, across thirteen categories. Systemic field loss, a field lost in 100% of matched records, is called out separately, because that is the signature of a broken selector and it needs a different fix than scattered drift.

**Deterministic matching.** Primary key first, then fallback keys over the remainder. Ambiguity is judged against the whole reference population, so a fallback key can never silently pick the wrong record.

**Recovery acts only where policy permits.** A source profile says which fields may be backfilled. Automation backfills only a policy-approved field that is strictly blank and has exactly one baseline match. It may never overwrite a non-blank value; only a person can, with a mandatory reason, and the decision lands in an append-only log. Bulk decisions show their impact, including how many populated values would be overwritten, before confirmation.

**Policy has an identity.** Profiles resolve in layers: one base policy, one small delta per source, and local overrides in this browser only. A `policyHash` over the resolved content is stamped into every finding, provenance entry, decision, export and ticket. A policy change invalidates the analysis cache and flags decisions made under the older policy; a manifest pinned in CI means a policy edit fails the tests until it is bumped deliberately.

**Built for large exports.** Analysis runs once in a Web Worker, results are cached in IndexedDB keyed by file hashes plus configuration, and every large table is virtualised. Search runs on a prebuilt MiniSearch index.

**Provable outputs.** Six export artifacts, or one zip: recovered data, quality report, field-level recovery audit, findings CSV, a Markdown contractor ticket, and a delivery manifest listing every file's SHA-256 with the app build, policy hash and decision count. Every export passes a secret scan first. Over plain HTTP the app says it cannot prove which files it read, rather than hiding it.

## What I would walk through in an interview

- The match → QA → recover → dedupe pipeline and why the order is fixed: dedupe runs strictly after recovery and accounts for every record.
- Why "QA reports, never acts" is a design rule and not a slogan, and what the test suite does to hold it.
- The build-time Content Security Policy: `'self'` plus `api.trello.com` for the one deliberate exception, verified by a Playwright spec.
- Accessibility as a test: the axe run in the end-to-end suite and what it caught.

## What is next

The profile layering was built for hundreds of sources sharing one schema. The next step is the ingestion-share proxies: the pipeline's other alert has no threshold yet because none has been established, and the tool shows the shape of the data instead of inventing one.
