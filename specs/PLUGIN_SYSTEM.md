# Plugin System

**Status: Not being built yet.**

## Philosophy

As we design and build features, we ask: is this a natural extension point where a plugin could reasonably hook in? If yes, we prefer the design that leaves the door open — clean interfaces, no hardcoded assumptions — without adding plugin infrastructure prematurely.

This is a design mindset, not a deliverable.

## Known Plugin Candidates

Features that are intentionally out of scope for core but should be possible to add later:

- **Multi-currency** — exchange rate feeds, per-account currency override, cross-currency reporting
- **Crypto** — wallet balance tracking, price feeds (BTC, ETH, SOL)
- **Stocks / investments** — portfolio tracking, brokerage account integration
- **Alternative AI providers** — swap Claude for GPT-4, Gemini, or a local model in the import assistant

## Not Yet Decided

How plugins would actually work — loading, sandboxing, API surface, UI extension points, distribution — is entirely open. These decisions will be driven by a concrete use case when the time comes.
