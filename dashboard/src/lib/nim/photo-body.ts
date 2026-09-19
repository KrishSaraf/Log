/** Shared helpers for AI photo routes: FormData, JSON, or raw image body. */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB after client compress ideally

export type PhotoBody = {
  imageBase64: string;
  mimeType: string;
  hint?: string;
};

function bufferToBase64(buf: ArrayBuffer | Buffer) {
  return Buffer.from(buf).toString("base64");
}

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function" &&
    typeof (value as Blob).size === "number"
  );
}

function sniffImage(buf: Buffer): { mime: string; heic: boolean } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", heic: false };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { mime: "image/png", heic: false };
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", heic: false };
  }
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (/heic|heif|mif1|msf1|heix|hevc/i.test(brand)) {
      return { mime: "image/heic", heic: true };
    }
  }
  return null;
}

function finalizeImage(bytes: Buffer, declaredMime: string, filename?: string): PhotoBody {
  if (bytes.length === 0) throw new Error("Missing image.");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("That photo is too large. Try a closer shot or lower resolution.");
  }

  const sniff = sniffImage(bytes);
  if (sniff?.heic || /heic|heif/i.test(declaredMime) || /\.heic$/i.test(filename ?? "")) {
    throw new Error(
      "This phone saved the photo as HEIC. Take it again in the camera, or choose a JPEG.",
    );
  }

  const mimeType =
    sniff?.mime ||
    (declaredMime.startsWith("image/") ? declaredMime : "") ||
    "image/jpeg";

  if (!mimeType.startsWith("image/")) {
    throw new Error("That file is not an image.");
  }

  return { imageBase64: bufferToBase64(bytes), mimeType };
}

function hintFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
}

function stripDataUrl(raw: string): { base64: string; mime?: string } {
  const match = raw.trim().match(/^data:([^;,]+);base64,(.+)$/i);
  if (match) return { mime: match[1], base64: match[2] };
  return { base64: raw.replace(/^data:[^;]+;base64,/i, "").trim() };
}

async function readFromForm(form: FormData): Promise<PhotoBody> {
  const file = form.get("image") ?? form.get("photo") ?? form.get("file");
  if (!isBlobLike(file)) {
    throw new Error("Missing image.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const declared =
    ("type" in file && typeof file.type === "string" ? file.type : "") ||
    "application/octet-stream";
  const filename = "name" in file && typeof file.name === "string" ? file.name : undefined;
  const body = finalizeImage(bytes, declared, filename);
  const hint = hintFromUnknown(form.get("hint"));
  return hint ? { ...body, hint } : body;
}

function readFromJson(body: {
  imageBase64?: string;
  image?: string;
  mimeType?: string;
  hint?: string;
}): PhotoBody {
  const raw = body.imageBase64 || body.image;
  if (!raw || typeof raw !== "string") throw new Error("Missing image.");
  const { base64, mime } = stripDataUrl(raw);
  const approxBytes = Math.ceil((base64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new Error("That photo is too large. Try a closer shot or lower resolution.");
  }
  const bytes = Buffer.from(base64, "base64");
  const finalized = finalizeImage(bytes, body.mimeType || mime || "image/jpeg");
  const hint = hintFromUnknown(body.hint);
  return hint ? { ...finalized, hint } : finalized;
}

export async function readPhotoBody(req: Request): Promise<PhotoBody> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    return readFromForm(await req.formData());
  }

  if (contentType.startsWith("image/")) {
    const bytes = Buffer.from(await req.arrayBuffer());
    const hint = new URL(req.url).searchParams.get("hint") ?? undefined;
    const body = finalizeImage(bytes, contentType);
    return hint ? { ...body, hint } : body;
  }

  // JSON { imageBase64, mimeType, hint } — browsers, iOS, curl
  const text = await req.text();
  if (!text.trim()) throw new Error("Missing image.");

  if (text.trimStart().startsWith("{")) {
    return readFromJson(JSON.parse(text) as { imageBase64?: string; mimeType?: string; hint?: string });
  }

  throw new Error("Missing image.");
}
