/** Shared helpers for AI photo routes: FormData or JSON body, size limits. */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB after client compress ideally

export type PhotoBody = {
  imageBase64: string;
  mimeType: string;
  hint?: string;
};

function bufferToBase64(buf: ArrayBuffer) {
  return Buffer.from(buf).toString("base64");
}

export async function readPhotoBody(req: Request): Promise<PhotoBody> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      throw new Error("Missing image.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("That photo is too large. Try a closer shot or lower resolution.");
    }
    const mimeType = file.type || "image/jpeg";
    if (mimeType && !mimeType.startsWith("image/")) {
      throw new Error("That file is not an image.");
    }
    // HEIC often arrives as empty type or image/heic — flag early if we can.
    if (/heic|heif/i.test(mimeType) || /\.heic$/i.test(file.name)) {
      throw new Error(
        "This phone saved the photo as HEIC. Take it again in the camera, or choose a JPEG.",
      );
    }
    const imageBase64 = bufferToBase64(await file.arrayBuffer());
    const hintRaw = form.get("hint");
    const hint = typeof hintRaw === "string" ? hintRaw : undefined;
    return { imageBase64, mimeType: mimeType || "image/jpeg", hint };
  }

  const body = (await req.json()) as {
    imageBase64?: string;
    mimeType?: string;
    hint?: string;
  };
  if (!body.imageBase64) throw new Error("Missing image.");
  const approxBytes = Math.ceil((body.imageBase64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new Error("That photo is too large. Try a closer shot or lower resolution.");
  }
  return {
    imageBase64: body.imageBase64,
    mimeType: body.mimeType || "image/jpeg",
    hint: body.hint,
  };
}
