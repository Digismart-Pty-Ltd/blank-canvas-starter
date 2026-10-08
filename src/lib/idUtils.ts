// @/lib/idUtils.ts

export type Gender = "Male" | "Female" | "Unknown";

/**
 * Extract gender from a South African ID number
 * SA ID format: YYMMDDGGGGGCAZ
 * Gender code: 0000-4999 = Female, 5000-9999 = Male
 */
export function extractGenderFromSAID(idNumber: string): Gender {
  if (!idNumber || idNumber.length < 7) return "Unknown";
  
  // Extract the gender digits (positions 6-10, which is the 5-digit gender sequence)
  const genderCode = parseInt(idNumber.substring(6, 10), 10);
  
  if (isNaN(genderCode)) return "Unknown";
  
  if (genderCode >= 0 && genderCode <= 4999) return "Female";
  if (genderCode >= 5000 && genderCode <= 9999) return "Male";
  
  return "Unknown";
}

export function isValidSAID(idNumber: string): boolean {
  // 13-digit South African ID
  return /^\d{13}$/.test(idNumber);
}