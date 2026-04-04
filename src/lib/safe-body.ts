/**
 * Read a request body with an enforced byte-size limit on the ACTUAL payload.
 *
 * Unlike checking the Content-Length header (which can lie or be omitted),
 * this reads the stream and aborts if the real size exceeds the limit.
 */
export async function readBodyWithLimit(
  request: Request,
  maxBytes: number
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("NO_BODY");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof Error && err.message === "BODY_TOO_LARGE") throw err;
    throw new Error("BODY_READ_ERROR");
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(combined);
}

/**
 * Safely parse JSON from a request with enforced byte limit.
 * Returns the parsed object or throws BODY_TOO_LARGE / INVALID_JSON.
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
  maxBytes: number
): Promise<T> {
  const raw = await readBodyWithLimit(request, maxBytes);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("INVALID_JSON");
  }
}
