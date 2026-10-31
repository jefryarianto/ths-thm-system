export function getForumAuthorName(
  author?: { namaLengkap?: string | null } | null,
  authorName?: string | null,
): string {
  return author?.namaLengkap?.trim() || authorName?.trim() || 'Admin';
}

export function getForumAuthorInitial(
  author?: { namaLengkap?: string | null } | null,
  authorName?: string | null,
): string {
  const name = getForumAuthorName(author, authorName);
  if (!name) return 'A';
  return name.charAt(0).toUpperCase();
}
