export function applyPhoneMask(raw: string): string {
  if (!raw) return "";

  const value = raw.startsWith("+") ? raw : "+55 " + raw;
  const digits = value.slice(1).replace(/\D/g, "");

  if (digits.length === 0) return "+";

  if (digits.startsWith("55")) {
    let result = "+55";
    if (digits.length > 2) result += " " + digits.slice(2, 4);
    if (digits.length > 4) result += " " + digits.slice(4, 9);
    if (digits.length > 9) result += "-" + digits.slice(9, 13);
    return result;
  }

  return "+" + digits.slice(0, 15);
}
