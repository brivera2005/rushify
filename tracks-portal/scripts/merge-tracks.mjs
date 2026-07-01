import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACKS_PATH = join(__dirname, '..', 'src', 'data', 'tracks.json');

const V2_RELATIONS = [
  ['existential-ai', 'existential-ai-v2'],
  ['surreal-sci-fi', 'surreal-sci-fi-v2'],
  ['dark-fantasy-foundations', 'dark-fantasy-v2'],
  ['digital-frontier', 'digital-frontier-v2'],
  ['transhuman-ascent', 'transhuman-ascent-v2'],
  ['perfect-sound', 'perfect-sound-v2'],
  ['roots-of-rhythm', 'roots-of-rhythm-v2'],
  ['sovereign-analytical-edge', 'sovereign-analytical-v2'],
  ['anatomy-of-the-job', 'anatomy-of-the-job-v2'],
  ['western-requiem', 'western-requiem-v2'],
  ['architecture-of-tragedy', 'architecture-of-tragedy-v2'],
  ['craft-and-legacy', 'craft-legacy-v2'],
];

const NEW_TRACKS = [
  {"id":"existential-ai-v2","title":"Existential AI: The Ghost in the Shell","description":"Deepening the split between synthetic biology and spiritual legacy. What remains when the biological shell is gone?","tags":["v2","sci-fi","ai","philosophy","film","books","cyberpunk"],"relatedTrackIds":["existential-ai"],"sequence":[{"id":"eai2-book-1","type":"book","title":"I, Robot","author":"Isaac Asimov"},{"id":"eai2-film-1","type":"movie","title":"Ghost in the Shell","year":1995},{"id":"eai2-film-2","type":"movie","title":"A.I. Artificial Intelligence","year":2001},{"id":"eai2-film-3","type":"movie","title":"Bicentennial Man","year":1999}]},
  {"id":"surreal-sci-fi-v2","title":"Surreal Sci-Fi: Broken Dimensions","description":"A secondary deep dive into non-linear timelines, reality fractures, and the architecture of localized paradoxes.","tags":["v2","sci-fi","surreal","psychological","film","books","mind"],"relatedTrackIds":["surreal-sci-fi"],"sequence":[{"id":"ssf2-book-1","type":"book","title":"The Three-Body Problem","author":"Cixin Liu"},{"id":"ssf2-film-1","type":"movie","title":"Dark City","year":1998},{"id":"ssf2-film-2","type":"movie","title":"Coherence","year":2013},{"id":"ssf2-film-3","type":"movie","title":"Pi","year":1998}]},
  {"id":"dark-fantasy-v2","title":"Dark Fantasy: Grimdark Empires","description":"The expansion of the blood-and-dirt fantasy tradition. When institutions crumble, greed and survival dictate the realm.","tags":["v2","fantasy","dark","medieval","books","film","tv"],"relatedTrackIds":["dark-fantasy-foundations"],"sequence":[{"id":"df2-book-1","type":"book","title":"The Way of Kings","author":"Brandon Sanderson"},{"id":"df2-book-2","type":"book","title":"The Lies of Locke Lamora","author":"Scott Lynch"},{"id":"df2-film-1","type":"movie","title":"The Lord of the Rings: The Fellowship of the Ring","year":2001},{"id":"df2-show-1","type":"show","title":"The Witcher (Season 1)","year":2019}]},
  {"id":"digital-frontier-v2","title":"The Digital Frontier: Megacorporate Code","description":"Advanced cryptographic warfare, cybernetic subversion, and high-stakes operations inside the physical network.","tags":["v2","cyberpunk","sci-fi","hacking","books","film"],"relatedTrackIds":["digital-frontier"],"sequence":[{"id":"dfv2-book-1","type":"book","title":"Cryptonomicon","author":"Neal Stephenson"},{"id":"dfv2-film-1","type":"movie","title":"WarGames","year":1983},{"id":"dfv2-film-2","type":"movie","title":"The Social Network","year":2010},{"id":"dfv2-film-3","type":"movie","title":"Hackers","year":1995}]},
  {"id":"transhuman-ascent-v2","title":"The Transhuman Ascent: Cellular Optimization","description":"The biological engineering horizon. Longevity protocols, synthetic chemical boosts, and the terminal split of humanity.","tags":["v2","sci-fi","biology","longevity","philosophy","film","tv"],"relatedTrackIds":["transhuman-ascent"],"sequence":[{"id":"ta2-book-1","type":"book","title":"Lifespan: Why We Age—and Why We Don't Have To","author":"David Sinclair"},{"id":"ta2-film-1","type":"movie","title":"The Island","year":2005},{"id":"ta2-film-2","type":"movie","title":"Limitless","year":2011},{"id":"ta2-show-1","type":"show","title":"Altered Carbon (Season 1)","year":2018}]},
  {"id":"perfect-sound-v2","title":"The Perfect Sound: Studio Sorcery","description":"The engineering and creative architecture behind the desk. Tracking the manic obsession of musical production.","tags":["v2","music","art","obsession","film","documentary","books"],"relatedTrackIds":["perfect-sound"],"sequence":[{"id":"ps2-book-1","type":"book","title":"The Creative Act: A Way of Being","author":"Rick Rubin"},{"id":"ps2-film-1","type":"movie","title":"Inside Llewyn Davis","year":2013},{"id":"ps2-doc-1","type":"documentary","title":"The Defiant Ones","year":2017},{"id":"ps2-doc-2","type":"documentary","title":"Muscle Shoals","year":2013}]},
  {"id":"roots-of-rhythm-v2","title":"The Roots of Rhythm: Outlaws & Renegades","description":"The bloodline of American songwriting. Grit, acoustic tradition, and the cost of the road.","tags":["v2","music","blues","country","rock","film","documentary"],"relatedTrackIds":["roots-of-rhythm"],"sequence":[{"id":"ror2-book-1","type":"book","title":"Cash: The Autobiography","author":"Johnny Cash"},{"id":"ror2-film-1","type":"movie","title":"Blaze","year":2018},{"id":"ror2-film-2","type":"movie","title":"Crazy Heart","year":2009},{"id":"ror2-doc-1","type":"documentary","title":"Neil Young: Heart of Gold","year":2006}]},
  {"id":"sovereign-analytical-v2","title":"The Sovereign Analytical Edge: Mathematical Models","description":"Advanced handicapping, finding structural arbitrage in live numbers, and the ultimate logic of probability over luck.","tags":["v2","sports","gambling","probability","film","books"],"relatedTrackIds":["sovereign-analytical-edge"],"sequence":[{"id":"sae2-book-1","type":"book","title":"The Signal and the Noise","author":"Nate Silver"},{"id":"sae2-book-2","type":"book","title":"Sharp Sports Betting","author":"Stanford Wong"},{"id":"sae2-film-1","type":"movie","title":"21","year":2008},{"id":"sae2-film-2","type":"movie","title":"Casino","year":1995}]},
  {"id":"anatomy-of-the-job-v2","title":"The Anatomy of the Job: The Master Con","description":"Shifting from armed robberies to the intellectual high art of the long-game deception.","tags":["v2","crime","heist","noir","film","books"],"relatedTrackIds":["anatomy-of-the-job"],"sequence":[{"id":"aoj2-book-1","type":"book","title":"The Big Con: The Story of the Confidence Man","author":"David Maurer"},{"id":"aoj2-film-1","type":"movie","title":"The Sting","year":1973},{"id":"aoj2-film-2","type":"movie","title":"Catch Me If You Can","year":2002},{"id":"aoj2-film-3","type":"movie","title":"Ocean's Eleven","year":2001}]},
  {"id":"western-requiem-v2","title":"The Western Requiem: The Iron Frontier","description":"The evolution of the frontier myth into the industrial era. Modern laws meeting lawless expanses.","tags":["v2","western","americana","violence","film","books"],"relatedTrackIds":["western-requiem"],"sequence":[{"id":"wr2-book-1","type":"book","title":"The Sisters Brothers","author":"Patrick deWitt"},{"id":"wr2-film-1","type":"movie","title":"3:10 to Yuma","year":2007},{"id":"wr2-film-2","type":"movie","title":"True Grit","year":2010},{"id":"wr2-film-3","type":"movie","title":"The Proposition","year":2005}]},
  {"id":"architecture-of-tragedy-v2","title":"Architecture of a Tragedy: Modern Soil","description":"Tracing the deep psychological and geographical scars left by modern infantry combat.","tags":["v2","history","war","film","books"],"relatedTrackIds":["architecture-of-tragedy"],"sequence":[{"id":"aot2-book-1","type":"book","title":"The Things They Carried","author":"Tim O'Brien"},{"id":"aot2-film-1","type":"movie","title":"Platoon","year":1986},{"id":"aot2-film-2","type":"movie","title":"Apocalypse Now","year":1979},{"id":"aot2-film-3","type":"movie","title":"Full Metal Jacket","year":1987}]},
  {"id":"conspiratorial-backrooms","title":"The Conspiratorial Backrooms","description":"Political manipulation, administrative power plays, and the structural subversion of democracy.","tags":["thriller","politics","film","books","investigation"],"sequence":[{"id":"cb-book-1","type":"book","title":"All the President's Men","author":"Bob Woodward"},{"id":"cb-film-1","type":"movie","title":"All the President's Men","year":1976},{"id":"cb-film-2","type":"movie","title":"The Ides of March","year":2011},{"id":"cb-film-3","type":"movie","title":"JFK","year":1991}]},
  {"id":"fourth-estate","title":"The Fourth Estate","description":"Investigative journalism as a system shield. The obsessive tracking of hidden institutional rot.","tags":["investigation","journalism","film","books","thriller"],"sequence":[{"id":"fe-book-1","type":"book","title":"Say Nothing: A True Story of Murder and Memory in Northern Ireland","author":"Patrick Radden Keefe"},{"id":"fe-film-1","type":"movie","title":"Spotlight","year":2015},{"id":"fe-film-2","type":"movie","title":"Zodiac","year":2007},{"id":"fe-film-3","type":"movie","title":"The Insider","year":1999}]},
  {"id":"flesh-transformed","title":"The Flesh Transformed","description":"Body horror as an existential framework. Biological decay, corruption of the skin, and radical evolution.","tags":["horror","sci-fi","body-horror","film","books"],"sequence":[{"id":"ft-book-1","type":"book","title":"The Troop","author":"Nick Cutter"},{"id":"ft-film-1","type":"movie","title":"The Fly","year":1986},{"id":"ft-film-2","type":"movie","title":"Videodrome","year":1983},{"id":"ft-film-3","type":"movie","title":"The Thing","year":1982}]},
  {"id":"lost-artifacts","title":"Lost Artifacts & Haunted Media","description":"Found footage and media curses. The complete erosion of objective truth through recorded documentation.","tags":["horror","found-footage","film","books","supernatural"],"sequence":[{"id":"la-book-1","type":"book","title":"Universal Harvester","author":"John Darnielle"},{"id":"la-film-1","type":"movie","title":"The Blair Witch Project","year":1999},{"id":"la-film-2","type":"movie","title":"[REC]","year":2007},{"id":"la-film-3","type":"movie","title":"Cloverfield","year":2008}]},
  {"id":"eco-collapse","title":"Eco-Collapse & Primal Retribution","description":"Nature reclaiming its lineage. The systematic, atmospheric disintegration of human architectural boundaries.","tags":["horror","sci-fi","nature","eco","film","books"],"sequence":[{"id":"ec-book-1","type":"book","title":"The Overstory","author":"Richard Powers"},{"id":"ec-film-1","type":"movie","title":"Princess Mononoke","year":1997},{"id":"ec-film-2","type":"movie","title":"Annihilation","year":2018},{"id":"ec-film-3","type":"movie","title":"The Happening","year":2008}]},
  {"id":"craft-legacy-v2","title":"The Craft & The Legacy: Master Sawyer","description":"The philosophy of raw architectural design and traditional material manipulation. Sourcing life through creation.","tags":["v2","craft","woodworking","architecture","film","documentary","books"],"relatedTrackIds":["craft-and-legacy"],"sequence":[{"id":"cl2-book-1","type":"book","title":"The Soul of a Tree: A Woodworker's Reflections","author":"George Nakashima"},{"id":"cl2-film-1","type":"movie","title":"The Woodwright's Shop","year":1981},{"id":"cl2-doc-1","type":"documentary","title":"Bauhaus: Spirit of the Century","year":1994}]},
  {"id":"generational-epic","title":"The Generational Epic","description":"Multi-decade family dynamics, structural inheritances, and the crushing weight of bloodline legacies.","tags":["drama","family","epic","film","books","tv"],"sequence":[{"id":"ge-book-1","type":"book","title":"One Hundred Years of Solitude","author":"Gabriel García Márquez"},{"id":"ge-film-1","type":"movie","title":"The Godfather Part II","year":1974},{"id":"ge-show-1","type":"show","title":"Succession","year":2018}]},
  {"id":"gonzo-journalism","title":"Gonzo & Absurdist Reality","description":"Altered reporting methods. Submerging into the narrative completely to find alternative cultural truth.","tags":["journalism","satire","film","books","counterculture"],"sequence":[{"id":"gj-book-1","type":"book","title":"Fear and Loathing in Las Vegas","author":"Hunter S. Thompson"},{"id":"gj-film-1","type":"movie","title":"Fear and Loathing in Las Vegas","year":1998},{"id":"gj-film-2","type":"movie","title":"Almost Famous","year":2000}]},
  {"id":"abyssal-trench","title":"The Abyssal Trench","description":"Deep-water horror and isolation. Claustrophobia meets deep marine physics and psychological collapse.","tags":["horror","sci-fi","survival","film","books"],"sequence":[{"id":"at-book-1","type":"book","title":"The Swarm","author":"Frank Schätzing"},{"id":"at-film-1","type":"movie","title":"The Abyss","year":1989},{"id":"at-film-2","type":"movie","title":"Underwater","year":2020}]},
  {"id":"cosmic-inevitability","title":"Cosmic Inevitability","description":"Existential dread anchored in inevitable disaster. The philosophy of coping with planetary finality.","tags":["philosophy","sci-fi","drama","film","books"],"sequence":[{"id":"ci-book-1","type":"book","title":"The Myth of Sisyphus","author":"Albert Camus"},{"id":"ci-film-1","type":"movie","title":"Melancholia","year":2011},{"id":"ci-film-2","type":"movie","title":"First Reformed","year":2017}]},
  {"id":"art-of-dialogue","title":"The Art of the Dialogue","description":"Minimalist locations driven entirely by deep interpersonal analysis, verbal combat, and chemistry.","tags":["drama","philosophy","film","books","dialogue"],"sequence":[{"id":"ad-book-1","type":"book","title":"The Paris Review Interviews","author":"The Paris Review"},{"id":"ad-film-1","type":"movie","title":"My Dinner with Andre","year":1981},{"id":"ad-film-2","type":"movie","title":"Before Sunrise","year":1995}]},
  {"id":"cognitive-warfare","title":"Cognitive Warfare: The Grid","description":"High-stakes strategic mental games. The obsessive devotion required to master mathematical frameworks.","tags":["thriller","strategy","drama","film","books","tv"],"sequence":[{"id":"cw-book-1","type":"book","title":"The Defense","author":"Vladimir Nabokov"},{"id":"cw-cross-1","type":"crossroads","label":"Choose your battlefield","choices":[{"label":"Literary mind games","targetId":"cw-film-1","vibe":"book-heavy"},{"label":"Cinematic tension","targetId":"cw-show-1","vibe":"movie-heavy"},{"label":"Play the endgame","targetId":"cw-game-1","vibe":"videogame","optional":true}]},{"id":"cw-film-1","type":"movie","title":"Searching for Bobby Fischer","year":1993},{"id":"cw-game-1","type":"videogame","title":"Chess Ultra","year":2017,"required":false},{"id":"cw-show-1","type":"show","title":"The Queen's Gambit","year":2020}]},
  {"id":"folklore-legends-kids","title":"Folklore & Ancient Legends Remade","description":"Bespoke mythologies, classic cultural origins, and beautiful hand-drawn adventures for early exploration.","tags":["kids","family","fantasy","mythology","books","film","animation"],"sequence":[{"id":"flk-book-1","type":"book","title":"Percy Jackson & the Olympians: The Lightning Thief","author":"Rick Riordan"},{"id":"flk-cross-1","type":"crossroads","label":"Pick your mythic lens","choices":[{"label":"Ocean legends","targetId":"flk-film-1","vibe":"movie-heavy"},{"label":"Spirit world","targetId":"flk-film-2","vibe":"movie-heavy"},{"label":"Board game night","targetId":"flk-game-1","vibe":"boardgame","optional":true}]},{"id":"flk-film-1","type":"movie","title":"Song of the Sea","year":2014},{"id":"flk-film-2","type":"movie","title":"Spirited Away","year":2001},{"id":"flk-game-1","type":"boardgame","title":"Santorini","year":2017,"required":false}]},
  {"id":"cosmic-journeys-kids","title":"Cosmic Journeys & Brave Frontiers","description":"Accessible, high-concept astronomy and exploration. Moving beyond our atmospheric backyard safely.","tags":["kids","family","sci-fi","space","books","film","animation"],"sequence":[{"id":"cjk-book-1","type":"book","title":"A Wrinkle in Time","author":"Madeleine L'Engle"},{"id":"cjk-film-1","type":"movie","title":"Wall-E","year":2008},{"id":"cjk-film-2","type":"movie","title":"The Iron Giant","year":1999}]},
  {"id":"wilderness-call-kids","title":"The Wilderness Call","description":"Independent wilderness survival, natural respect, and building out standalone shelters from raw timber.","tags":["kids","family","nature","survival","books","film","animation"],"sequence":[{"id":"wck-book-1","type":"book","title":"My Side of the Mountain","author":"Jean George"},{"id":"wck-film-1","type":"movie","title":"Fantastic Mr. Fox","year":2009},{"id":"wck-film-2","type":"movie","title":"Wolfwalkers","year":2020}]},
  {"id":"gothic-wonder-teens","title":"Gothic Wonder & Shadow Realities","description":"Intelligent, moody coming-of-age journeys operating on the threshold of real horror and high fantasy.","tags":["teens","fantasy","horror","coming-of-age","books","film"],"sequence":[{"id":"gwt-book-1","type":"book","title":"The Ocean at the End of the Lane","author":"Neil Gaiman"},{"id":"gwt-film-1","type":"movie","title":"Coraline","year":2009},{"id":"gwt-film-2","type":"movie","title":"Pan's Labyrinth","year":2006}]},
  {"id":"elevated-dystopia-teens","title":"Elevated Dystopia: The Resistance","description":"Clean, structural sociological collapse. Stripping down controlled societies through mechanical wit and rebellion.","tags":["teens","dystopia","sci-fi","rebellion","books","film","tv","animation"],"sequence":[{"id":"edt-book-1","type":"book","title":"The Giver","author":"Lois Lowry"},{"id":"edt-film-1","type":"movie","title":"The Hunger Games","year":2012},{"id":"edt-show-1","type":"show","title":"Arcane","year":2021}]},
  {"id":"retro-mystery-teens","title":"The Retro Mystery & Suburban Weird","description":"Amateur investigations, deep analog tech reliance, and close-knit neighborhood defensive units.","tags":["teens","mystery","sci-fi","horror","books","film","tv"],"sequence":[{"id":"rmt-book-1","type":"book","title":"Meddling Kids","author":"Edgar Cantero"},{"id":"rmt-film-1","type":"movie","title":"Super 8","year":2011},{"id":"rmt-show-1","type":"show","title":"Stranger Things (Season 1)","year":2016}]},
  {"id":"high-school-satire-teens","title":"High School Mythologies & Sharp Wit","description":"Socio-economic battlefield curation. Fast-talking, highly strategic analytical frameworks inside suburban architecture.","tags":["teens","satire","drama","dark-comedy","books","film"],"sequence":[{"id":"hss-book-1","type":"book","title":"The Secret History","author":"Donna Tartt"},{"id":"hss-film-1","type":"movie","title":"Brick","year":2005},{"id":"hss-film-2","type":"movie","title":"Rushmore","year":1998}]},
];

