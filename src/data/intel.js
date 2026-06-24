/*
 * Market Intelligence data — ported from the renderMarketIntel module in the
 * legacy fd-assortment-v4-2.html. Field merchants log market/competitor/customer
 * signals; structured tags feed the recommendation agent, free text stays
 * human-read. Signals move through new → reviewed → actioned/watching/dismissed.
 */

export const INTEL_SEED = [
  {
    id: "I-001", type: "competitive", direction: "threat", urgency: "immediate",
    scope: "store", cluster: "Pro-Heavy South", store: "ATL-01",
    title: "HomeDepot tile dept expanded — matching our zellige selection",
    body: "HomeDepot on Peachtree Industrial expanded their decorative tile section last week. They now carry three zellige SKUs at competitive prices, including a 4×4 sage green that directly competes with SKU-10901 on our agent recommendation list. Two customers mentioned comparing prices.",
    skus: ["SKU-10901", "SKU-10782"],
    categories: ["Tile – Ceramic", "Tile – Glass"],
    modelInstruction: "Reduce confidence for SKU-10901 and SKU-10782 at ATL-01 by 15pp. Flag for merchant review before next recommendation refresh.",
    feedsModel: true, status: "new", author: "Lisa T.", authorRole: "Store Manager", date: "Jun 3, 2025",
    confidence: "confirmed", escalated: false, merchantNote: "",
  },
  {
    id: "I-002", type: "market", direction: "opportunity", urgency: "season",
    scope: "cluster", cluster: "Pro-Heavy South", store: null,
    title: "Large mixed-use development breaking ground Q3 — 800 units",
    body: "Ponce City South development, 800 residential + 40k sqft commercial, breaking ground Sep 2025. GC is Skanska. Expected completion Q2 2027. Our Midtown and Buckhead stores are within 3 miles. Strong opportunity for pro/contractor business over the next 6–8 seasons. Large format tile and LVP will lead.",
    skus: ["SKU-11020", "SKU-10987"],
    categories: ["Hardwood/LVP", "Tile – Porcelain"],
    modelInstruction: "Upgrade confidence for large-format tile and LVP SKUs in ATL-01, ATL-03, ATL-07 cluster for FW 2025 and SS 2026. Tag as \"development signal: Ponce City South\". Affects SKU-11020 (Driftwood Ash LVP) and SKU-10987 (Lava Black 24×48 Porcelain).",
    feedsModel: true, status: "new", author: "Jason R.", authorRole: "Regional VP", date: "Jun 2, 2025",
    confidence: "confirmed", escalated: false, merchantNote: "",
  },
  {
    id: "I-003", type: "customer", direction: "opportunity", urgency: "immediate",
    scope: "store", cluster: "Pro-Heavy South", store: "ATL-01",
    title: "Pro contractor asking for 24×48 rectified porcelain — not in catalogue",
    body: "Marcus Tile & Stone (regular pro contractor, ~$80K annual spend) asked specifically for 24×48 rectified porcelain in a light grey tone — something like Bianco Lasa or Gris Cemento. Said he has 3 projects this season requiring it. Our current 24×24 range (Mojave Sand, Calacatta White) doesn't satisfy the rectified/large-format need. He's currently sourcing from Tile Shop.",
    skus: ["SKU-10839"],
    categories: ["Tile – Porcelain"],
    modelInstruction: null,
    catalogueGap: true, catalogueRequest: "24×48 rectified porcelain, light grey. 3 contractor projects confirmed.",
    estDemand: "$80–120k",
    feedsModel: false, status: "reviewed", author: "Lisa T.", authorRole: "Store Manager", date: "Jun 1, 2025",
    confidence: "confirmed", escalated: true, merchantNote: "Following up with Marazzi and Florim reps — may be a FW 2025 catalogue addition.",
  },
  {
    id: "I-004", type: "product", direction: "threat", urgency: "season",
    scope: "cluster", cluster: "Pro-Heavy South", store: null,
    title: "Barnwood Oak LVP returns up 22% — install complaints from contractors",
    body: "SKU-10198 (Barnwood Oak 6×36 LVP) showing a return rate spike over last 6 weeks. Talking to the floor team, at least 3 contractors have mentioned issues with click-lock failure in humid conditions — common in Atlanta summers. Our sell-through looks fine but we're masking a quality signal. One contractor switched to Shaw LVP and told two other pros.",
    skus: ["SKU-10198"],
    categories: ["Hardwood/LVP"],
    modelInstruction: "Flag SKU-10198 for merchant quality review. Do not reduce confidence until reviewed — may be install issue, not product defect.",
    feedsModel: true, status: "actioned", author: "Jason R.", authorRole: "Regional VP", date: "May 28, 2025",
    confidence: "multiple customers", escalated: true, merchantNote: "QA team contacted vendor — humidity rating under review. Holding SKU pending report.",
  },
  {
    id: "I-005", type: "trend", direction: "opportunity", urgency: "next",
    scope: "region", cluster: "Pro-Heavy South", store: null,
    title: "Limewash and textured wall tile demand building — 6 months ahead of national",
    body: "Seeing early limewash tile demand across 4 Southeast stores. Interior designers are specifying it heavily for new builds and high-end renovations. Our current catalogue has no limewash ceramic — closest is the Rustic Slate. Zillow data shows renovation spend in Atlanta MSA up 18% YoY. This is a trend that will hit national planning in SS 2026 at the latest.",
    skus: [],
    categories: ["Tile – Ceramic", "Tile – Porcelain"],
    modelInstruction: null,
    catalogueGap: true, catalogueRequest: "Limewash ceramic wall tile — textured surface, neutral tones. High-end renovation market.",
    estDemand: "$40–60k",
    feedsModel: false, status: "reviewed", author: "Jason R.", authorRole: "Regional VP", date: "May 25, 2025",
    confidence: "multiple customers", escalated: false, merchantNote: "",
  },
  {
    id: "I-006", type: "supply", direction: "threat", urgency: "season",
    scope: "national", cluster: null, store: null,
    title: "Italian porcelain lead times extending — 14 to 22 weeks for key SKUs",
    body: "Multiple reps from Florim and Iris Ceramica flagging lead time extensions due to energy cost increases in northern Italy. SKUs potentially affected: SKU-10839 (Mojave Sand), SKU-10987 (Lava Black). If we're planning these for FW 2025 store picks, orders need to be placed 8 weeks earlier than normal. The agent may be recommending these without knowing the availability constraint.",
    skus: ["SKU-10839", "SKU-10987"],
    categories: ["Tile – Porcelain"],
    modelInstruction: "Flag SKU-10839 and SKU-10987 as supply-constrained in agent confidence scoring. Add supply risk warning to recommendation cards until confirmed available.",
    feedsModel: true, status: "new", author: "Karen M.", authorRole: "VP Merchandising", date: "Jun 3, 2025",
    confidence: "confirmed", escalated: false, merchantNote: "",
  },
  {
    id: "I-007", type: "competitive", direction: "opportunity", urgency: "season",
    scope: "cluster", cluster: "Gulf Coast", store: null,
    title: "Floor & Decor competitor closing Houston Westheimer location",
    body: "Tile Corner on Westheimer (Houston) closing end of July — their landlord confirmed non-renewal. They carry a strong coastal/glass tile range that serves the Gulf Coast design market. Opportunity to capture their contractor and designer customer base before they establish new supplier relationships. Our Houston stores should stock up on glass and coastal-format SKUs.",
    skus: ["SKU-10782"],
    categories: ["Tile – Glass"],
    modelInstruction: "Boost confidence for coastal and glass tile SKUs in Gulf Coast cluster stores for FW 2025. Tag \"competitive gap: Tile Corner closing\".",
    feedsModel: true, status: "new", author: "Jason R.", authorRole: "Regional VP", date: "Jun 2, 2025",
    confidence: "confirmed", escalated: false, merchantNote: "",
  },
];

