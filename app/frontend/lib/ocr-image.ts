/**
 * Shrink a card photo before it goes over the wire.
 *
 * The OCR upload used to send the camera's original file, which for a phone
 * photo is 2-3 MB. That file crosses two hops (browser -> backend -> AI
 * service), so on a 5 Mbps link the upload alone cost ~9 s before OCR even
 * started — the single largest term in the perceived wait.
 *
 * PP-OCRv6 does its own resize internally; handing it a 3 MB JPEG buys no
 * accuracy, it only pays for bytes. Capping the long edge at 1600 px keeps the
 * text legible (a card fills the frame at that size) while cutting the payload
 * by roughly an order of magnitude.
 *
 * Everything here fails safe: if the browser cannot decode or re-encode the
 * image, the original file is returned unchanged. A big correct upload beats a
 * small broken one.
 */

/** Longest edge kept when re-encoding. Above this, OCR gain is nil. */
export const OCR_MAX_EDGE_PX = 1600;

/** JPEG quality for the re-encode. 0.82 is visually lossless for text. */
export const OCR_JPEG_QUALITY = 0.82;

/** Files at or below this size are already cheap to send; leave them alone. */
export const OCR_SKIP_BELOW_BYTES = 400 * 1024;

export type CompressedUpload = {
  blob: Blob;
  filename: string;
  /** Bytes before and after, for logging and tests. */
  originalBytes: number;
  bytes: number;
};

function renameToJpeg(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "card";
  return `${base}.jpg`;
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  // Older Safari: fall back to an <img> with an object URL.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dims(source: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ("naturalWidth" in source) {
    return { w: source.naturalWidth, h: source.naturalHeight };
  }
  return { w: source.width, h: source.height };
}

/**
 * Return a smaller JPEG for OCR, or the original blob when shrinking would not
 * help or is not possible.
 */
export async function compressForOcr(file: File | Blob): Promise<CompressedUpload> {
  const originalBytes = file.size;
  const fallbackName =
    file instanceof File ? file.name : "card.png";

  const unchanged: CompressedUpload = {
    blob: file,
    filename: fallbackName,
    originalBytes,
    bytes: originalBytes,
  };

  if (originalBytes <= OCR_SKIP_BELOW_BYTES) {
    return unchanged;
  }
  // SVG and PDF are not photos; re-encoding them through a canvas would lose
  // the thing OCR needs.
  if (file.type && !file.type.startsWith("image/")) {
    return unchanged;
  }
  // No DOM (server render, worker, test): nothing to re-encode with.
  if (typeof document === "undefined") {
    return unchanged;
  }

  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    source = await loadBitmap(file);
    const { w, h } = dims(source);
    if (!w || !h) return unchanged;

    const longEdge = Math.max(w, h);
    const scale = longEdge > OCR_MAX_EDGE_PX ? OCR_MAX_EDGE_PX / longEdge : 1;
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;

    // White backdrop: a transparent PNG flattens to black in JPEG otherwise,
    // and white-on-black text is unreadable for OCR.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(source, 0, 0, targetW, targetH);

    const blob = await canvasToBlob(canvas, "image/jpeg", OCR_JPEG_QUALITY);
    if (!blob) return unchanged;
    // Never make things worse.
    if (blob.size >= originalBytes) return unchanged;

    return {
      blob,
      filename: renameToJpeg(fallbackName),
      originalBytes,
      bytes: blob.size,
    };
  } catch {
    return unchanged;
  } finally {
    if (source && "close" in source && typeof source.close === "function") {
      source.close();
    }
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const fail = () => resolve(null);
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      fail();
    }
  });
}
