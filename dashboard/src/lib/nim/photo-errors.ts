/** Map vision/provider failures to plain API `error` strings. Never leak vendor, model, or HTTP internals. */

const CLIENT_SAFE: Array<{ test: RegExp; error: string; status: number }> = [
  { test: /missing image/i, error: "Missing image.", status: 400 },
  {
    test: /too large/i,
    error: "That photo is too large. Try a closer shot or lower resolution.",
    status: 400,
  },
  { test: /not an image/i, error: "That file is not an image.", status: 400 },
  {
    test: /heic|heif/i,
    error: "This phone saved the photo as HEIC. Take it again in the camera, or choose a JPEG.",
    status: 400,
  },
  {
    test: /timed out|timeout|etimedout|esockettimedout|aborted/i,
    error: "That took too long. Try again with a clearer photo.",
    status: 504,
  },
];

export function photoRouteError(err: unknown): { error: string; status: number } {
  const message = err instanceof Error ? err.message : "";
  for (const row of CLIENT_SAFE) {
    if (row.test.test(message)) {
      return { error: row.error, status: row.status };
    }
  }
  return { error: "Couldn't read that photo.", status: 500 };
}

export function logPhotoAnalyzeFailure(route: string, err: unknown) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[${route}]`, detail.slice(0, 400));
}