export const CATALOGUE_SKUS = [
  { id: "SKU-10839", name: "SKU-10839 · Mojave Sand 24×24 Porcelain" },
  { id: "SKU-10901", name: "SKU-10901 · Sage Green Zellige 4×4" },
  { id: "SKU-10782", name: "SKU-10782 · Coastal Blue Glass Mosaic" },
  { id: "SKU-11020", name: "SKU-11020 · Driftwood Ash 7×48 LVP" },
  { id: "SKU-10198", name: "SKU-10198 · Barnwood Oak 6×36 LVP" },
  { id: "SKU-10672", name: "SKU-10672 · Pebble Creek Travertine 18×18" },
  { id: "SKU-10987", name: "SKU-10987 · Lava Black 24×48 Porcelain" },
];

export const CLUSTER_NAMES = [
  "Pro-Heavy South", "Southwest Desert", "Northeast Urban", "Midwest Heartland",
  "Pacific Coast", "Mountain West", "Gulf Coast", "Mid-Atlantic Suburb",
];

/* Choice-grid option sets for the log form. */
export const TYPE_OPTIONS = [
  { id: "competitive", label: "Competitive", desc: "Competitor activity" },
  { id: "market", label: "Market", desc: "Local / geographic" },
  { id: "customer", label: "Customer / contractor", desc: "Direct customer intel" },
  { id: "product", label: "Product quality", desc: "Returns, complaints" },
  { id: "supply", label: "Supply chain", desc: "Lead times, availability" },
  { id: "trend", label: "Trend", desc: "Emerging demand" },
];
export const DIRECTION_OPTIONS = [
  { id: "threat", label: "↓ Threat", desc: "Risk to our sales" },
  { id: "opportunity", label: "↑ Opportunity", desc: "Chance to sell more" },
];
export const URGENCY_OPTIONS = [
  { id: "immediate", label: "Immediate", desc: "Act now" },
  { id: "season", label: "This season", desc: "SS 2026" },
  { id: "next", label: "Next season", desc: "FW 2026" },
  { id: "watch", label: "Watch", desc: "Monitor" },
];
export const SCOPE_OPTIONS = [
  { id: "store", label: "My store" },
  { id: "cluster", label: "Cluster" },
  { id: "region", label: "Region" },
  { id: "national", label: "National" },
];
export const CONFIDENCE_OPTIONS = [
  { id: "anecdotal", label: "Anecdotal", desc: "1 customer" },
  { id: "multiple customers", label: "Multiple customers", desc: "2–5 signals" },
  { id: "confirmed", label: "Confirmed", desc: "3rd-party verified" },
];

/* Badge color roles (impact-ui supports: default | info | success | warning | error). */
export const TYPE_BADGE = { competitive: "error", market: "info", customer: "success", product: "warning", supply: "error", trend: "info" };
export const DIR_BADGE = { threat: "error", opportunity: "success" };
export const URGENCY_BADGE = { immediate: "error", season: "warning", next: "info", watch: "default" };
export const STATUS_BADGE = { new: "info", reviewed: "warning", actioned: "success", watching: "default", dismissed: "default" };
