/** Compress / normalize a phone photo before upload. Returns a JPEG File. */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

export async function prepareImageFile(file: File): Promise<File> {
  if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name)) {
    throw new Error(
      "This phone saved the photo as HEIC. Take it again in the camera, or choose a JPEG.",
    );
  }

  // Prefer createImageBitmap; fall back to HTMLImageElement.
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = null;
  }

  const draw = (width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare that photo.");
    paint(ctx);
    return new Promise<File>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not prepare that photo."));
            return;
          }
          resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        QUALITY,
      );
    });
  };

  if (bitmap) {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const out = await draw(w, h, (ctx) => ctx.drawImage(bitmap!, 0, 0, w, h));
    bitmap.close();
    return out;
  }

  // Fallback decode via object URL
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that photo on this phone."));
      el.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    return await draw(w, h, (ctx) => ctx.drawImage(img, 0, 0, w, h));
  } finally {
    URL.revokeObjectURL(url);
  }
}
