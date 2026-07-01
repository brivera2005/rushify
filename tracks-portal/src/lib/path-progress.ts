import type { EnrichedSequenceItem, MapNode, TrackMap, TrackProgressState } from './types';

export const PROGRESS_KEY = (trackId: string) => `rushtracks-progress-${trackId}`;
const LEGACY_PATH_KEY = (trackId: string) => `rushtracks-path-${trackId}`;

export type NodeVisualState = 'completed' | 'current' | 'available' | 'locked' | 'skipped';

export interface JourneyChoiceOption {
  nodeId: string;
  itemId: string;
  item: EnrichedSequenceItem;
}

export interface JourneyLayer {
  layer: number;
  kind: 'steps' | 'choice';
  nodes: MapNode[];
  choiceOptions?: JourneyChoiceOption[];
  choiceItemId?: string;
  choiceLabel?: string;
}

export function typeLabel(type: string): string {
  switch (type) {
    case 'book':
      return 'Book';
    case 'show':
      return 'Series';
    case 'documentary':
      return 'Documentary';
    case 'boardgame':
      return 'Board Game';
    case 'videogame':
      return 'Video Game';
    case 'crossroads':
      return 'Choice';
    default:
      return 'Film';
  }
}

export function typeIcon(type: string): string {
  switch (type) {
    case 'book':
      return '📖';
    case 'show':
      return '📺';
    case 'documentary':
      return '🎬';
    case 'boardgame':
      return '🎲';
    case 'videogame':
      return '🎮';
    case 'crossroads':
      return '◇';
    default:
      return '🎞️';
  }
}

export function isOptionalItem(item: EnrichedSequenceItem | undefined): boolean {
  if (!item) return false;
  return item.required === false || item.type === 'videogame' || item.type === 'boardgame';
}

export function isCoreItem(item: EnrichedSequenceItem | undefined): boolean {
  if (!item) return false;
  return item.type !== 'crossroads' && !isOptionalItem(item);
}

export function itemImage(item: EnrichedSequenceItem | undefined): string | undefined {
  return item?.metadata?.posterUrl || item?.metadata?.coverUrl;
}

export function parentNodeIds(map: TrackMap, nodeId: string): string[] {
  return map.edges.filter((e) => e.to === nodeId).map((e) => e.from);
}

export function childNodeIds(map: TrackMap, nodeId: string): MapNode[] {
  return map.edges
    .filter((e) => e.from === nodeId)
    .map((e) => map.nodes.find((n) => n.id === e.to))
    .filter((n): n is MapNode => Boolean(n));
}

export function buildJourneyLayers(
  map: TrackMap,
  sequence: EnrichedSequenceItem[],
): JourneyLayer[] {
  const itemById = Object.fromEntries(
    sequence.filter((s) => s.id).map((s) => [s.id!, s]),
  );
  const maxLayer = Math.max(...map.nodes.map((n) => n.layer));
  const consumed = new Set<number>();
  const layers: JourneyLayer[] = [];

  for (let layer = 0; layer <= maxLayer; layer += 1) {
    if (consumed.has(layer)) continue;

    const nodes = map.nodes.filter((n) => n.layer === layer).sort((a, b) => a.slot - b.slot);
    if (!nodes.length) continue;

    const crossNode = nodes.find((n) => itemById[n.itemId]?.type === 'crossroads');

    if (crossNode) {
      const options = childNodeIds(map, crossNode.id).map((child) => ({
        nodeId: child.id,
        itemId: child.itemId,
        item: itemById[child.itemId],
      }));
      options.forEach((o) => consumed.add(map.nodes.find((n) => n.id === o.nodeId)!.layer));
      const crossItem = itemById[crossNode.itemId];
      layers.push({
        layer,
        kind: 'choice',
        nodes: [crossNode],
        choiceOptions: options,
        choiceItemId: crossNode.itemId,
        choiceLabel: crossItem?.label || 'Pick one path',
      });
      continue;
    }

    if (nodes.length > 1) {
      const parentKeys = nodes.map((n) => parentNodeIds(map, n.id).sort().join(','));
      const implicitBranch = parentKeys.every((p) => p === parentKeys[0] && p.length > 0);
      if (implicitBranch) {
        layers.push({
          layer,
          kind: 'choice',
          nodes,
          choiceOptions: nodes.map((n) => ({
            nodeId: n.id,
            itemId: n.itemId,
            item: itemById[n.itemId],
          })),
          choiceLabel: 'Pick one path',
        });
        continue;
      }
    }

    layers.push({ layer, kind: 'steps', nodes });
  }

  return layers;
}

export interface ExtendedProgressState extends TrackProgressState {
  branchPicks?: Record<string, string>;
  skippedItems?: string[];
}

export function emptyProgress(): ExtendedProgressState {
  return {
    chosenPath: [],
    completedNodes: [],
    branchPicks: {},
    skippedItems: [],
    lastVisited: new Date().toISOString(),
  };
}

export function migrateLegacyPath(trackId: string, map: TrackMap): ExtendedProgressState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_PATH_KEY(trackId));
    if (!raw) return null;
    const legacy = JSON.parse(raw) as {
      chosenItems?: string[];
      skippedItems?: string[];
    };
    const itemToNode = Object.fromEntries(map.nodes.map((n) => [n.itemId, n.id]));
    const chosenPath = (legacy.chosenItems || [])
      .map((itemId) => itemToNode[itemId])
      .filter(Boolean) as string[];
    return {
      chosenPath,
      completedNodes: [],
      branchPicks: {},
      skippedItems: legacy.skippedItems || [],
      lastVisited: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function loadProgress(trackId: string, map?: TrackMap): ExtendedProgressState {
  if (typeof localStorage === 'undefined') return emptyProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(trackId));
    if (raw) {
      const parsed = JSON.parse(raw) as ExtendedProgressState;
      return {
        ...emptyProgress(),
        ...parsed,
        branchPicks: parsed.branchPicks || {},
        skippedItems: parsed.skippedItems || [],
      };
    }
    if (map) {
      const migrated = migrateLegacyPath(trackId, map);
      if (migrated) return migrated;
    }
  } catch {
    /* ignore */
  }
  return emptyProgress();
}

export function saveProgress(trackId: string, state: ExtendedProgressState): void {
  state.lastVisited = new Date().toISOString();
  localStorage.setItem(PROGRESS_KEY(trackId), JSON.stringify(state));
}

export function actionVerb(item: EnrichedSequenceItem | undefined): string {
  if (!item) return 'exploring';
  switch (item.type) {
    case 'book':
      return 'reading';
    case 'show':
    case 'movie':
    case 'documentary':
      return 'watching';
    case 'videogame':
      return 'playing';
    case 'boardgame':
      return 'playing';
    default:
      return 'on';
  }
}

export function countCoreSteps(layers: JourneyLayer[], sequence: EnrichedSequenceItem[]): number {
  const itemById = Object.fromEntries(sequence.filter((s) => s.id).map((s) => [s.id!, s]));
  let count = 0;
  for (const layer of layers) {
    if (layer.kind === 'choice') {
      const coreOptions = (layer.choiceOptions || []).filter((o) => isCoreItem(o.item));
      if (coreOptions.length > 1) count += 1;
      else if (coreOptions.length === 1) count += 1;
    } else {
      count += layer.nodes.filter((n) => isCoreItem(itemById[n.itemId])).length;
    }
  }
  return Math.max(count, 1);
}
