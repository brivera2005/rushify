/**
 * Client-side journey map: branch picks, progress header, card sync.
 */
import {
  PROGRESS_KEY,
  type ExtendedProgressState,
  emptyProgress,
  loadProgress,
  saveProgress,
} from './path-progress';

interface JourneyNodePayload {
  nodeId: string;
  itemId: string;
  title: string;
  type: string;
  optional: boolean;
}

interface JourneyLayerPayload {
  layer: number;
  kind: 'steps' | 'choice';
  choiceItemId?: string;
  nodes: JourneyNodePayload[];
}

interface InitOptions {
  trackId: string;
  layers: JourneyLayerPayload[];
  coreStepCount: number;
  mapJson: string;
}

function verbForType(type: string): string {
  switch (type) {
    case 'book':
      return 'reading';
    case 'show':
    case 'movie':
    case 'documentary':
      return 'watching';
    case 'videogame':
    case 'boardgame':
      return 'playing';
    default:
      return 'on';
  }
}

function scrollToCard(itemId: string) {
  document.getElementById(`card-${itemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function initJourneyMap(options: InitOptions): void {
  const { trackId, layers, coreStepCount, mapJson } = options;
  const map = JSON.parse(mapJson) as { edges: { from: string; to: string }[]; nodes: { id: string }[] };
  const statusEl = document.getElementById(`journey-status-${trackId}`);
  const root = document.getElementById(`journey-map-${trackId}`);
  const resetBtn = document.getElementById(`journey-reset-${trackId}`);
  if (!root) return;

  const parentOf = new Map<string, string[]>();
  for (const edge of map.edges) {
    const list = parentOf.get(edge.to) || [];
    list.push(edge.from);
    parentOf.set(edge.to, list);
  }

  let state = loadProgress(trackId, map as never);

  function branchKeyForLayer(layerNum: number): string {
    return `layer-${layerNum}`;
  }

  function isNodeReachable(nodeId: string): boolean {
    const parents = parentOf.get(nodeId) || [];
    if (!parents.length) return true;
    return parents.some((parentId) => {
      if (state.chosenPath.includes(parentId)) return true;
      const grandparents = parentOf.get(parentId) || [];
      if (!grandparents.length) return false;
      return grandparents.some((gp) => state.chosenPath.includes(gp));
    });
  }

  function getChoiceLayer(layerNum: number): JourneyLayerPayload | undefined {
    return layers.find((l) => l.layer === layerNum && l.kind === 'choice');
  }

  function pickedInLayer(layerNum: number): string | undefined {
    const key = branchKeyForLayer(layerNum);
    const itemId = state.branchPicks?.[key];
    if (itemId) return itemId;
    const choiceLayer = getChoiceLayer(layerNum);
    if (!choiceLayer) return undefined;
    return choiceLayer.nodes.find((n) => state.chosenPath.includes(n.nodeId))?.itemId;
  }

  function updateProgressHeader() {
    if (!statusEl) return;
    const completed = new Set(state.completedNodes || []);
    const doneCore = layers
      .flatMap((l) => l.nodes)
      .filter((n) => !n.optional && completed.has(n.nodeId)).length;

    let currentNode: JourneyNodePayload | undefined;
    for (const layer of layers) {
      if (layer.kind === 'choice') {
        const pick = pickedInLayer(layer.layer);
        if (!pick) {
          statusEl.textContent = `Step ${Math.min(doneCore + 1, coreStepCount)} of ${coreStepCount} · Pick one path`;
          return;
        }
        continue;
      }
      for (const node of layer.nodes) {
        if (!isNodeReachable(node.nodeId)) continue;
        if (!completed.has(node.nodeId)) {
          currentNode = node;
          break;
        }
      }
      if (currentNode) break;
    }

    if (currentNode) {
      const step = Math.min(doneCore + 1, coreStepCount);
      statusEl.textContent = `Step ${step} of ${coreStepCount} · You're ${verbForType(currentNode.type)}: ${currentNode.title}`;
      return;
    }

    statusEl.textContent =
      doneCore >= coreStepCount
        ? `Journey complete · ${doneCore} of ${coreStepCount} core stops done`
        : `Step 1 of ${coreStepCount} · Tap Start below`;
  }

  function syncCards() {
    const chosenItems = new Set<string>();
    const skipped = new Set(state.skippedItems || []);

    for (const layer of layers) {
      if (layer.kind === 'choice') {
        const pick = pickedInLayer(layer.layer);
        if (pick) chosenItems.add(pick);
        for (const node of layer.nodes) {
          if (pick && node.itemId !== pick && !node.optional) {
            skipped.add(node.itemId);
          }
        }
      } else {
        for (const node of layer.nodes) {
          if (state.chosenPath.includes(node.nodeId)) chosenItems.add(node.itemId);
        }
      }
    }

    document.querySelectorAll('.track-item-card').forEach((card) => {
      const id = (card as HTMLElement).dataset.itemId;
      if (!id) return;
      card.classList.toggle('border-copper', chosenItems.has(id));
      card.classList.toggle('ring-1', chosenItems.has(id));
      card.classList.toggle('ring-copper/35', chosenItems.has(id));
      card.classList.toggle('opacity-40', skipped.has(id));
    });
  }

  function applyVisuals() {
    root.querySelectorAll<HTMLElement>('.journey-node-card').forEach((card) => {
      const nodeId = card.dataset.nodeId!;
      const itemId = card.dataset.itemId!;
      const layerNum = Number(card.dataset.layer);
      const optional = card.dataset.optional === 'true';
      const completed = (state.completedNodes || []).includes(nodeId);
      const reachable = isNodeReachable(nodeId);
      const choiceLayer = getChoiceLayer(layerNum);
      const pick = choiceLayer ? pickedInLayer(layerNum) : undefined;
      const isSkipped = (state.skippedItems || []).includes(itemId) || (pick && pick !== itemId && !optional);
      const isSelected = pick === itemId || state.chosenPath.includes(nodeId);

      card.classList.remove(
        'journey-node-card--locked',
        'journey-node-card--current',
        'journey-node-card--completed',
        'journey-node-card--skipped',
        'journey-node-card--selected',
      );

      const badge = card.querySelector('.journey-node-badge');
      if (badge) {
        badge.className = 'journey-node-badge';
        badge.textContent = '';
      }

      if (completed) {
        card.classList.add('journey-node-card--completed');
        if (badge) {
          badge.classList.add('journey-node-badge--done');
          badge.textContent = '✓ Done';
        }
        return;
      }

      if (isSkipped) {
        card.classList.add('journey-node-card--skipped');
        if (badge) {
          badge.classList.add('journey-node-badge--skip');
          badge.textContent = 'Skipped';
        }
        return;
      }

      if (!reachable && !choiceLayer) {
        card.classList.add('journey-node-card--locked');
        return;
      }

      if (choiceLayer && !pick) {
        if (reachable) card.classList.add('journey-node-card--current');
        else card.classList.add('journey-node-card--locked');
        return;
      }

      if (isSelected) {
        card.classList.add('journey-node-card--selected');
      }

      if (reachable && !completed && !pick && !choiceLayer) {
        card.classList.add('journey-node-card--current');
      }
    });

    root.querySelectorAll<HTMLElement>('.journey-layer').forEach((layerEl) => {
      const layerNum = Number(layerEl.dataset.layer);
      const pick = pickedInLayer(layerNum);
      layerEl.classList.toggle('journey-layer--active', Boolean(pick));
      layerEl.classList.toggle('journey-layer--optional', layerEl.dataset.optional === 'true');
    });

    updateProgressHeader();
    syncCards();
    window.dispatchEvent(
      new CustomEvent('rushtracks-progress', { detail: { trackId, state } }),
    );
  }

  function persist() {
    saveProgress(trackId, state);
    applyVisuals();
  }

  function pickBranch(layerNum: number, nodeId: string, itemId: string, optional: boolean) {
    const choiceLayer = getChoiceLayer(layerNum);
    if (choiceLayer) {
      const anyReachable = choiceLayer.nodes.some((n) => isNodeReachable(n.nodeId));
      if (!anyReachable && layerNum > 0) return;
    } else if (!isNodeReachable(nodeId)) {
      return;
    }

    const key = branchKeyForLayer(layerNum);
    if (!state.branchPicks) state.branchPicks = {};
    state.branchPicks[key] = itemId;

    if (choiceLayer) {
      if (choiceLayer.choiceItemId) {
        const crossEl = document.querySelector(
          `[data-crossroads-item="${choiceLayer.choiceItemId}"]`,
        );
        const crossNodeId = crossEl?.closest('.journey-layer')?.querySelector('[data-node-id]')?.getAttribute('data-node-id');
        // Crossroads node id lives on map — find by item id in layer payload parent
        const crossroadsNode = map.nodes.find((n) => {
          const card = document.querySelector(`[data-item-id="${choiceLayer.choiceItemId}"]`);
          return false;
        });
      }

      for (const node of choiceLayer.nodes) {
        if (node.nodeId === nodeId && !state.chosenPath.includes(nodeId)) {
          state.chosenPath.push(nodeId);
        }
        if (node.itemId !== itemId && !node.optional) {
          if (!state.skippedItems) state.skippedItems = [];
          if (!state.skippedItems.includes(node.itemId)) {
            state.skippedItems.push(node.itemId);
          }
        }
      }
    } else if (!state.chosenPath.includes(nodeId)) {
      state.chosenPath.push(nodeId);
    }

    if (!optional) scrollToCard(itemId);
    persist();
  }

  root.querySelectorAll<HTMLElement>('.journey-node-card').forEach((card) => {
    card.addEventListener('click', () => {
      const nodeId = card.dataset.nodeId!;
      const itemId = card.dataset.itemId!;
      const layerNum = Number(card.dataset.layer);
      const optional = card.dataset.optional === 'true';
      const isChoice = card.dataset.isChoice === 'true';

      if (isChoice) {
        pickBranch(layerNum, nodeId, itemId, optional);
        return;
      }

      scrollToCard(itemId);
      if (!state.chosenPath.includes(nodeId)) {
        state.chosenPath.push(nodeId);
        persist();
      }
    });
  });

  resetBtn?.addEventListener('click', () => {
    if (!confirm('Start this track over? Your path choices will reset.')) return;
    state = emptyProgress();
    localStorage.removeItem(`rushtracks-path-${trackId}`);
    persist();
  });

  applyVisuals();
}
