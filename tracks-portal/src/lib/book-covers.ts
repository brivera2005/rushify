export type CoverSize = 'S' | 'M' | 'L';

export function openLibraryCoverSize(url: string | undefined, size: CoverSize): string | undefined {
  if (!url) return undefined;
  if (!url.includes('covers.openlibrary.org')) return url;
  return url.replace(/-[SML]\.jpg(\?.*)?$/, `-${size}.jpg`);
}

export function isOpenLibraryCover(url: string | undefined): boolean {
  return Boolean(url?.includes('covers.openlibrary.org'));
}

export function bookTitleInitial(title: string): string {
  const match = title.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toUpperCase() : '?';
}
