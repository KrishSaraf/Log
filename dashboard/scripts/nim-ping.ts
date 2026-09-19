/**
 * Quick latency check for nimChat outside Next.
 * Usage: npx tsx scripts/nim-ping.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Manual load — dotenv was reporting 0 injected vars for this file.
for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const i = trimmed.indexOf("=");
  if (i < 0) continue;
  const key = trimmed.slice(0, i).trim();
  let value = trimmed.slice(i + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

async function main() {
  const { nimChat } = await import("../src/lib/nim/client");
  const t = Date.now();
  const reply = await nimChat({
    messages: [{ role: "user", content: 'Reply with exactly {"pong":true}' }],
    maxTokens: 16,
    temperature: 0,
  });
  console.log(JSON.stringify({ ms: Date.now() - t, reply: reply.slice(0, 80) }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
