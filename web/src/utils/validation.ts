const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: "Unsupported file format. Please upload a JPG, JPEG, or PNG image." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "File size exceeds the 10 MB limit." };
  }
  if (file.size === 0) {
    return { valid: false, error: "Unable to read this image. Please select another file." };
  }
  return { valid: true };
}