const GAP_TRACKS = [
  {
    id: 'picture-book-pals-kids',
    title: 'Picture Book Pals',
    description: 'Gentle illustrated stories and short films for the youngest readers and watchers.',
    tags: ['kids', 'family', 'books', 'film', 'animation'],
    sequence: [
      { id: 'pbp-book-1', type: 'book', title: 'Where the Wild Things Are', author: 'Maurice Sendak' },
      { id: 'pbp-book-2', type: 'book', title: 'The Very Hungry Caterpillar', author: 'Eric Carle' },
      { id: 'pbp-film-1', type: 'movie', title: 'The Red Balloon', year: 1956 },
      { id: 'pbp-film-2', type: 'movie', title: 'Kubo and the Two Strings', year: 2016 },
    ],
  },
  {
    id: 'inventors-tinkerers-kids',
    title: 'Inventors & Tinkerers',
    description: 'Curious minds, homemade machines, and the joy of building something from scratch.',
    tags: ['kids', 'family', 'stem', 'science', 'books', 'film'],
    sequence: [
      { id: 'it-book-1', type: 'book', title: 'Rosie Revere, Engineer', author: 'Andrea Beaty' },
      { id: 'it-book-2', type: 'book', title: 'The Wild Robot', author: 'Peter Brown' },
      { id: 'it-film-1', type: 'movie', title: 'Big Hero 6', year: 2014 },
      { id: 'it-doc-1', type: 'documentary', title: 'Dream Big: Engineering Our World', year: 2017 },
    ],
  },
  {
    id: 'first-chills-teens',
    title: 'First Chills: Gateway Horror',
    description: 'Spooky without trauma. Teen-friendly scares that reward bravery and curiosity.',
    tags: ['teens', 'horror', 'supernatural', 'film', 'books'],
    sequence: [
      { id: 'fc-book-1', type: 'book', title: 'Scary Stories to Tell in the Dark', author: 'Alvin Schwartz' },
      { id: 'fc-film-1', type: 'movie', title: 'The Sixth Sense', year: 1999 },
      { id: 'fc-film-2', type: 'movie', title: 'A Quiet Place', year: 2018 },
      { id: 'fc-show-1', type: 'show', title: 'Wednesday (Season 1)', year: 2022 },
    ],
  },
  {
    id: 'mythic-quests-teens',
    title: 'Mythic Quests for Teens',
    description: 'Epic journeys, reluctant heroes, and worlds that demand you grow up fast.',
    tags: ['teens', 'fantasy', 'adventure', 'books', 'film', 'tv'],
    sequence: [
      { id: 'mq-book-1', type: 'book', title: 'An Ember in the Ashes', author: 'Sabaa Tahir' },
      { id: 'mq-film-1', type: 'movie', title: 'The Princess Bride', year: 1987 },
      { id: 'mq-show-1', type: 'show', title: 'The Letter for the King', year: 2020 },
    ],
  },
  {
    id: 'tabletop-legends',
    title: 'Tabletop Legends',
    description: 'Board games as narrative engines. Roll dice, scheme, and tell stories around the table.',
    tags: ['boardgame', 'strategy', 'family', 'games'],
    sequence: [
      { id: 'tl-game-1', type: 'boardgame', title: 'Pandemic', year: 2008 },
      { id: 'tl-game-2', type: 'boardgame', title: 'Ticket to Ride', year: 2004 },
      { id: 'tl-game-3', type: 'boardgame', title: 'Gloomhaven', year: 2017 },
      { id: 'tl-doc-1', type: 'documentary', title: 'Going Cardboard', year: 2012 },
    ],
  },
];

