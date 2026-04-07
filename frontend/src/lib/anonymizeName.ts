/**
 * Anonymizes a full name for display on public screens.
 *
 * Rules (SPEC-009):
 *   - Single term  → returned as-is ("María" → "María")
 *   - Two+ terms   → first name + initials: "Juan Carlos Pérez" → "Juan C. P."
 *   - Empty/blank  → returned as-is (no crash)
 */
export function anonymizeName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return trimmed;

  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;

  const [first, ...rest] = parts;
  const initials = rest.map((p) => `${p[0].toUpperCase()}.`).join(" ");
  return `${first} ${initials}`;
}
