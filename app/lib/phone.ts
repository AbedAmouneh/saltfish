/**
 * Turns what guests type ("03 123 456", "+961 3 123 456", "0096170123456")
 * into WhatsApp's international format without "+": "9613123456".
 * Lebanese numbers are assumed when no country code is given.
 */
export function toWhatsappNumber(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("961")) return `961${d.slice(3).replace(/^0/, "")}`;
  if (d.startsWith("0")) return `961${d.slice(1)}`;
  if (d.length <= 8) return `961${d}`;
  return d;
}
