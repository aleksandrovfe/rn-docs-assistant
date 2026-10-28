# Notes

Raw numbers per week. The README is built from these.

## Week 4: corpus and top-k search

| | |
|---|---|
| Source files downloaded | 2,085 (`*.md*`, incl. old Expo SDK versions) |
| Pages indexed | 1,059 (rn 225 · rnfb 99 · expo 735, Expo SDK v58 only) |
| Chunks | 7,169 (rn 1,233 · rnfb 688 · expo 5,248) |
| Chunk length | avg 1,089 chars · max 2,000 · min 50 |
| Embedding model | `voyage-4-lite`, 1024 dims, float32 |
| Voyage tokens | 1,816,233 · $0.036 at $0.02/1M (inside the free tier, $0 billed) |
| Index size | 29.4 MB (7,169 × 1,024 × 4 bytes) |
| Search latency | ~27 ms per query, brute-force dot product, without the API call |
| Voyage query latency | 300 to 760 ms |

### Five questions from my own practice

| Query | Answer in top-5? | What came back |
|---|---|---|
| FlatList re-renders all items | yes | `Optimizing FlatList Configuration › List items` at #4, after three copies of `FlatList › Example` |
| expo prebuild clears ios folder | yes | `Continuous Native Generation (CNG) › Clean` at #3 |
| pod install doesn't work | no | the same "Update Pods & rebuild" install step from five rnfb modules, scores ~0.45 |
| Firebase init crash | no | rnfb v6.0.x release notes, a generic FAQ page |
| Firebase login doesn't work | partly | generic auth docs, nothing on debugging a failed sign-in |
| push notifications not received on iOS (task example) | partly | Expo push FAQ at #1, then four chunks of the deprecated `PushNotificationIOS` page |

recall@5 ≈ 2 / 5 (strict).

### Where it breaks

- Near-duplicates take the whole top-5: one section repeated (`FlatList › Example` ×3) or the same section copied across rnfb modules (`Update Pods` ×5).
- Deprecated pages rank above live ones: `PushNotificationIOS` (marked 🗑️ in its title) beats `rnfirebase.io/messaging`.
- rnfb release notes match "crash" and "auth" queries by vocabulary, not by content.
- "X doesn't work" questions get install guides back. The docs have little troubleshooting, so those answers live in GitHub issues, not in the corpus.
- Without a payment method Voyage allows 3 RPM / 10K TPM. One batch of 128 chunks is ~35K tokens, so every retry hit 429 and the run never progressed. A card fixed it, and the free tokens stayed.
- Bug I hit: after fixing the chunk titles I re-ran `embed` without re-running `chunk`, so the index was built on the old titles. Rule: `chunk` → `embed` → `search`, always in that order.

### Ideas for later weeks

- At most one or two chunks per URL in the final top-5.
- Skip `rnfb/releases` at chunking time. Mark deprecated pages and filter or down-rank them.
- Hybrid search with BM25 for exact terms like "iOS", "messaging", "pod" (week 7).
- GitHub issues as a second source for troubleshooting questions (MCP `read_issue`, week 5).

### Questions of the week

1. **Why chunks, not whole pages?** A page vector is the average of all its sections, so it only partly matches a question about one section, like the `[2,2,2,2]` FAQ vector scoring 0.5 cosine, and loses to a chunk that is about exactly that section.
2. **Index size at 512 dims / int8?** Size is n × d × bytes, so each factor scales it linearly: 512 dims → 14.7 MB (÷2), int8 → 7.3 MB (÷4), both → 3.7 MB (÷8). At 7K chunks float32 is fine, since int8 costs some precision. Worth it at 1M+ chunks, with the recall drop measured.
3. **Why `query` vs `document`?** `query` encodes the question as "find what answers this", `document` as "text similar to this". With `document` on both sides the search matches wording, not answers: for "pod install doesn't work" `Checkbox › Installation` entered the top-5. Scores went up (0.62 to 0.69 vs 0.45 to 0.57), but scores are not comparable across modes. On "FlatList re-renders all items" the two modes were close, so 30+ questions are needed to settle it (week 8).
4. **What if all batches went through `Promise.all`?** All 56 batches (~2M tokens) would go out at once, almost all get 429, and they would retry in one synchronized wave and hit the limit again. One batch failing after 5 attempts rejects the whole `Promise.all`, and the finished vectors are lost before `writeFileSync`. Same rule as a mobile upload queue: one to three requests in flight.
