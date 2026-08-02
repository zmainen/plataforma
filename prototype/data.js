/* Plataforma prototype — inlined seed data.
 *
 * Real sweat variant works (titles from the artists' published archive and the
 * founders' concept doc), presented as freshly "discovered" candidates the artist
 * reviews. Three deliberate imperfections make the editing meaningful:
 *   - a DUPLICATE to merge      (Bronx Gothic: the oval -> Bronx Gothic)
 *   - a record that NEEDS A FIX  (poor people's tv room: wrong date, missing co-author)
 *   - a FALSE POSITIVE to reject (Grief and Grievance — that's Okwui *Enwezor*)
 *
 * No third-party images are embedded: performance works have no canonical image, so
 * they render typographically. Rights-clean by design.
 *
 * Inlined (not fetched) so the app opens over file:// with no server.
 */
window.PLATAFORMA_SEED = {
  artist: {
    id: "p-okpokwasili",
    name: "Okwui Okpokwasili",
    born: "1972",
    nationality: "American",
    bio: "Performer, choreographer and writer creating multi-disciplinary performance. 2018 MacArthur Fellow. BA, Yale.",
    wikidata: "Q22079195",
    ulan: "",
    site: "sweatvariant.com",
    practice: {
      id: "pc-sweatvariant",
      name: "sweat variant",
      members: [
        { name: "Okwui Okpokwasili", role: "co-author" },
        { name: "Peter Born", role: "co-author" }
      ],
      formed: "2000",
      disciplines: ["performance", "dance", "theatre", "installation", "video-art"],
      note: "A co-authored practice — not one artist with collaborators."
    }
  },

  sources: [
    { id: "website",     label: "sweatvariant.com",        kind: "Artist website",           via: "Squarespace adapter", url: "https://www.sweatvariant.com" },
    { id: "wikidata",    label: "Wikidata (Q22079195)",    kind: "Open structured data",     via: "SPARQL",              url: "https://www.wikidata.org/wiki/Q22079195" },
    { id: "collections", label: "Museum collections",      kind: "Whitney · Hammer",         via: "Collection APIs",     url: "https://whitney.org/collection/works/64864" },
    { id: "press",       label: "Press & exhibitions",     kind: "Reviews, catalogues",      via: "Web search" }
  ],

  /* Each candidate carries pre-filled schema fields + a provenance + an optional
   * `issue` that the review flow is designed to resolve. */
  candidates: [
    {
      id: "w-bronx-gothic",
      title: "Bronx Gothic",
      media: { src: "img/works/bronx-gothic.jpg", credit: "Ian Douglas", sourceUrl: "https://www.sweatvariant.com/bronx-gothic" },
      year: "2014",
      disciplines: ["performance", "dance", "theatre"],
      modules: ["performance"],
      sources: ["website", "press"],
      confidence: 0.97,
      coAuthors: [
        { name: "Okwui Okpokwasili", role: "writer · performer · composer" },
        { name: "Peter Born", role: "director · scenic & lighting design" }
      ],
      duration: "70 min",
      description: "A fictive autobiographical invocation of two 6th-grade girls on the verge of adolescence in the mid-1980s. Movement, song, and hand-passed notes render a charged relationship in the outer boroughs of New York City.",
      commissioners: ["Performance Space 122", "Danspace Project", "Lower Manhattan Cultural Council", "Jerome Foundation", "Le Maillon (Strasbourg)", "Théâtre de Gennevilliers", "Théâtre Garonne", "ZKM Zagreb"],
      funders: ["New England Foundation for the Arts", "Doris Duke Charitable Foundation", "Andrew W. Mellon Foundation", "National Endowment for the Arts"],
      realisations: [
        { type: "Production", title: "Original tour (Okwui performing)", dateRange: "2014–2019", venues: ["Danspace / PS122 COIL (premiere)", "The Young Vic, London"] },
        { type: "Production", title: "Restaging with Wanjiru Kamuyu", dateRange: "2022–", venues: ["Kunstenfestivaldesarts", "Festival d'Automne", "Festival TransAmériques"] }
      ],
      issue: null
    },
    {
      id: "w-bg-oval",
      title: "Bronx Gothic: the oval",
      media: { src: "img/works/bg-oval.jpg", credit: "Ian Douglas", sourceUrl: "https://www.sweatvariant.com/bronx-gothic" },
      year: "2014",
      disciplines: ["performance", "installation"],
      modules: ["performance", "installation"],
      sources: ["website"],
      confidence: 0.71,
      description: "An installation-and-performance iteration shown at the River to River Festival (LMCC), 2014.",
      issue: "duplicate",
      issueOf: "w-bronx-gothic",
      issueNote: "Looks like a variant of “Bronx Gothic.” Merge as a version, or keep as its own work? Your call — the archive lists it separately."
    },
    {
      id: "w-pptr",
      title: "poor people's tv room",
      media: { src: "img/works/pptr.jpg", credit: "Ian Douglas", sourceUrl: "https://www.sweatvariant.com/poor-peoples-tv-room" },
      year: "2022",
      disciplines: ["performance", "dance", "installation"],
      modules: ["performance", "installation"],
      sources: ["website", "collections", "press"],
      confidence: 0.88,
      coAuthors: [
        { name: "Okwui Okpokwasili", role: "writer · performer · choreographer" }
      ],
      description: "Drawing on the 1929 Women's War in Nigeria and the erosive effects of colonialism and media. Exists across a 2014 solo, a 2017 ensemble work, and a 2021 museum installation.",
      collection: { holder: "Whitney Museum of American Art · Hammer Museum" },
      realisations: [
        { type: "Production", title: "poor people's tv room (SOLO)", dateRange: "2014–2016", venues: [] },
        { type: "Production", title: "ensemble", dateRange: "2017–2019", venues: [] },
        { type: "Installation", title: "installation (video)", dateRange: "2017 · acquired 2022", venues: ["Whitney", "Hammer"] }
      ],
      issue: "needs-fix",
      issueNote: "We guessed the year from the museum acquisition (2022), but this premiered as an ensemble work in 2017 — and Peter Born isn't credited yet. Fix the date and add the co-author.",
      fix: { field: "year", suggested: "2017", addCoAuthor: { name: "Peter Born", role: "director · design" } }
    },
    {
      id: "w-sitting",
      title: "Sitting on a Man's Head",
      media: { src: "img/works/sitting.jpg", credit: "Ian Douglas", sourceUrl: "https://www.sweatvariant.com/sitting-on-a-mans-head" },
      year: "2019",
      disciplines: ["performance", "installation"],
      modules: ["performance", "installation"],
      sources: ["website", "press"],
      confidence: 0.9,
      coAuthors: [
        { name: "Okwui Okpokwasili", role: "concept · direction" },
        { name: "Peter Born", role: "co-creator · design" }
      ],
      description: "A participatory performance installation inviting visitors into a durational practice of gathering, sounding, and support. A living, audience-activated structure.",
      issue: null
    },
    {
      id: "w-pent-up",
      title: "pent-up: a revenge dance",
      media: { src: "img/works/pent-up.jpg", credit: "Peter Born, 2009", sourceUrl: "https://www.sweatvariant.com/pent-up-a-revenge-dance" },
      year: "2017",
      disciplines: ["performance", "dance"],
      modules: ["performance"],
      sources: ["website", "press"],
      confidence: 0.86,
      coAuthors: [
        { name: "Okwui Okpokwasili", role: "performer · maker" }
      ],
      description: "A 'Bessie' Award–winning work.",
      issue: null
    },
    {
      id: "w-adaku",
      title: "Adaku's Revolt",
      media: { src: "img/works/adaku.jpg", credit: "Ian Douglas", sourceUrl: "https://www.sweatvariant.com/adakus-revolt" },
      year: "2018",
      disciplines: ["performance", "theatre"],
      modules: ["performance"],
      sources: ["website"],
      confidence: 0.79,
      description: "A performance work in the sweat variant repertoire.",
      issue: null
    },
    {
      id: "w-grief-grievance",
      title: "Grief and Grievance: Art and Mourning in America",
      year: "2021",
      disciplines: ["exhibition"],
      modules: [],
      sources: ["wikidata", "press"],
      confidence: 0.44,
      description: "A group exhibition at the New Museum, conceived by Okwui Enwezor.",
      issue: "false-positive",
      issueNote: "Matched on the name “Okwui,” but this is a curatorial project by Okwui *Enwezor*. Your work appeared in it — but the exhibition isn't yours. Reject.",
      notMineName: "Okwui Enwezor"
    }
  ],

  pod: {
    name: "Sweat Variant Pod",
    convener: "Okwui Okpokwasili",
    blurb: "Pods onboard as a cluster: a leader brings their real collaborators. The directory renders the Pod as an interconnected web — one artist's page is a gateway to the others.",
    members: [
      { name: "Okwui Okpokwasili", role: "Pod lead · performer, choreographer", discipline: "Performance", state: "joined", you: true },
      { name: "Peter Born", role: "Co-author, sweat variant", discipline: "Direction · design · film", state: "joined", site: "sweatvariant.com" },
      { name: "Wanjiru Kamuyu", role: "Performer — Bronx Gothic restaging", discipline: "Dance", state: "invited", note: "Surfaced from a shared credit on Bronx Gothic (2022)." },
      { name: "Ralph Lemon", role: "Collaborator", discipline: "Choreography · visual art", state: "discovered", note: "Surfaced from your collaboration graph — invite to the Pod?" }
    ]
  }
};
