/**
 * Thin OpenAI-compatible client for NVIDIA NIM.
 * Keys live in `.env.local` — never hardcode them.
 *
 * Uses system `curl -4` with a pinned A record (`--resolve`).
 * Stripped-env curl DNS to integrate.api.nvidia.com can stall ~15–90s;
 * pinning IPv4 avoids that. Bearer token stays in a curl config file (not argv).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { URL } from "node:url";

const execFileAsync = promisify(execFile);

export type NimContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type NimMessage = {
  role: "system" | "user" | "assistant";
  content: string | NimContentPart[];
};

export type NimChatOptions = {
  messages: NimMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to dashboard/.env.local (see .env.example).`,
    );
  }
  return value;
}

export function nimConfig() {
  return {
    apiKey: requireEnv("NVIDIA_API_KEY"),
    baseUrl: (process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(
      /\/$/,
      "",
    ),
    model:
      process.env.NVIDIA_VISION_MODEL?.trim() ||
      "meta/llama-3.2-11b-vision-instruct",
  };
}

/** Pull the first {...} JSON object out of a model reply that may wrap markdown. */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("Model reply did not contain valid JSON.");
}

const cleanEnv = () => ({
  PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
  HOME: process.env.HOME ?? tmpdir(),
  LANG: process.env.LANG ?? "en_US.UTF-8",
  TMPDIR: process.env.TMPDIR ?? tmpdir(),
  USER: process.env.USER ?? "user",
});

let cachedIpv4: { host: string; ip: string; at: number } | null = null;

async function resolveIpv4(hostname: string): Promise<string> {
  const now = Date.now();
  if (cachedIpv4 && cachedIpv4.host === hostname && now - cachedIpv4.at < 5 * 60_000) {
    return cachedIpv4.ip;
  }

  try {
    const { address } = await lookup(hostname, { family: 4 });
    cachedIpv4 = { host: hostname, ip: address, at: now };
    return address;
  } catch {
    /* fall through to dig */
  }

  const { stdout } = await execFileAsync("dig", ["+short", "A", hostname], {
    timeout: 8_000,
    env: cleanEnv(),
  });
  const ip = stdout
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(l));
  if (!ip) throw new Error(`Could not resolve ${hostname} to IPv4.`);
  cachedIpv4 = { host: hostname, ip, at: now };
  return ip;
}

function postJsonHttps(
  urlStr: string,
  apiKey: string,
  body: unknown,
  timeoutMs: number,
  ipv4: string,
): Promise<string> {
  const url = new URL(urlStr);
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        host: ipv4, // dial IPv4 directly
        servername: url.hostname, // SNI / cert name
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        family: 4,
        headers: {
          Host: url.hostname,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode ?? 500) >= 400) {
            reject(
              new Error(
                `NVIDIA NIM HTTP ${res.statusCode}: ${text.slice(0, 300)}`,
              ),
            );
            return;
          }
          resolve(text);
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`NVIDIA NIM timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function postJsonCurl(
  urlStr: string,
  apiKey: string,
  body: unknown,
  timeoutSec: number,
  ipv4: string,
): Promise<string> {
  const url = new URL(urlStr);
  const id = randomBytes(8).toString("hex");
  const payloadPath = join(tmpdir(), `nim-${id}.json`);
  const headerPath = join(tmpdir(), `nim-${id}.hdr`);
  await writeFile(payloadPath, JSON.stringify(body), "utf8");
  await writeFile(
    headerPath,
    `header = "Authorization: Bearer ${apiKey}"\nheader = "Content-Type: application/json"\nheader = "Accept: application/json"\n`,
    "utf8",
  );
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/curl",
      [
        "-sS",
        "-4",
        "--http1.1",
        "--connect-timeout",
        "8",
        "--max-time",
        String(timeoutSec),
        "--resolve",
        `${url.hostname}:443:${ipv4}`,
        "--fail-with-body",
        "-X",
        "POST",
        "--config",
        headerPath,
        "--data-binary",
        `@${payloadPath}`,
        urlStr,
      ],
      {
        maxBuffer: 20 * 1024 * 1024,
        env: cleanEnv(),
      },
    );
    return stdout;
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const detail = (e.stderr || e.stdout || e.message || "curl failed").slice(0, 400);
    throw new Error(`NVIDIA NIM request failed: ${detail}`);
  } finally {
    await unlink(payloadPath).catch(() => undefined);
    await unlink(headerPath).catch(() => undefined);
  }
}

async function postJson(
  url: string,
  apiKey: string,
  body: unknown,
  timeoutSec = 45,
): Promise<string> {
  const hostname = new URL(url).hostname;
  const ipv4 = await resolveIpv4(hostname);

  try {
    return await postJsonCurl(url, apiKey, body, timeoutSec, ipv4);
  } catch (curlErr) {
    try {
      return await postJsonHttps(url, apiKey, body, Math.min(timeoutSec, 25) * 1000, ipv4);
    } catch (httpsErr) {
      const a = curlErr instanceof Error ? curlErr.message : String(curlErr);
      const b = httpsErr instanceof Error ? httpsErr.message : String(httpsErr);
      throw new Error(`${a} | https fallback: ${b}`);
    }
  }
}

export async function nimChat(options: NimChatOptions): Promise<string> {
  const { apiKey, baseUrl, model } = nimConfig();
  const body = {
    model: options.model ?? model,
    messages: options.messages,
    temperature: options.temperature ?? 0.1,
    max_tokens: options.maxTokens ?? 2048,
    stream: false,
  };

  const raw = await postJson(`${baseUrl}/chat/completions`, apiKey, body, 45);
  const data = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("NVIDIA NIM returned an empty reply.");
  }
  return content;
}

/** Build a data-URI image_url part from a browser upload (base64, with or without prefix). */
export function toDataUrl(base64OrDataUrl: string, mime = "image/jpeg") {
  if (base64OrDataUrl.startsWith("data:")) return base64OrDataUrl;
  return `data:${mime};base64,${base64OrDataUrl}`;
}
