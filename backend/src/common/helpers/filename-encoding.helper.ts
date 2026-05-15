import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import * as multer from "multer";

/**
 * Check if a string contains garbled UTF-8 characters
 * This happens when UTF-8 bytes are incorrectly interpreted as Latin1
 *
 * Example:
 * - Correct UTF-8: "Thư mời nhận việc"
 * - Garbled (UTF-8 as Latin1): "ThÆ° má»\x9Di nháº­n viá»\x87c"
 */
export function isGarbledUTF8(str: string): boolean {
  // Check for common garbled patterns (Latin1 misinterpretation of UTF-8)
  // Vietnamese UTF-8 characters wrongly decoded as Latin1 will have patterns like:
  // Ã, á», Ä, etc. followed by high bytes (0x80-0xBF)
  const garbledPatterns = [
    /Ã[\x80-\xBF]/, // UTF-8 2-byte sequences seen as Latin1
    /á»[\x80-\xBF]/, // Vietnamese UTF-8 patterns
    /Ã¡/, // Common pattern for Vietnamese vowels
    /Ä[\x80-\xBF]/, // Vietnamese Đ and other chars
  ];

  return garbledPatterns.some((pattern) => pattern.test(str));
}

/**
 * Decode filename from Latin1 to UTF-8 ONLY if it's garbled
 * Modern browsers send UTF-8 correctly, so we should only decode when needed
 *
 * @param filename - The original filename from multer
 * @returns Properly decoded UTF-8 filename
 */
export function decodeFilename(filename: string): string {
  if (!filename) return filename;

  try {
    // Only decode if the filename appears to be garbled
    if (isGarbledUTF8(filename)) {
      // Convert from Latin1 (ISO-8859-1) to UTF-8
      const buffer = Buffer.from(filename, "latin1");
      const decoded = buffer.toString("utf8");
      return decoded;
    }

    // If filename is already correct UTF-8, return as-is
    return filename;
  } catch (error) {
    console.error(`Error decoding filename: ${error}`);
    return filename; // Return original if decoding fails
  }
}

/**
 * Multer configuration with smart UTF-8 filename handling
 * Automatically detects and fixes garbled Vietnamese filenames
 */
export const multerConfig: MulterOptions = {
  storage: multer.memoryStorage(),
  preservePath: false,
  // Custom file filter to properly handle UTF-8 filenames
  fileFilter: (req, file, cb) => {
    // Decode filename if garbled (UTF-8 bytes interpreted as Latin1)
    if (file.originalname) {
      file.originalname = decodeFilename(file.originalname);
    }
    cb(null, true);
  },
};
