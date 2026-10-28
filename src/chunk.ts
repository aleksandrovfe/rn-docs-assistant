import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {capBySize} from "./capBySize";

export type Chunk = { id: string; source: string; url: string; title: string; text: string };

export function chunkFile(raw: string, source: string, url: string): Chunk[] {
    const { title, body } = splitFrontmatter(raw);
    const sections = clean(body).split(/\n(?=## )/);

    return sections.flatMap((sec, i) => {
        const secTitle = sec.match(/^## (.+)/)?.[1] ?? "";
        const fullTitle = secTitle ? `${title} › ${secTitle}` : title;

        return capBySize(sec)
            .filter((t) => t.length >= 50)
            .map((text, j) => ({
                id: `${url}#${i}.${j}`,
                source,
                url,
                title: fullTitle,
                text,
            }));
    });
}

function walk(dir: string, skip: string[] = [], root = dir): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        const rel = relative(root, p);
        if (skip.some((s) => rel === s || rel.startsWith(s + "/"))) return [];
        if (statSync(p).isDirectory()) return walk(p, skip, root);
        return /\.mdx?$/.test(name) && !name.startsWith("_") ? [p] : [];
    });
}

function splitFrontmatter(raw: string): { title: string; body: string } {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
    if (!m) return { title: "", body: raw };
    const title = m[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? "";
    return { title, body: raw.slice(m[0].length) };
}

function clean(body: string): string {
    return body.split("\n").filter((l) => !/^(import|export) /.test(l)).join("\n").trim();
}

const SOURCES = [
    { source: "rn", dir: "data/raw/rn/docs", skip: [], url: (r: string) => `https://reactnative.dev/docs/${r}` },
    { source: "rnfb", dir: "data/raw/rnfb/docs", skip: [], url: (r: string) => `https://rnfirebase.io/${r}` },
    {
        source: "expo",
        dir: "data/raw/expo/docs/pages",
        skip: ["versions/unversioned", "versions/v55.0.0", "versions/v56.0.0", "versions/v57.0.0", "ja", "internal", "archive"],
        url: (r: string) => `https://docs.expo.dev/${r}/`,
    },
];

const all: Chunk[] = [];
for (const s of SOURCES) {
    for (const f of walk(s.dir, s.skip)) {
        const rel = relative(s.dir, f).replace(/\.mdx?$/, "").replace(/\/?index$/, "");
        all.push(...chunkFile(readFileSync(f, "utf8"), s.source, s.url(rel)));
    }
}
writeFileSync("data/chunks.json", JSON.stringify(all));
const by = (k: string) => all.filter((c) => c.source === k).length;
console.log("chunks", all.length, "· rn", by("rn"), "· rnfb", by("rnfb"), "· expo", by("expo"));
