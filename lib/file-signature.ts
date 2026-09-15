// Tipo real de un archivo por sus primeros bytes (C-72). El tipo que manda el navegador (file.type) y el
// nombre del archivo los elige el cliente: nunca deciden la extensión con que se guarda.

export type DetectedFileType = 'png' | 'jpg' | 'webp' | 'gif' | 'pdf';

const MIME: Record<DetectedFileType, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

const startsWith = (buffer: Uint8Array, bytes: number[], offset = 0) => bytes.every((byte, i) => buffer[offset + i] === byte);

export function detectFileType(buffer: Uint8Array): DetectedFileType | null {
  if (buffer.length < 12) return null;
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpg';
  // RIFF....WEBP
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf'; // %PDF-
  return null;
}

export function mimeOf(type: DetectedFileType): string {
  return MIME[type];
}
