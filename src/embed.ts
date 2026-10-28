import { readFileSync, writeFileSync } from "node:fs";
import { embed } from "./voyage";
import type { Chunk } from "./chunk";

const BATCH = 128;
const D = 1024;

const chunks: Chunk[] = JSON.parse(readFileSync("data/chunks.json", "utf8"))
const index = new Float32Array(chunks.length * D);
let tokens = 0;

for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const texts = batch.map((c) =>  `${c.title}\n\n${c.text}`);

    const { vectors, tokens: t } = await embed(texts, "document");

    vectors.forEach((vec, j) => {
        index.set(vec, (i + j) * D);
    });

    tokens += t;
    console.log(`${i + batch.length} / ${chunks.length}`);
}

writeFileSync("data/index.bin", Buffer.from(index.buffer));
writeFileSync("data/meta.json", JSON.stringify({model: "voyage-4-lite", d: D, n: chunks.length, tokens}));
console.log(`done: ${chunks.length} vectors, ${tokens} tokens`);
