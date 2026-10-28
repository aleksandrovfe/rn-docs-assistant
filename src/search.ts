import { readFileSync } from "node:fs";
import { embed } from "./voyage";
import type { Chunk } from "./chunk";

function scoresFor(index: Float32Array, d: number, q: Float32Array): Float32Array {
    const n = index.length / d;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < d; j++) s += index[i * d + j] * q[j];
        out[i] = s;
    }
    return out;
}

function topK(scores: Float32Array, k: number): { i: number; score: number }[] {
    return Array.from(scores, (score, i) => ({ i, score }))
        .sort((a,b) => b.score - a.score )
        .slice(0, k);
}

const meta = JSON.parse(readFileSync("data/meta.json", "utf8"));
const chunks: Chunk[] = JSON.parse(readFileSync("data/chunks.json", "utf8"));
const buf = readFileSync("data/index.bin");
const index = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

const question = process.argv[2];
const t0 = performance.now();
const { vectors } = await embed([question], "query");
const t1 = performance.now();

const q = new Float32Array(vectors[0]);
const top = topK(scoresFor(index, meta.d, q), 5);
const t2 = performance.now();

for (const { i, score } of top) {
    console.log(score.toFixed(3), chunks[i].title);
    console.log("      ", chunks[i].url);
}
console.log(`\nsearch ${(t2 - t1).toFixed(1)} ms · Voyage ${(t1 - t0).toFixed(0)} ms`);
