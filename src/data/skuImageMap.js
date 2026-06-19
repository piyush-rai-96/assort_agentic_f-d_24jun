/*
 * Maps FD_SKUS sku id → /sku-images/<filename>.avif
 * Images are served from public/sku-images/ (Vite static).
 * Matching is by closest product name/material since demo IDs don't align
 * numerically with the real Floor & Decor product IDs in the image filenames.
 * SKUs 100329609 and 100329678 have no matching image → SVG fallback.
 */
export const SKU_IMAGE_MAP = {
  /* ── Wood ──────────────────────────────────────────────────────────────── */
  // ENG 1/2X7.5 WOAK ATHENA II — Wire-Brushed White Oak
  100328061: "/sku-images/101328243_athena-hickory-ii-wire-brushed-engineered-hardwood_display.avif",
  // ENG 5/8X9 WOAK CHALET SWN — Sawn White Oak
  100328149: "/sku-images/101019479_creekside-sawn-white-oak-wire-brushed-engineered-hardwood_display.avif",
  // ENG 1/2X7.5 HICKORY CORBETT — Hand-Scraped Hickory
  100328165: "/sku-images/100109081_yukon-hickory-hand-scraped-solid-hardwood_display.avif",
  // ENG 1/2X5 MAPLE THEMIS — Smooth Natural
  100328250: "/sku-images/100467117_natural-select-red-oak-smooth-solid-hardwood_display.avif",
  // ENG 3/8X5 ACACIA RED DUNE — Distressed
  100328268: "/sku-images/100611540_hevea-komodo-distressed-solid-hardwood_display.avif",
  // ENG 1/2X5 WOAK ASTRID — Wire-Brushed White Oak Gray
  100328317: "/sku-images/100706670_dijon-white-oak-ii-wire-brushed-engineered-hardwood_display.avif",
  // SOL 3/4X7.5 WOAK WINFIELD — Smooth Wide Plank White Oak
  100328399: "/sku-images/101141489_waylan-white-oak-wire-brushed-engineered-hardwood_display.avif",
  // SOL 3/4X5 ROAK LUCCA — Smooth Solid Red Oak
  100328426: "/sku-images/942749603_gunstock-red-oak-smooth-solid-hardwood_display.avif",
  // SOL 3/4X5 HICKORY RANIA — Hand-Scraped Hickory
  100328456: "/sku-images/100932540_gabby-white-oak-flextech-handscraped-engineered-hardwood_display.avif",
  // SOL 3/4X8 WOAK SEASHELL — Wire-Brushed White Oak Ivory
  100328472: "/sku-images/100785872_marley-european-white-oak-wire-brushed-engineered-hardwood_display.avif",
  // UNF 3/4X2.25 ROAK SELECT — Natural Unfinished Red Oak
  100328520: "/sku-images/100467117_natural-select-red-oak-smooth-solid-hardwood_display.avif",
  // BAM 1/2X5 CORBETT — Smooth Bamboo
  100328554: "/sku-images/101346203_chicory-smooth-engineered-stranded-bamboo_display.avif",
  // BAM 1/2X5 MOCHA LK — Wire-Brushed Bamboo
  100328631: "/sku-images/101346328_derby-distressed-engineered-stranded-bamboo_display.avif",
  // WP ACST 21X108 JUNIPER — Wood Wall Acoustic Panel
  100328683: "/sku-images/101463032_parry-pecan-wood-wall-acoustic-panel_display.avif",

  /* ── Tile ───────────────────────────────────────────────────────────────── */
  // POR 12X24 CARRARA POL — Marble Look Polished
  100328775: "/sku-images/100610781_venato-matte-porcelain-tile_display.avif",
  // POR 24X48 CALACATTA MT — Marble Look Matte Large
  100328803: "/sku-images/101317865_luxe-sand-matte-porcelain-tile_display.avif",
  // POR 12X24 CREMA FANTASY — Marble Look Matte Beige
  100328825: "/sku-images/101027092_phoenix-sand-matte-porcelain-tile_display.avif",
  // POR 24X24 URBAN GRAY — Concrete Look Matte Gray
  100328890: "/sku-images/100136795_concrete-gray-matte-ceramic-tile_display.avif",
  // POR 8X48 RANIA WOOD — Wood Look Matte Brown
  100328937: "/sku-images/101236859_birch-wood-look-matte-tile_display.avif",
  // POR 18X18 TRAVERTINE BG — Stone Look Matte Beige
  100328997: "/sku-images/100490168_sierra-beige-wood-plank-matte-porcelain-tile_display.avif",
  // POR 12X24 STATUARIO POL — Marble Polished White
  100329016: "/sku-images/100506054_stratford-decorative-porcelain-tile_display.avif",
  // WAL 12X36 BLUE WALL — Solid Color Glossy Blue
  100329066: "/sku-images/100507706_la-belle-antique-blue-ceramic-polished-tile_display.avif",
  // WAL 4X12 WHITE SUBWAY — Subway Glossy White
  100329082: "/sku-images/101055150_modelo-gray-ii-matte-ceramic-tile_display.avif",
  // WAL 4X12 SAGE SUBWAY — Subway Glossy Sage Green
  100329113: "/sku-images/101068773_la-belle-sage-ceramic-polished-tile_display.avif",
  // MOS 2X2 HEX CARRARA — Hexagon Mosaic
  100329128: "/sku-images/100831726_la-belle-purity-hexagon-ceramic-mosaic_display.avif",
  // MOS PENNY ROUND WHITE — Penny Round Mosaic
  100329198: "/sku-images/100872985_calacatta-vecchia-ceramic-penny-mosaic_display.avif",
  // DEC PICKET BLEND IVORY — Decorative Picket
  100329245: "/sku-images/100837277_monterrey-rojo-quarry-tile_display.avif",

  /* ── Laminate & Vinyl ───────────────────────────────────────────────────── */
  // NUC 7X48 BLONDE OAK — Nucore SPC Wood Look
  100329262: "/sku-images/101069623_grand-oak-waterproof-laminate-plank_display.avif",
  // NUC 7X48 GREIGE — Nucore SPC Gray Wood Look
  100329308: "/sku-images/101066991_highguard-silver-waterproof-rigid-core-luxury-vinyl-plank---foam-pad_display.avif",
  // NUC PERF 9X60 DRIFTWOOD — WPC Embossed
  100329343: "/sku-images/101068476_stormy-elm-waterproof-rigid-core-luxury-vinyl-plank---foam-pad_display.avif",
  // DUR 7X54 NATURAL HICKORY — SPC EIR
  100329395: "/sku-images/100997105_cocoa-waterproof-laminate-plank_display.avif",
  // DUR 12X24 SLATE STONE — SPC Stone Look
  100329449: "/sku-images/101492379_lakewood-rigid-core-luxury-vinyl-plank---foam-pad_display.avif",
  // AQG 7X54 WARM OAK — Laminate EIR
  100329533: "/sku-images/101141414_franconia-trail-waterproof-laminate-plank_display.avif",
  // HYD+ 9X60 HICKORY CHESTNUT — no matching image → SVG fallback (omitted)
  // OPT 7X48 COASTAL GRAY  — no matching image → SVG fallback (omitted)
};
