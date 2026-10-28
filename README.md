# rn-docs-assistant

Semantic search over the React Native, Expo and React Native Firebase docs. Later weeks turn it into an assistant for RN/Firebase developers.

For now you ask a question in plain English and it prints the five closest documentation chunks, each with a score and a link.

```
$ npm run search -- "expo prebuild clears ios folder"

0.633 React Native's New Architecture › Enable the New Architecture in an existing project
       https://docs.expo.dev/guides/new-architecture/
0.625 Adopt Prebuild › Prebuild
       https://docs.expo.dev/guides/adopting-prebuild/
0.611 Continuous Native Generation (CNG) › Clean
       https://docs.expo.dev/workflow/continuous-native-generation/
...
```

## How it works

```
fetch-docs  →  chunk  →  embed  →  search
 git sparse    split by   Voyage     dot product
 checkout      "## "      1024-d     over all chunks,
 of 3 repos    sections   vectors    top-5
```

1. `scripts/fetch-docs.sh` makes a shallow sparse checkout of only the docs folders of `react-native-website`, `expo/expo` and `react-native-firebase`.
2. `src/chunk.ts` strips frontmatter and MDX `import`/`export` lines, then splits each page on `## ` headings. Sections longer than 2,000 characters are split again on paragraph boundaries, and chunks under 50 characters are dropped. Every chunk keeps a `Page › Section` title and a link to the live docs page. Only the latest Expo SDK version is kept, otherwise one page would appear five times.
3. `src/embed.ts` sends chunks to Voyage (`voyage-4-lite`, `input_type: "document"`) in batches of 128, one request at a time. `src/voyage.ts` retries 429 and 5xx with exponential backoff and jitter, and it does not retry other 4xx errors. Vectors go into one flat `Float32Array` saved as `data/index.bin`.
4. `src/search.ts` embeds the question with `input_type: "query"`, scores every chunk with a dot product and returns the top 5. Voyage vectors come normalized, so the dot product equals cosine similarity.

## Numbers (week 4)

| | |
|---|---|
| Corpus | 1,059 pages → 7,169 chunks |
| Index | 29.4 MB, 1024-d float32 |
| Embedding cost | 1.8M tokens, $0.036 (free tier) |
| Search | ~27 ms per query, brute force, plus 300 to 760 ms for the Voyage call |
| recall@5 | 2 / 5 on my own questions |

Brute force is fine at this size: 7K × 1,024 multiply-adds take about 27 ms. At a million chunks it would take seconds, and that is the point where a vector database pays off.

## Where it fails today

- The same section, or the same install step copied across Firebase modules, can take all five slots.
- Deprecated pages rank high. On "push notifications not received on iOS", four of the five results come from the deprecated `PushNotificationIOS` page, and `rnfirebase.io/messaging` does not appear.
- Questions like "pod install doesn't work" get install guides back, because the official docs have little troubleshooting. Those answers live in GitHub issues.

Details and raw numbers are in [NOTES.md](NOTES.md).

## Run it

Requires Node 22+ and a [Voyage AI](https://dashboard.voyageai.com/) API key. Add a payment method: without one, the rate limit (10K tokens per minute) is lower than a single batch. The free token allowance stays.

```bash
npm install
echo "VOYAGE_API_KEY=pa-..." > .env

npm run fetch-docs     # ~2,000 markdown files into data/raw
npm run chunk          # → data/chunks.json
npm run embed          # → data/index.bin, about a minute
npm run search -- "FlatList re-renders all items"
```

Re-run `chunk` and then `embed` every time the chunking changes. Otherwise the index stays built on the old chunks.

## Roadmap

- [x] Week 4: corpus, chunking, embeddings, top-k search
- [ ] Week 5: MCP server in TypeScript (`search_docs`, `read_issue`, read-only)
- [ ] Week 6: question → retrieval → answer as JSON `{answer, sources}`, with cost and latency measured
- [ ] Week 7: hybrid search (BM25 + dense)
- [ ] Week 8: 30-question eval set, recall@5, MRR, link checks, "I don't know" when there is no answer
- [ ] Week 9: v0 public release
