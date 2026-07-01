import { buildRushTvDetailUrl, type RushTvMediaType } from './rushtv-deeplink';

type AvailabilityResponse = {
  configured: boolean;
  items: Record<string, { available: boolean }>;
};

export async function hydrateRushtvButtons(): Promise<void> {
  const buttons = Array.from(document.querySelectorAll<HTMLAnchorElement>('.rushtv-cta[data-tmdb-key]'));
  if (!buttons.length) return;

  const keys = [...new Set(buttons.map((b) => b.dataset.tmdbKey).filter(Boolean))] as string[];

  let data: AvailabilityResponse = { configured: false, items: {} };
  try {
    const res = await fetch(`/api/availability?ids=${encodeURIComponent(keys.join(','))}`);
    if (res.ok) data = (await res.json()) as AvailabilityResponse;
  } catch {
    /* fall through to request label */
  }

  for (const btn of buttons) {
    const key = btn.dataset.tmdbKey;
    const mediaType = btn.dataset.mediaType as RushTvMediaType | undefined;
    const tmdbId = Number(btn.dataset.tmdbId);
    const label = btn.querySelector('.rushtv-cta-label');
    if (!key || !label || !mediaType || !Number.isFinite(tmdbId)) continue;

    const available = data.configured ? data.items[key]?.available === true : false;
    label.textContent = available ? 'Available on RushTV' : 'Request on RushTV';
    btn.href = buildRushTvDetailUrl(tmdbId, mediaType, available ? undefined : 'request');
    btn.classList.remove('rushtv-cta--loading', 'rushtv-cta--available', 'rushtv-cta--request');
    btn.classList.add(available ? 'rushtv-cta--available' : 'rushtv-cta--request');
    btn.setAttribute('aria-label', label.textContent);
  }
}
