export type AcceptedImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

const ACCEPTED: readonly AcceptedImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function isAcceptedImageMediaType(
  value: string,
): value is AcceptedImageMediaType {
  return (ACCEPTED as readonly string[]).includes(value);
}

/** Detect format from magic bytes; do not trust the browser File.type alone. */
export function detectImageMediaType(
  bytes: Uint8Array,
): AcceptedImageMediaType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function resolveImageMediaType(
  bytes: Uint8Array,
  declared?: string,
): AcceptedImageMediaType | null {
  const detected = detectImageMediaType(bytes);
  if (detected) return detected;
  if (declared && isAcceptedImageMediaType(declared)) return declared;
  return null;
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = Buffer.from(base64, "base64");
  return new Uint8Array(binary);
}

export function resolveImageMediaTypeFromBase64(
  imageBase64: string,
  declared?: string,
): AcceptedImageMediaType | null {
  try {
    return resolveImageMediaType(base64ToBytes(imageBase64), declared);
  } catch {
    return null;
  }
}
