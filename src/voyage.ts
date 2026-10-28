const MODEL = "voyage-4-lite";

export async function embed(texts: string[], inputType: "document" | "query"): Promise<{ vectors: number[][]; tokens: number }> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch("https://api.voyageai.com/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
            signal: AbortSignal.timeout(60_000),
        });
        if (res.status === 429 || res.status >= 500) {
            const wait = 2 ** attempt * 1000 + Math.random() * 500;
            console.log(`  ${res.status}, retrying in ${Math.round(wait)} ms`);
            await new Promise((r) => setTimeout(r, wait));
            continue;
        }
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        const json = await res.json();
        const data = (json.data as { index: number; embedding: number[] }[]).sort((a, b) => a.index - b.index);
        return { vectors: data.map((d) => d.embedding), tokens: json.usage.total_tokens };
    }
    throw new Error("5 attempts in a row failed");
}
