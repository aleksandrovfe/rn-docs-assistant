const MAX = 2000;
export function capBySize(text: string): string[] {
    if (text.length <= MAX) return [text];
    const out: string[] = [];
    let cur = "";
    for (const para of text.split(/\n\s*\n/)) {
        if (cur && cur.length + para.length + 2 > MAX) {
            out.push(cur);
            cur = "";
        }
        cur = cur ? cur + "\n\n" + para : para;
    }
    if (cur) out.push(cur);
    return out.flatMap((t) => (t.length <= MAX ? [t] : t.match(new RegExp(`[\\s\\S]{1,${MAX}}`, "g"))!));
}
