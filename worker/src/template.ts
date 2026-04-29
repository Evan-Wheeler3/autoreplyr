export function fill(
  template: string,
  vars: { business_name?: string; owner_name?: string; booking_link?: string }
): string {
  return template
    .replace(/\{business_name\}/g, vars.business_name ?? '')
    .replace(/\{owner_name\}/g, vars.owner_name ?? '')
    .replace(/\{booking_link\}/g, vars.booking_link ?? '')
}
