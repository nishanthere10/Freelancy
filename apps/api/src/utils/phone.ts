/**
 * Phone number normalization and E.164 validation utility.
 * ITU-T E.164 standard defines international public telecommunication numbering:
 * Format: +<country_code><subscriber_number> (max 15 digits, minimum 8 digits).
 */

export interface PhoneNormalizationResult {
  valid: boolean;
  e164?: string;
  error?: string;
}

/**
 * Normalizes an arbitrary phone string into canonical E.164 format (+XXXXXXXXXXX).
 *
 * @param input - The raw input phone string
 * @param defaultCountryCode - Optional default country code if missing (default: "91" for IN, or "" to require explicit +)
 */
export function normalizeE164(
  input?: string | null,
  defaultCountryCode: string = "91",
): PhoneNormalizationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Phone number is required" };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Phone number cannot be empty" };
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  // Strip all non-digit characters
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (digitsOnly.length < 8) {
    return {
      valid: false,
      error: "Phone number is too short (minimum 8 digits required)",
    };
  }

  if (digitsOnly.length > 15) {
    return {
      valid: false,
      error: "Phone number is too long (maximum 15 digits per E.164)",
    };
  }

  let canonicalDigits = digitsOnly;

  if (!hasLeadingPlus) {
    // If standard 10-digit number without country code, prefix with defaultCountryCode
    if (digitsOnly.length === 10 && defaultCountryCode) {
      canonicalDigits = `${defaultCountryCode.replace(/\D/g, "")}${digitsOnly}`;
    }
  }

  const e164 = `+${canonicalDigits}`;

  return {
    valid: true,
    e164,
  };
}

/**
 * Validates whether a phone number adheres strictly to E.164 format.
 */
export function isValidE164(phone?: string | null): boolean {
  if (!phone) return false;
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
