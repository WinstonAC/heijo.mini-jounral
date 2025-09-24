import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only key
const supabase = createClient(url, key);

type Prompt = { text_en: string; tags: string[]; date?: string | null };

const ALLOWED = new Set([
  "reflection","gratitude","body","self-care","energy",
  "breathwork","productivity","growth","connection"
]);

function chunk<T>(arr: T[], size = 50) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

(async () => {
  try {
    const raw = fs.readFileSync("prompts.json", "utf8");
    const items: Prompt[] = JSON.parse(raw);

    // quick validation
    for (const p of items) {
      if (!p.text_en || p.text_en.length > 140) throw new Error("Bad/long prompt: " + p.text_en);
      if (!Array.isArray(p.tags) || p.tags.length === 0) throw new Error("Missing tags: " + p.text_en);
      for (const t of p.tags) if (!ALLOWED.has(t)) throw new Error(`Unknown tag "${t}" in: ${p.text_en}`);
    }

    const groups = chunk(items, 50); // batch in 50s
    let total = 0;
    for (let i = 0; i < groups.length; i++) {
      const batch = groups[i].map(p => ({ text_en: p.text_en, tags: p.tags, date: p.date ?? null }));
      const { error, count } = await supabase
        .from("prompts")
        .upsert(batch, { onConflict: "text_en", ignoreDuplicates: false })
        .select("id", { count: "exact", head: true }); // force execution & get count
      if (error) throw error;
      total += batch.length;
      console.log(`Batch ${i+1}/${groups.length} upserted (${batch.length}). Running total: ${total}`);
    }
    console.log(`✅ Seed complete. ${total} prompts processed.`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
})();
