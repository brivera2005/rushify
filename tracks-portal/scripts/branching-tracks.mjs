/** Branching track definitions — merged by merge-tracks.mjs */

export const PICK_ONE = 'Pick one in this next tier';

export const BRANCHING_TRACKS = [
  {
    id: 'digital-frontier-branching',
    title: 'Digital Frontier: Branching Paths',
    description:
      'From Neuromancer\'s consensual hallucination through the Matrix, cyber-decks, and the hacker underground.',
    tags: ['cyberpunk', 'hacking', 'sci-fi', 'branching', 'books', 'film', 'videogame', 'boardgame'],
    relatedTrackIds: ['digital-frontier', 'digital-frontier-v2'],
    sequence: [
      { id: 'dfb-book-1', type: 'book', title: 'Neuromancer', author: 'William Gibson', year: 1984 },
      {
        id: 'dfb-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'The Matrix', targetId: 'dfb-film-1', vibe: 'film' },
          { label: 'Cyberpunk 2077', targetId: 'dfb-vg-1', vibe: 'videogame', optional: true },
          { label: 'Android: Netrunner', targetId: 'dfb-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      { id: 'dfb-film-1', type: 'movie', title: 'The Matrix', year: 1999 },
      {
        id: 'dfb-vg-1',
        type: 'videogame',
        title: 'Cyberpunk 2077',
        author: 'CD Projekt Red',
        year: 2020,
        required: false,
      },
      {
        id: 'dfb-bg-1',
        type: 'boardgame',
        title: 'Android: Netrunner',
        author: 'Richard Garfield & Lukas Litzsinger',
        year: 2012,
        required: false,
      },
      {
        id: 'dfb-cross-2',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Mr. Robot', targetId: 'dfb-show-1', vibe: 'series' },
          { label: 'Hacknet', targetId: 'dfb-vg-2', vibe: 'videogame', optional: true },
        ],
      },
      { id: 'dfb-show-1', type: 'show', title: 'Mr. Robot', year: 2015 },
      {
        id: 'dfb-vg-2',
        type: 'videogame',
        title: 'Hacknet',
        author: 'Team Fractal Alligator',
        year: 2015,
        required: false,
      },
    ],
  },
  {
    id: 'pure-video-game-vibe',
    title: 'Pure Video Game Vibe',
    description:
      'A videogame-only specialty run — puzzle wit, roguelike mastery, and open-world wonder.',
    tags: ['videogame', 'branching', 'boutique', 'roguelike', 'games'],
    sequence: [
      { id: 'pvg-1', type: 'videogame', title: 'Portal', author: 'Valve', year: 2007 },
      {
        id: 'pvg-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Slay the Spire', targetId: 'pvg-2', vibe: 'roguelike' },
          { label: 'Hades', targetId: 'pvg-3', vibe: 'roguelike' },
        ],
      },
      { id: 'pvg-2', type: 'videogame', title: 'Slay the Spire', author: 'MegaCrit', year: 2019 },
      { id: 'pvg-3', type: 'videogame', title: 'Hades', author: 'Supergiant Games', year: 2020 },
      {
        id: 'pvg-cross-2',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Elden Ring', targetId: 'pvg-4', vibe: 'open world' },
          { label: 'Outer Wilds', targetId: 'pvg-5', vibe: 'exploration' },
        ],
      },
      { id: 'pvg-4', type: 'videogame', title: 'Elden Ring', author: 'FromSoftware', year: 2022 },
      { id: 'pvg-5', type: 'videogame', title: 'Outer Wilds', author: 'Mobius Digital', year: 2019 },
    ],
  },
  {
    id: 'pure-board-game-engine',
    title: 'Pure Board Game Engine',
    description:
      'A tabletop-only specialty run — settlement, engine-building, and economic warfare.',
    tags: ['boardgame', 'branching', 'strategy', 'boutique', 'games'],
    sequence: [
      { id: 'pbge-1', type: 'boardgame', title: 'Catan', author: 'Klaus Teuber', year: 1995 },
      {
        id: 'pbge-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Concordia', targetId: 'pbge-2', vibe: 'engine-building' },
          { label: 'Power Grid', targetId: 'pbge-3', vibe: 'economic' },
        ],
      },
      { id: 'pbge-2', type: 'boardgame', title: 'Concordia', author: 'Mac Gerdts', year: 2013 },
      { id: 'pbge-3', type: 'boardgame', title: 'Power Grid', author: 'Friedemann Friese', year: 2004 },
      {
        id: 'pbge-cross-2',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Brass: Birmingham', targetId: 'pbge-4', vibe: 'industrial' },
          { label: 'Food Chain Magnate', targetId: 'pbge-5', vibe: 'economic' },
        ],
      },
      { id: 'pbge-4', type: 'boardgame', title: 'Brass: Birmingham', author: 'Martin Wallace', year: 2018 },
      {
        id: 'pbge-5',
        type: 'boardgame',
        title: 'Food Chain Magnate',
        author: 'Jeroen Doumen & Joris Wiersinga',
        year: 2015,
      },
    ],
  },
  {
    id: 'sovereign-analytical-mix',
    title: 'Sovereign Analytical Mix',
    description:
      'Probability, sports analytics, and the games that teach you to think in bets.',
    tags: ['probability', 'analytics', 'branching', 'books', 'film', 'videogame', 'boardgame'],
    relatedTrackIds: ['sovereign-analytical-edge', 'sovereign-analytical-v2'],
    sequence: [
      { id: 'sam-book-1', type: 'book', title: 'Thinking in Bets', author: 'Annie Duke', year: 2018 },
      { id: 'sam-film-1', type: 'movie', title: 'Moneyball', year: 2011 },
      {
        id: 'sam-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Balatro', targetId: 'sam-vg-1', vibe: 'videogame', optional: true },
          { label: 'The Crew', targetId: 'sam-bg-1', vibe: 'boardgame', optional: true },
          { label: "Texas Hold'em", targetId: 'sam-bg-2', vibe: 'boardgame', optional: true },
        ],
      },
      { id: 'sam-vg-1', type: 'videogame', title: 'Balatro', author: 'LocalThunk', year: 2024, required: false },
      { id: 'sam-bg-1', type: 'boardgame', title: 'The Crew', author: 'Thomas Sing', year: 2019, required: false },
      {
        id: 'sam-bg-2',
        type: 'boardgame',
        title: "Texas Hold'em",
        note: 'Classic poker — any quality set or home game',
        required: false,
      },
    ],
  },
  {
    id: 'dark-fantasy-campaign',
    title: 'Dark Fantasy Campaign',
    description:
      'Grim swords, green knights, and the long campaigns that bleed into tabletop and CRPG epics.',
    tags: ['fantasy', 'grimdark', 'branching', 'books', 'film', 'videogame', 'boardgame'],
    relatedTrackIds: ['dark-fantasy-foundations', 'dark-fantasy-v2'],
    sequence: [
      { id: 'dfc-book-1', type: 'book', title: 'The Blade Itself', author: 'Joe Abercrombie', year: 2006 },
      { id: 'dfc-film-1', type: 'movie', title: 'The Green Knight', year: 2021 },
      {
        id: 'dfc-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'The Witcher 3', targetId: 'dfc-vg-1', vibe: 'videogame', optional: true },
          { label: 'Gloomhaven', targetId: 'dfc-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      {
        id: 'dfc-vg-1',
        type: 'videogame',
        title: 'The Witcher 3: Wild Hunt',
        author: 'CD Projekt Red',
        year: 2015,
        required: false,
      },
      { id: 'dfc-bg-1', type: 'boardgame', title: 'Gloomhaven', author: 'Isaac Childres', year: 2017, required: false },
    ],
  },
  {
    id: 'cosmic-horror-isolation',
    title: 'Cosmic Horror & Isolation',
    description:
      'Antarctic dread, xenomorph terror, and the games that trap you alone in the dark.',
    tags: ['horror', 'sci-fi', 'branching', 'books', 'film', 'videogame', 'boardgame'],
    relatedTrackIds: ['cosmic-horror'],
    sequence: [
      {
        id: 'chi-book-1',
        type: 'book',
        title: 'At the Mountains of Madness',
        author: 'H.P. Lovecraft',
        year: 1936,
      },
      { id: 'chi-film-1', type: 'movie', title: 'Alien', year: 1979 },
      {
        id: 'chi-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Alien: Isolation', targetId: 'chi-vg-1', vibe: 'videogame', optional: true },
          { label: 'Nemesis', targetId: 'chi-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      {
        id: 'chi-vg-1',
        type: 'videogame',
        title: 'Alien: Isolation',
        author: 'Creative Assembly',
        year: 2014,
        required: false,
      },
      { id: 'chi-bg-1', type: 'boardgame', title: 'Nemesis', author: 'Awaken Realms', year: 2018, required: false },
    ],
  },
  {
    id: 'epic-fantasy-tapestry',
    title: 'Epic Fantasy Tapestry',
    description:
      'From Wheel of Time beginnings to Return of the King — then pick your AAA or boutique finale.',
    tags: ['fantasy', 'epic', 'branching', 'aaa', 'boutique', 'books', 'film', 'videogame', 'boardgame'],
    relatedTrackIds: ['gateway-fantasy', 'dark-fantasy-foundations'],
    sequence: [
      { id: 'eft-book-1', type: 'book', title: 'The Eye of the World', author: 'Robert Jordan', year: 1990 },
      {
        id: 'eft-film-1',
        type: 'movie',
        title: 'The Lord of the Rings: The Return of the King',
        year: 2003,
      },
      {
        id: 'eft-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: "Baldur's Gate 3", targetId: 'eft-vg-1', vibe: 'videogame', optional: true },
          { label: 'Hollow Knight', targetId: 'eft-vg-2', vibe: 'videogame', optional: true },
          { label: 'War of the Ring', targetId: 'eft-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      { id: 'eft-vg-1', type: 'videogame', title: "Baldur's Gate 3", author: 'Larian Studios', year: 2023, required: false },
      { id: 'eft-vg-2', type: 'videogame', title: 'Hollow Knight', author: 'Team Cherry', year: 2017, required: false },
      { id: 'eft-bg-1', type: 'boardgame', title: 'War of the Ring', author: 'Roberto Di Meglio', year: 2012, required: false },
    ],
  },
  {
    id: 'grimdark-ascendant',
    title: 'Grimdark Ascendant',
    description:
      'Mercenary companies, cursed manga, and the punishing games that define grimdark ascension.',
    tags: ['grimdark', 'fantasy', 'horror', 'branching', 'aaa', 'boutique', 'books', 'videogame', 'boardgame'],
    sequence: [
      { id: 'ga-book-1', type: 'book', title: 'The Black Company', author: 'Glen Cook', year: 1984 },
      { id: 'ga-show-1', type: 'show', title: 'Berserk (1997)', year: 1997 },
      {
        id: 'ga-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Dark Souls', targetId: 'ga-vg-1', vibe: 'videogame', optional: true },
          { label: 'Fear & Hunger', targetId: 'ga-vg-2', vibe: 'videogame', optional: true },
          { label: 'Kingdom Death: Monster', targetId: 'ga-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      { id: 'ga-vg-1', type: 'videogame', title: 'Dark Souls', author: 'FromSoftware', year: 2011, required: false },
      { id: 'ga-vg-2', type: 'videogame', title: 'Fear & Hunger', author: 'Happy Paintings', year: 2018, required: false },
      {
        id: 'ga-bg-1',
        type: 'boardgame',
        title: 'Kingdom Death: Monster',
        author: 'Adam Poots',
        year: 2015,
        required: false,
      },
    ],
  },
  {
    id: 'horror-evolution',
    title: 'Horror Evolution',
    description:
      'Literary hauntings to Hereditary dread — then the games that modernize cosmic and co-op terror.',
    tags: ['horror', 'branching', 'aaa', 'boutique', 'books', 'film', 'videogame', 'boardgame'],
    relatedTrackIds: ['cosmic-horror', 'folk-horror-pagan'],
    sequence: [
      {
        id: 'he-book-1',
        type: 'book',
        title: 'The Haunting of Hill House',
        author: 'Shirley Jackson',
        year: 1959,
      },
      { id: 'he-film-1', type: 'movie', title: 'Hereditary', year: 2018 },
      {
        id: 'he-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Signalis', targetId: 'he-vg-1', vibe: 'videogame', optional: true },
          { label: 'Lethal Company', targetId: 'he-vg-2', vibe: 'videogame', optional: true },
          { label: 'Mansions of Madness', targetId: 'he-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      { id: 'he-vg-1', type: 'videogame', title: 'Signalis', author: 'rose-engine', year: 2022, required: false },
      { id: 'he-vg-2', type: 'videogame', title: 'Lethal Company', author: 'Zeekerss', year: 2023, required: false },
      {
        id: 'he-bg-1',
        type: 'boardgame',
        title: 'Mansions of Madness',
        author: 'Fantasy Flight Games',
        year: 2011,
        required: false,
      },
    ],
  },
  {
    id: 'automation-engine',
    title: 'Automation Engine',
    description:
      'Murderbot diplomacy to Devs paranoia — then the factory sims and logic puzzles that optimize everything.',
    tags: ['automation', 'sci-fi', 'branching', 'aaa', 'boutique', 'books', 'film', 'videogame', 'boardgame'],
    sequence: [
      { id: 'ae-book-1', type: 'book', title: 'All Systems Red', author: 'Martha Wells', year: 2017 },
      { id: 'ae-show-1', type: 'show', title: 'Devs', year: 2020 },
      {
        id: 'ae-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Factorio', targetId: 'ae-vg-1', vibe: 'videogame', optional: true },
          { label: 'Satisfactory', targetId: 'ae-vg-2', vibe: 'videogame', optional: true },
          { label: 'Turing Machine', targetId: 'ae-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      { id: 'ae-vg-1', type: 'videogame', title: 'Factorio', author: 'Wube Software', year: 2020, required: false },
      { id: 'ae-vg-2', type: 'videogame', title: 'Satisfactory', author: 'Coffee Stain Studios', year: 2019, required: false },
      { id: 'ae-bg-1', type: 'boardgame', title: 'Turing Machine', author: 'SCORPIO', year: 2023, required: false },
    ],
  },
  {
    id: 'indie-artisan',
    title: 'Indie Artisan',
    description:
      'Friendship and game design in prose and film — then the indie masterpieces that define boutique craft.',
    tags: ['indie', 'branching', 'boutique', 'books', 'documentary', 'videogame', 'boardgame'],
    sequence: [
      {
        id: 'ia-book-1',
        type: 'book',
        title: 'Tomorrow, and Tomorrow, and Tomorrow',
        author: 'Gabrielle Zevin',
        year: 2022,
      },
      { id: 'ia-doc-1', type: 'documentary', title: 'Indie Game: The Movie', year: 2012 },
      {
        id: 'ia-cross-1',
        type: 'crossroads',
        label: PICK_ONE,
        choices: [
          { label: 'Stardew Valley', targetId: 'ia-vg-1', vibe: 'videogame', optional: true },
          { label: 'Celeste', targetId: 'ia-vg-2', vibe: 'videogame', optional: true },
          { label: 'Pax Pamir', targetId: 'ia-bg-1', vibe: 'boardgame', optional: true },
        ],
      },
      { id: 'ia-vg-1', type: 'videogame', title: 'Stardew Valley', author: 'ConcernedApe', year: 2016, required: false },
      { id: 'ia-vg-2', type: 'videogame', title: 'Celeste', author: 'Maddy Makes Games', year: 2018, required: false },
      { id: 'ia-bg-1', type: 'boardgame', title: 'Pax Pamir', author: 'Phil Eklund', year: 2019, required: false },
    ],
  },
];

export const BRANCHING_MAPS = {
  'digital-frontier-branching': {
    nodes: [
      { id: 'dfb-n0', itemId: 'dfb-book-1', layer: 0, slot: 1 },
      { id: 'dfb-n1', itemId: 'dfb-cross-1', layer: 1, slot: 1 },
      { id: 'dfb-n2', itemId: 'dfb-film-1', layer: 2, slot: 0 },
      { id: 'dfb-n3', itemId: 'dfb-vg-1', layer: 2, slot: 1 },
      { id: 'dfb-n4', itemId: 'dfb-bg-1', layer: 2, slot: 2 },
      { id: 'dfb-n5', itemId: 'dfb-cross-2', layer: 3, slot: 1 },
      { id: 'dfb-n6', itemId: 'dfb-show-1', layer: 4, slot: 0 },
      { id: 'dfb-n7', itemId: 'dfb-vg-2', layer: 4, slot: 2 },
    ],
    edges: [
      { from: 'dfb-n0', to: 'dfb-n1' },
      { from: 'dfb-n1', to: 'dfb-n2' },
      { from: 'dfb-n1', to: 'dfb-n3' },
      { from: 'dfb-n1', to: 'dfb-n4' },
      { from: 'dfb-n2', to: 'dfb-n5' },
      { from: 'dfb-n3', to: 'dfb-n5' },
      { from: 'dfb-n4', to: 'dfb-n5' },
      { from: 'dfb-n5', to: 'dfb-n6' },
      { from: 'dfb-n5', to: 'dfb-n7' },
    ],
  },
  'pure-video-game-vibe': {
    nodes: [
      { id: 'pvg-n0', itemId: 'pvg-1', layer: 0, slot: 1 },
      { id: 'pvg-n1', itemId: 'pvg-cross-1', layer: 1, slot: 1 },
      { id: 'pvg-n2', itemId: 'pvg-2', layer: 2, slot: 0 },
      { id: 'pvg-n3', itemId: 'pvg-3', layer: 2, slot: 2 },
      { id: 'pvg-n4', itemId: 'pvg-cross-2', layer: 3, slot: 1 },
      { id: 'pvg-n5', itemId: 'pvg-4', layer: 4, slot: 0 },
      { id: 'pvg-n6', itemId: 'pvg-5', layer: 4, slot: 2 },
    ],
    edges: [
      { from: 'pvg-n0', to: 'pvg-n1' },
      { from: 'pvg-n1', to: 'pvg-n2' },
      { from: 'pvg-n1', to: 'pvg-n3' },
      { from: 'pvg-n2', to: 'pvg-n4' },
      { from: 'pvg-n3', to: 'pvg-n4' },
      { from: 'pvg-n4', to: 'pvg-n5' },
      { from: 'pvg-n4', to: 'pvg-n6' },
    ],
  },
  'pure-board-game-engine': {
    nodes: [
      { id: 'pbge-n0', itemId: 'pbge-1', layer: 0, slot: 1 },
      { id: 'pbge-n1', itemId: 'pbge-cross-1', layer: 1, slot: 1 },
      { id: 'pbge-n2', itemId: 'pbge-2', layer: 2, slot: 0 },
      { id: 'pbge-n3', itemId: 'pbge-3', layer: 2, slot: 2 },
      { id: 'pbge-n4', itemId: 'pbge-cross-2', layer: 3, slot: 1 },
      { id: 'pbge-n5', itemId: 'pbge-4', layer: 4, slot: 0 },
      { id: 'pbge-n6', itemId: 'pbge-5', layer: 4, slot: 2 },
    ],
    edges: [
      { from: 'pbge-n0', to: 'pbge-n1' },
      { from: 'pbge-n1', to: 'pbge-n2' },
      { from: 'pbge-n1', to: 'pbge-n3' },
      { from: 'pbge-n2', to: 'pbge-n4' },
      { from: 'pbge-n3', to: 'pbge-n4' },
      { from: 'pbge-n4', to: 'pbge-n5' },
      { from: 'pbge-n4', to: 'pbge-n6' },
    ],
  },
  'sovereign-analytical-mix': {
    nodes: [
      { id: 'sam-n0', itemId: 'sam-book-1', layer: 0, slot: 1 },
      { id: 'sam-n1', itemId: 'sam-film-1', layer: 1, slot: 1 },
      { id: 'sam-n2', itemId: 'sam-cross-1', layer: 2, slot: 1 },
      { id: 'sam-n3', itemId: 'sam-vg-1', layer: 3, slot: 0 },
      { id: 'sam-n4', itemId: 'sam-bg-1', layer: 3, slot: 1 },
      { id: 'sam-n5', itemId: 'sam-bg-2', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'sam-n0', to: 'sam-n1' },
      { from: 'sam-n1', to: 'sam-n2' },
      { from: 'sam-n2', to: 'sam-n3' },
      { from: 'sam-n2', to: 'sam-n4' },
      { from: 'sam-n2', to: 'sam-n5' },
    ],
  },
  'dark-fantasy-campaign': {
    nodes: [
      { id: 'dfc-n0', itemId: 'dfc-book-1', layer: 0, slot: 1 },
      { id: 'dfc-n1', itemId: 'dfc-film-1', layer: 1, slot: 1 },
      { id: 'dfc-n2', itemId: 'dfc-cross-1', layer: 2, slot: 1 },
      { id: 'dfc-n3', itemId: 'dfc-vg-1', layer: 3, slot: 0 },
      { id: 'dfc-n4', itemId: 'dfc-bg-1', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'dfc-n0', to: 'dfc-n1' },
      { from: 'dfc-n1', to: 'dfc-n2' },
      { from: 'dfc-n2', to: 'dfc-n3' },
      { from: 'dfc-n2', to: 'dfc-n4' },
    ],
  },
  'cosmic-horror-isolation': {
    nodes: [
      { id: 'chi-n0', itemId: 'chi-book-1', layer: 0, slot: 1 },
      { id: 'chi-n1', itemId: 'chi-film-1', layer: 1, slot: 1 },
      { id: 'chi-n2', itemId: 'chi-cross-1', layer: 2, slot: 1 },
      { id: 'chi-n3', itemId: 'chi-vg-1', layer: 3, slot: 0 },
      { id: 'chi-n4', itemId: 'chi-bg-1', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'chi-n0', to: 'chi-n1' },
      { from: 'chi-n1', to: 'chi-n2' },
      { from: 'chi-n2', to: 'chi-n3' },
      { from: 'chi-n2', to: 'chi-n4' },
    ],
  },
  'epic-fantasy-tapestry': {
    nodes: [
      { id: 'eft-n0', itemId: 'eft-book-1', layer: 0, slot: 1 },
      { id: 'eft-n1', itemId: 'eft-film-1', layer: 1, slot: 1 },
      { id: 'eft-n2', itemId: 'eft-cross-1', layer: 2, slot: 1 },
      { id: 'eft-n3', itemId: 'eft-vg-1', layer: 3, slot: 0 },
      { id: 'eft-n4', itemId: 'eft-vg-2', layer: 3, slot: 1 },
      { id: 'eft-n5', itemId: 'eft-bg-1', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'eft-n0', to: 'eft-n1' },
      { from: 'eft-n1', to: 'eft-n2' },
      { from: 'eft-n2', to: 'eft-n3' },
      { from: 'eft-n2', to: 'eft-n4' },
      { from: 'eft-n2', to: 'eft-n5' },
    ],
  },
  'grimdark-ascendant': {
    nodes: [
      { id: 'ga-n0', itemId: 'ga-book-1', layer: 0, slot: 1 },
      { id: 'ga-n1', itemId: 'ga-show-1', layer: 1, slot: 1 },
      { id: 'ga-n2', itemId: 'ga-cross-1', layer: 2, slot: 1 },
      { id: 'ga-n3', itemId: 'ga-vg-1', layer: 3, slot: 0 },
      { id: 'ga-n4', itemId: 'ga-vg-2', layer: 3, slot: 1 },
      { id: 'ga-n5', itemId: 'ga-bg-1', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'ga-n0', to: 'ga-n1' },
      { from: 'ga-n1', to: 'ga-n2' },
      { from: 'ga-n2', to: 'ga-n3' },
      { from: 'ga-n2', to: 'ga-n4' },
      { from: 'ga-n2', to: 'ga-n5' },
    ],
  },
  'horror-evolution': {
    nodes: [
      { id: 'he-n0', itemId: 'he-book-1', layer: 0, slot: 1 },
      { id: 'he-n1', itemId: 'he-film-1', layer: 1, slot: 1 },
      { id: 'he-n2', itemId: 'he-cross-1', layer: 2, slot: 1 },
      { id: 'he-n3', itemId: 'he-vg-1', layer: 3, slot: 0 },
      { id: 'he-n4', itemId: 'he-vg-2', layer: 3, slot: 1 },
      { id: 'he-n5', itemId: 'he-bg-1', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'he-n0', to: 'he-n1' },
      { from: 'he-n1', to: 'he-n2' },
      { from: 'he-n2', to: 'he-n3' },
      { from: 'he-n2', to: 'he-n4' },
      { from: 'he-n2', to: 'he-n5' },
    ],
  },
  'automation-engine': {
    nodes: [
      { id: 'ae-n0', itemId: 'ae-book-1', layer: 0, slot: 1 },
      { id: 'ae-n1', itemId: 'ae-show-1', layer: 1, slot: 1 },
      { id: 'ae-n2', itemId: 'ae-cross-1', layer: 2, slot: 1 },
      { id: 'ae-n3', itemId: 'ae-vg-1', layer: 3, slot: 0 },
      { id: 'ae-n4', itemId: 'ae-vg-2', layer: 3, slot: 1 },
      { id: 'ae-n5', itemId: 'ae-bg-1', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'ae-n0', to: 'ae-n1' },
      { from: 'ae-n1', to: 'ae-n2' },
      { from: 'ae-n2', to: 'ae-n3' },
      { from: 'ae-n2', to: 'ae-n4' },
      { from: 'ae-n2', to: 'ae-n5' },
    ],
  },
  'indie-artisan': {
    nodes: [
      { id: 'ia-n0', itemId: 'ia-book-1', layer: 0, slot: 1 },
      { id: 'ia-n1', itemId: 'ia-doc-1', layer: 1, slot: 1 },
      { id: 'ia-n2', itemId: 'ia-cross-1', layer: 2, slot: 1 },
      { id: 'ia-n3', itemId: 'ia-vg-1', layer: 3, slot: 0 },
      { id: 'ia-n4', itemId: 'ia-vg-2', layer: 3, slot: 1 },
      { id: 'ia-n5', itemId: 'ia-bg-1', layer: 3, slot: 2 },
    ],
    edges: [
      { from: 'ia-n0', to: 'ia-n1' },
      { from: 'ia-n1', to: 'ia-n2' },
      { from: 'ia-n2', to: 'ia-n3' },
      { from: 'ia-n2', to: 'ia-n4' },
      { from: 'ia-n2', to: 'ia-n5' },
    ],
  },
};
