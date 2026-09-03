---
project: compiled
description: "An async Python news aggregator: sixty sources fetched concurrently, deduplicated three ways, categorised, and served from SQLite on Fly.io."
updated: "2026-09-03"
---

## The problem

Sixty tech blogs and news sites, many of which republish each other. I wanted one page that said what everyone was talking about today, with each story once, from its original publisher, carrying the Hacker News score if it made the front page there. And I wanted the whole thing to run on one small machine with no queue, no second database, and no operator.

## The design

```
sources.py  →  fetcher.py  →  parsers.py  →  dedupe.py  →  categorize.py  →  storage.py  →  api.py
 registry      async httpx    BeautifulSoup   URL + title    keyword scoring    SQLite/FTS5   REST + UI
                bounded        feed or CSS     fingerprints
                concurrency
```

**Fetching.** One `httpx.AsyncClient` fetches every source concurrently behind a semaphore. Timeouts, 5xx and 429 retry with exponential backoff; 4xx is recorded and not retried. Bodies stream and cap at 25 MB, redirects at five hops, and the User-Agent names the crawler honestly. A broken source never fails the run.

**Parsing.** Sites with a usable RSS or Atom feed are parsed by BeautifulSoup's XML parser, handling both `<item>` and `<entry>`, RFC 822 and ISO 8601 dates, and HTML inside descriptions. Sites without one, Hacker News and Lobsters, are scraped from their listing page with CSS selectors declared on the source, including selectors that read a timestamp from an attribute or from the element after the item, for layouts that split one entry across two table rows. Malformed entries are skipped rather than raising.

**Deduplication, three passes.** Identical canonical URL (lowercased host, tracking parameters stripped); identical title fingerprint (stopwords removed, sorted-token hash); then token-set Jaccard similarity above 0.85 within a two-day window. The surviving copy prefers the original publisher and the earliest publication time. The other sources are recorded in `also_seen_on`, and the highest vote and comment counts seen on any copy are kept.

**Categorisation.** Thirteen categories, each a weighted keyword table matched on word boundaries. Title matches count triple, summary matches single, and a single-topic source adds a small bias. Up to three categories per article; the top one is primary.

**Storage.** Stdlib `sqlite3` in WAL mode. `UNIQUE` constraints on canonical URL and title fingerprint make re-inserting a known article a no-op, so repeated scrapes are idempotent. FTS5 handles search; keyset pagination on an expression index handles paging without `OFFSET`. Retention pruning keeps the volume bounded.

**Running it.** A Dockerfile, a Fly.io app with a health check and a 1 GB volume, and an in-process scheduler that refreshes every twenty minutes. No queue, no cron service, no second container.

## What I would walk through in an interview

- Choosing Jaccard on token sets over an embedding model for near-duplicate titles: what the 0.85 threshold catches, what it misses, and the test cases that pinned it.
- Idempotency through constraints rather than through application logic, and why a stored article is never replaced.
- Keyset pagination: what breaks with `OFFSET` at depth and how an expression index makes the cursor cheap.
- Bounding concurrency with a semaphore and what the backoff schedule looks like when a source rate-limits.

## What is next

Ranking is currently a function of votes and recency. The piece I want to add is a per-source reliability score derived from the run history, so that a source that has been failing quietly is visible on the page rather than only in the logs.
