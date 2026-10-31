export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const w = parts[0];
    return w.slice(0, 3).toUpperCase();
  }
  if (parts.length === 2) {
    return (parts[0][0] + parts[1].slice(0, 2)).toUpperCase();
  }
  return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
}