const MAPS = {
  'existential-ai': {
    nodes: [
      { id: 'n0', itemId: 'eai-book-1', layer: 0, slot: 1 },
      { id: 'n1', itemId: 'eai-book-2', layer: 1, slot: 0 },
      { id: 'n2', itemId: 'eai-film-1', layer: 1, slot: 2 },
      { id: 'n3', itemId: 'eai-cross-1', layer: 2, slot: 1 },
      { id: 'n4', itemId: 'eai-film-2', layer: 3, slot: 0 },
      { id: 'n5', itemId: 'eai-film-3', layer: 3, slot: 1 },
      { id: 'n6', itemId: 'eai-game-1', layer: 3, slot: 2 },
      { id: 'n7', itemId: 'eai-show-1', layer: 4, slot: 1 },
    ],
    edges: [
      { from: 'n0', to: 'n1' },
      { from: 'n0', to: 'n2' },
      { from: 'n1', to: 'n3' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n3', to: 'n5' },
      { from: 'n3', to: 'n6' },
      { from: 'n4', to: 'n7' },
      { from: 'n5', to: 'n7' },
      { from: 'n6', to: 'n7' },
    ],
  },
  'cognitive-warfare': {
    nodes: [
      { id: 'n0', itemId: 'cw-book-1', layer: 0, slot: 1 },
      { id: 'n1', itemId: 'cw-cross-1', layer: 1, slot: 1 },
      { id: 'n2', itemId: 'cw-film-1', layer: 2, slot: 0 },
      { id: 'n4', itemId: 'cw-game-1', layer: 2, slot: 2 },
      { id: 'n5', itemId: 'cw-show-1', layer: 3, slot: 1 },
    ],
    edges: [
      { from: 'n0', to: 'n1' },
      { from: 'n1', to: 'n2' },
      { from: 'n1', to: 'n4' },
      { from: 'n2', to: 'n5' },
      { from: 'n4', to: 'n5' },
    ],
  },
  'folklore-legends-kids': {
    nodes: [
      { id: 'n0', itemId: 'flk-book-1', layer: 0, slot: 1 },
      { id: 'n1', itemId: 'flk-cross-1', layer: 1, slot: 1 },
      { id: 'n2', itemId: 'flk-film-1', layer: 2, slot: 0 },
      { id: 'n3', itemId: 'flk-film-2', layer: 2, slot: 2 },
      { id: 'n4', itemId: 'flk-game-1', layer: 2, slot: 1 },
    ],
    edges: [
      { from: 'n0', to: 'n1' },
      { from: 'n1', to: 'n2' },
      { from: 'n1', to: 'n3' },
      { from: 'n1', to: 'n4' },
    ],
  },
};

const EXISTENTIAL_AI_SEQUENCE_PATCH = [
  { id: 'eai-book-1', type: 'book', title: 'Do Androids Dream of Electric Sheep?', author: 'Philip K. Dick' },
  { id: 'eai-book-2', type: 'book', title: '2001: A Space Odyssey', author: 'Arthur C. Clarke' },
  { id: 'eai-film-1', type: 'movie', title: 'Blade Runner', year: 1982 },
  {
    id: 'eai-cross-1',
    type: 'crossroads',
    label: 'Choose your synthetic lens',
    choices: [
      { label: 'Intimate AI drama', targetId: 'eai-film-2', vibe: 'movie-heavy' },
      { label: 'Philosophical thriller', targetId: 'eai-film-3', vibe: 'movie-heavy' },
      { label: 'Play the simulation', targetId: 'eai-game-1', vibe: 'videogame', optional: true },
    ],
  },
  { id: 'eai-film-2', type: 'movie', title: 'Ex Machina', year: 2014 },
  { id: 'eai-film-3', type: 'movie', title: 'Her', year: 2013, required: false },
  { id: 'eai-game-1', type: 'videogame', title: 'Detroit: Become Human', year: 2018, required: false },
  { id: 'eai-show-1', type: 'show', title: 'Westworld (Season 1)', year: 2016 },
];

function ensureItemIds(track) {
  track.sequence = track.sequence.map((item, i) => ({
    ...item,
    id: item.id || `${track.id}-item-${i}`,
  }));
  return track;
}

function applyRelations(tracks) {
  const byId = Object.fromEntries(tracks.map((t) => [t.id, t]));
  for (const [v1, v2] of V2_RELATIONS) {
    if (byId[v1] && !byId[v1].relatedTrackIds) {
      byId[v1].relatedTrackIds = [v2];
    }
    if (byId[v2] && !byId[v2].relatedTrackIds?.includes(v1)) {
      byId[v2].relatedTrackIds = [...(byId[v2].relatedTrackIds || []), v1];
    }
  }
  return tracks;
}

function main() {
  let tracks = JSON.parse(readFileSync(TRACKS_PATH, 'utf8'));
  const existingIds = new Set(tracks.map((t) => t.id));

  tracks = tracks.map((track) => {
    if (track.id === 'existential-ai') {
      return {
        ...track,
        sequence: EXISTENTIAL_AI_SEQUENCE_PATCH,
        map: MAPS['existential-ai'],
        relatedTrackIds: ['existential-ai-v2'],
      };
    }
    return track;
  });

  for (const track of [...NEW_TRACKS, ...GAP_TRACKS]) {
    if (!existingIds.has(track.id)) {
      tracks.push(track);
      existingIds.add(track.id);
    }
  }

  for (const [trackId, map] of Object.entries(MAPS)) {
    const track = tracks.find((t) => t.id === trackId);
    if (track && !track.map) track.map = map;
  }

  tracks = tracks.map(ensureItemIds);
  tracks = applyRelations(tracks);

  writeFileSync(TRACKS_PATH, JSON.stringify(tracks, null, 2));
  console.log(`Merged tracks: ${tracks.length} total`);
}

main();
