import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Modal, Chips, FiltersStrip, FilterPanel } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import Sparkline from "../components/Sparkline.jsx";
import { color } from "../styles/tokens.js";
import {
  PEER_CONTEXT,
  CATEGORIES,
  SKUS,
  COMPARE_ROWS,
  HEATMAP_STORES,
  WINNER_TOTAL,
  LOSER_TOTAL,
  FLAG_META,
  heatColor,
} from "../data/peer.js";
import "./PeerIntelligence.css";
import { panelSx } from "../styles/panelSx.js";


function ConfidenceBar({ score, width = 64 }) {
  const role = score >= 75 ? "success" : score >= 50 ? "warning" : "error";
  return (
    <Stack direction="row" align="center" gap={2}>
      <div className="pi-conf-track" style={{ width }}>
        <div className="pi-conf-fill" style={{ width: `${score}%`, background: `var(--color-${role})` }} />
      </div>
      <Text variant="micro" tone="muted" mono>{score}</Text>
    </Stack>
  );
}

function IconBadge({ tone, glyph }) {
  return (
    <span className="pi-icon-badge" style={{ background: `var(--color-${tone}-soft)`, color: `var(--color-${tone})` }}>
      <Text variant="caption" tone="inherit" style={{ fontWeight: 700 }}>{glyph}</Text>
    </span>
  );
}

const fmtK = (n) => `$${(Math.abs(n) / 1000).toFixed(Math.abs(n) >= 100000 ? 0 : 1)}k`;

export default function PeerIntelligence() {
  const [category, setCategory] = useState("all");
  const [reviewList, setReviewList] = useState(() => new Set());
  const [exitFlags, setExitFlags] = useState(() => new Set());
  const [selectedSku, setSelectedSku] = useState(null);
  const [exportDone, setExportDone] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("category");

  const piFilterTags = useMemo(() => {
    if (category === "all") return [];
    const cat = CATEGORIES.find((c) => c.id === category);
    return [{ id: "category", label: "Category", values: [{ id: 1, label: cat ? `${cat.name}${cat.skuCount ? ` ${cat.skuCount.toLocaleString()}` : ""}` : category }] }];
  }, [category]);

  const CATEGORY_FD_OPTIONS = [{ value: "all", label: "All" }, ...CATEGORIES.map((c) => ({ value: c.id, label: `${c.name}${c.skuCount ? ` ${c.skuCount.toLocaleString()}` : ""}` }))];

  const catName = category === "all" ? null : CATEGORIES.find((c) => c.id === category)?.name;
  const inCategory = (s) => !catName || s.cat === catName;

  const winners = useMemo(() => SKUS.filter((s) => s.flag === "network-win" && inCategory(s)), [category]);
  const losers = useMemo(() => SKUS.filter((s) => (s.flag === "network-loser" || s.flag === "stale") && inCategory(s)), [category]);

  const addToReview = (sku) => setReviewList((s) => new Set(s).add(sku.id));
  const addAllWinners = () =>
    setReviewList((s) => {
      const ns = new Set(s);
      SKUS.filter((x) => x.flag === "network-win").forEach((x) => ns.add(x.id));
      return ns;
    });
  const flagExit = (sku) => setExitFlags((s) => new Set(s).add(sku.id));
  const flagAllExits = () =>
    setExitFlags((s) => {
      const ns = new Set(s);
      SKUS.filter((x) => x.flag === "network-loser" || x.flag === "stale").forEach((x) => ns.add(x.id));
      return ns;
    });

  const chips = [{ id: "all", name: "All" }, ...CATEGORIES];

  return (
    <Stack direction="column" gap={4}>
      {/* Header */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Stack direction="row" justify="space-between" align="flex-start" gap={4} wrap>
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Stack direction="row" align="center" gap={2} wrap>
                <Text variant="overline" tone="subtle">Assortment Intelligence · Peer Intelligence</Text>
                <Badge variant="subtle" size="small" color="info" label="Stage 2" />
              </Stack>
              <Text variant="title">Peer Comparison</Text>
              <Text variant="caption" tone="muted">
                {PEER_CONTEXT.storeName} ({PEER_CONTEXT.storeId}) · compared to{" "}
                <strong style={{ color: "var(--color-primary)" }}>{PEER_CONTEXT.cluster}</strong> cluster ({PEER_CONTEXT.clusterStores} stores)
              </Text>
            </Stack>
            <Stack direction="row" gap={3} wrap>
              <Button variant="secondary" size="small" onClick={() => { setExportDone(true); setTimeout(() => setExportDone(false), 2500); }}>
                {exportDone ? "✓ Exported" : "Export"}
              </Button>
              <Button variant="primary" size="small" onClick={addAllWinners}>
                Add to Review List ({reviewList.size})
              </Button>
            </Stack>
          </Stack>

          {/* Category chips moved to FiltersStrip below */}
        </Stack>
      </Card>

      <FiltersStrip
        filterTags={piFilterTags}
        filterButtonLabel="All Filters"
        filterButtonClick={() => setFilterPanelOpen(true)}
        hideSelectedFilterBadge
        recentFilters={[]}
        savedFiltersBadge={[]}
        savedFilterLists={[]}
        selectedFilter={null}
        setSelectedFilter={() => {}}
        handleBadgeChange={() => {}}
        handleSavedRecentFilterDropdown={() => {}}
      />
      <FilterPanel
        title="Peer Intelligence Filters"
        size="medium"
        anchor="right"
        isOpen={filterPanelOpen}
        setIsOpen={setFilterPanelOpen}
        active={activeFilterTab}
        setActive={setActiveFilterTab}
        filters={[
          {
            value: "category",
            title: "Category",
            numberOfFilter: category !== "all" ? 1 : 0,
            children: (
              <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
                <FdSelect label="Category" value={category} options={CATEGORY_FD_OPTIONS} onChange={setCategory} width={320} />
              </Stack>
            ),
          },
        ]}
        primaryButtonLabel="Apply"
        onPrimaryButtonClick={() => setFilterPanelOpen(false)}
        secondaryButtonLabel="Clear all"
        onSecondaryButtonClick={() => setCategory("all")}
      />

      {/* My Store vs Cluster comparison */}
      <div className="pi-card">
        <Stack className="pi-card-head" direction="row" gap={3} wrap>
          <IconBadge tone="primary" glyph="≋" />
          <Stack direction="column" gap={0} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="body-strong" tone="strong">My Store vs Cluster</Text>
            <Text variant="micro" tone="subtle">{PEER_CONTEXT.category} category — {PEER_CONTEXT.networkSkus.toLocaleString()} SKUs network-wide</Text>
          </Stack>
          <Badge variant="subtle" size="small" color="info" label={`Macro · ${PEER_CONTEXT.cluster}`} />
        </Stack>

        <Grid columns="2fr 1fr 1fr 1fr" gap={2} style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <Text variant="overline" tone="subtle">Metric</Text>
          <Text variant="overline" tone="subtle" style={{ textAlign: "right" }}>My Store</Text>
          <Text variant="overline" tone="subtle" style={{ textAlign: "right" }}>Cluster Avg</Text>
          <Text variant="overline" tone="subtle" style={{ textAlign: "right" }}>Top Quartile</Text>
        </Grid>

        {COMPARE_ROWS.map((r) => (
          <Grid
            key={r.metric}
            columns="2fr 1fr 1fr 1fr"
            gap={2}
            align="center"
            className={`pi-cmp-row${r.highlight ? ` ${r.highlight}` : ""}`}
          >
            <Text variant="caption" tone="strong">{r.metric}</Text>
            <Stack direction="row" align="center" justify="flex-end" gap={2}>
              {r.highlight === "win" ? <Text variant="micro" tone="success">▲</Text> : null}
              {r.highlight === "loser" ? <Text variant="micro" tone="error">▼</Text> : null}
              <Text variant="caption" tone="strong" mono>{r.a}</Text>
            </Stack>
            <Text variant="caption" tone="muted" mono style={{ textAlign: "right" }}>{r.b}</Text>
            <Text variant="caption" tone="muted" mono style={{ textAlign: "right" }}>{r.c}</Text>
          </Grid>
        ))}
      </div>

      {/* SKU drill-downs */}
      <Grid min={360} gap={4}>
        {/* Network Winners — Not Carried */}
        <div className="pi-card">
          <Stack className="pi-card-head" direction="row" gap={3} wrap>
            <IconBadge tone="success" glyph="↑" />
            <Stack direction="column" gap={0} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="body-strong" tone="strong">Network Winners — Not Carried</Text>
              <Text variant="micro" tone="subtle">Ranked by est. revenue opportunity</Text>
            </Stack>
            <Badge variant="subtle" size="small" color="success" label={String(WINNER_TOTAL)} />
          </Stack>

          {winners.length === 0 ? (
            <Stack paddingX={3} paddingY={4} align="center"><Text variant="caption" tone="subtle">No winners in this category.</Text></Stack>
          ) : (
            winners.map((s) => {
              const inList = reviewList.has(s.id);
              return (
                <Stack key={s.id} className={`pi-sku${inList ? " in-list" : ""}`} direction="row" gap={3} onClick={() => setSelectedSku(s)}>
                  <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                    <Stack direction="row" align="center" gap={2} wrap>
                      <Text variant="micro" tone="muted" mono>{s.id}</Text>
                      <Text variant="micro" tone="subtle">· {s.sub}</Text>
                    </Stack>
                    <Text variant="caption" tone="strong">{s.name}</Text>
                    <Stack direction="row" align="center" gap={3} wrap>
                      <Text variant="micro" tone="muted"><strong style={{ color: "var(--color-text)" }}>{s.peerCarry}%</strong> peers carry</Text>
                      <Text variant="micro" tone="muted"><strong style={{ color: "var(--color-success)" }}>{s.peerST}%</strong> sell-through</Text>
                      <Sparkline data={s.trend} width={48} height={16} color={color.success} fill={color.success} />
                    </Stack>
                  </Stack>
                  <Stack direction="column" align="flex-end" gap={2} style={{ flex: "0 0 auto" }}>
                    <Text variant="caption" tone="success" mono style={{ fontWeight: 700 }}>+{fmtK(s.revOpp)}</Text>
                    <ConfidenceBar score={s.confidence} />
                    <Button
                      variant={inList ? "secondary" : "tertiary"}
                      size="small"
                      disabled={inList}
                      onClick={(e) => { e.stopPropagation(); addToReview(s); }}
                    >
                      {inList ? "✓ Added" : "+ Review"}
                    </Button>
                  </Stack>
                </Stack>
              );
            })
          )}

          <Stack className="pi-card-head" direction="row" justify="space-between" align="center" style={{ borderBottom: "none", borderTop: "1px solid var(--color-border)" }}>
            <Button variant="tertiary" size="small">View all {WINNER_TOTAL} →</Button>
            <Button variant="secondary" size="small" onClick={addAllWinners}>Add all to Review List</Button>
          </Stack>
        </div>

        {/* Losers — Still Carried */}
        <div className="pi-card">
          <Stack className="pi-card-head" direction="row" gap={3} wrap>
            <IconBadge tone="error" glyph="↓" />
            <Stack direction="column" gap={0} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="body-strong" tone="strong">Losers — Still Carried</Text>
              <Text variant="micro" tone="subtle">Ranked by trapped capital</Text>
            </Stack>
            <Badge variant="subtle" size="small" color="error" label={String(LOSER_TOTAL)} />
          </Stack>

          {losers.length === 0 ? (
            <Stack paddingX={3} paddingY={4} align="center"><Text variant="caption" tone="subtle">No losers in this category.</Text></Stack>
          ) : (
            losers.map((s) => {
              const flagged = exitFlags.has(s.id);
              return (
                <Stack key={s.id} className="pi-sku" direction="row" gap={3} wrap onClick={() => setSelectedSku(s)}>
                  <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                    <Stack direction="row" align="center" gap={2} wrap>
                      <Text variant="micro" tone="muted" mono>{s.id}</Text>
                      <Text variant="micro" tone="subtle">· {s.sub}</Text>
                      {s.flag === "stale" ? <Badge variant="subtle" size="small" color="warning" label="Stale" /> : null}
                    </Stack>
                    <Text variant="caption" tone="strong">{s.name}</Text>
                    <Stack direction="row" align="center" gap={3} wrap>
                      <Text variant="micro" tone="muted"><strong style={{ color: "var(--color-error)" }}>{s.weeksAtLoser}w</strong> at status</Text>
                      <Text variant="micro" tone="muted"><strong style={{ color: "var(--color-text)" }}>{s.plrCycles}</strong> PLR cycles</Text>
                      <Sparkline data={s.trend} width={48} height={16} color={color.error} fill={color.error} />
                    </Stack>
                  </Stack>
                  <Stack direction="column" align="flex-end" gap={2} style={{ flex: "0 0 auto" }}>
                    <Text variant="caption" tone="error" mono style={{ fontWeight: 700 }}>−{fmtK(s.trapped)}</Text>
                    <ConfidenceBar score={s.confidence} />
                    <Button
                      variant={flagged ? "secondary" : "tertiary"}
                      size="small"
                      disabled={flagged}
                      onClick={(e) => { e.stopPropagation(); flagExit(s); }}
                    >
                      {flagged ? "✓ Flagged" : "⚑ Flag for exit"}
                    </Button>
                  </Stack>
                </Stack>
              );
            })
          )}

          <Stack className="pi-card-head" direction="row" justify="space-between" align="center" style={{ borderBottom: "none", borderTop: "1px solid var(--color-border)" }}>
            <Button variant="tertiary" size="small">View all {LOSER_TOTAL} →</Button>
            <Button variant="secondary" size="small" onClick={flagAllExits}>Flag all for exit review</Button>
          </Stack>
        </div>
      </Grid>

      {/* Cross-store variance heatmap */}
      <div className="pi-card">
        <Stack className="pi-card-head" direction="row" gap={3} wrap>
          <IconBadge tone="accent" glyph="▦" />
          <Stack direction="column" gap={0} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="body-strong" tone="strong">Cross-Store Sell-Through Variance</Text>
            <Text variant="micro" tone="subtle">{PEER_CONTEXT.cluster} · {PEER_CONTEXT.clusterStores} stores · {CATEGORIES.length} categories</Text>
          </Stack>
          <Stack direction="row" align="center" gap={2}>
            <Text variant="micro" tone="subtle">Low</Text>
            <span className="pi-legend-bar" />
            <Text variant="micro" tone="subtle">High</Text>
          </Stack>
        </Stack>

        <div className="pi-heat">
          <Grid columns="170px repeat(6, 1fr)" gap={1} align="center" style={{ minWidth: 720 }}>
            <div />
            {HEATMAP_STORES.map((st) => (
              <Stack key={st.id} direction="column" gap={0} align="center">
                <Text variant="micro" tone="muted" style={{ textAlign: "center" }}>{st.name}</Text>
                <Text variant="micro" tone="subtle" mono>{st.id}</Text>
              </Stack>
            ))}
            {CATEGORIES.map((c, ci) => (
              <React.Fragment key={c.id}>
                <Stack direction="row" align="center" gap={2} style={{ padding: "6px 0" }}>
                  <Text variant="caption" tone="primary">{c.icon}</Text>
                  <Text variant="caption" tone="strong">{c.name}</Text>
                </Stack>
                {HEATMAP_STORES.map((st, si) => {
                  const v = ((ci * 37 + si * 13) % 100) / 100;
                  const pct = Math.round(40 + v * 50);
                  return (
                    <div key={st.id} className={`pi-heat-cell${st.isMe ? " is-me" : ""}`} style={{ background: heatColor(v) }}>
                      <Text variant="caption" tone="strong" mono>{pct}%</Text>
                      {st.isMe ? <span className="pi-heat-you">YOU</span> : null}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </Grid>
        </div>
      </div>

      {/* SKU detail modal */}
      <Modal
        open={!!selectedSku}
        onClose={() => setSelectedSku(null)}
        width="560px"
        maxHeight="86vh"
        title={
          selectedSku ? (
            <Stack direction="row" align="center" gap={2}>
              <Badge variant="subtle" size="small" color={FLAG_META[selectedSku.flag]?.badge || "default"} label={FLAG_META[selectedSku.flag]?.label || selectedSku.flag} />
              <Text variant="caption" tone="muted" mono>{selectedSku.id}</Text>
            </Stack>
          ) : ""
        }
      >
        {selectedSku ? <SkuDetail sku={selectedSku} inReview={reviewList.has(selectedSku.id)} flagged={exitFlags.has(selectedSku.id)} onReview={() => addToReview(selectedSku)} onFlag={() => flagExit(selectedSku)} /> : null}
      </Modal>
    </Stack>
  );
}

function SkuDetail({ sku, inReview, flagged, onReview, onFlag }) {
  const isWin = sku.flag === "network-win" || sku.flag === "emerging";
  const sparkColor = isWin ? color.success : color.error;
  const stats = [
    { l: "Cluster carry rate", v: `${sku.peerCarry}%` },
    { l: "Classification", v: sku.classification },
    { l: "Pro/DIY split", v: sku.proSplit },
    { l: "Confidence", v: `${sku.confidence}/100` },
    { l: isWin ? "Est. revenue opportunity" : "Est. trapped / risk", v: isWin ? `+${fmtK(sku.revOpp)}/yr` : `−${fmtK(sku.trapped || Math.abs(sku.revOpp || 0))}` },
    { l: "Cycles at status", v: sku.plrCycles ? `${sku.plrCycles} PLR · ${sku.weeksAtLoser}w` : "—" },
  ];
  const breakdown = [
    { label: "Data completeness", score: 92 },
    { label: "Peer agreement strength", score: sku.peerCarry },
    { label: "Trend significance (4w)", score: 78 },
    { label: "Annotation overrides", score: 88 },
  ];
  return (
    <Stack direction="column" gap={3}>
      <Stack direction="column" gap={1}>
        <Text variant="heading" tone="strong">{sku.name}</Text>
        <Text variant="caption" tone="muted">
          {sku.cat} · {sku.sub}
          {sku.supplier ? <> · Supplier: <strong style={{ color: "var(--color-text)" }}>{sku.supplier}</strong></> : null}
        </Text>
      </Stack>

      <Stack direction="column" gap={2} style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)", borderRadius: "var(--r2)", padding: "var(--sp-3)" }}>
        <Stack direction="row" align="baseline" gap={2}>
          <Text variant="kpi" tone={isWin ? "success" : "error"}>{sku.peerST}%</Text>
          <Text variant="micro" tone="muted">peer sell-through · 12-week trend</Text>
        </Stack>
        <Sparkline data={sku.trend} width={500} height={64} color={sparkColor} fill={sparkColor} strokeWidth={2} />
      </Stack>

      <Grid min={200} gap={2}>
        {stats.map((s) => (
          <div key={s.l} className="pi-detail">
            <Text variant="micro" tone="subtle">{s.l}</Text>
            <Text variant="caption" tone="strong" mono>{s.v}</Text>
          </div>
        ))}
      </Grid>

      <Stack direction="column" gap={2} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--r2)", padding: "var(--sp-3)" }}>
        <Stack direction="row" align="center" gap={2}>
          <Text variant="caption" tone="strong">Confidence breakdown</Text>
          <Text variant="body-strong" tone="success" mono style={{ marginLeft: "auto" }}>{sku.confidence}</Text>
        </Stack>
        {breakdown.map((b) => (
          <Stack key={b.label} direction="row" align="center" gap={3}>
            <Text variant="micro" tone="muted" style={{ flex: 1 }}>{b.label}</Text>
            <ConfidenceBar score={b.score} width={120} />
          </Stack>
        ))}
      </Stack>

      <Stack direction="row" gap={2} wrap>
        {isWin ? (
          <Button variant={inReview ? "secondary" : "primary"} disabled={inReview} onClick={onReview} style={{ flex: 1, justifyContent: "center" }}>
            {inReview ? "✓ Added to Review List" : "+ Add to Review List"}
          </Button>
        ) : (
          <Button variant="primary" type={flagged ? "default" : "destructive"} disabled={flagged} onClick={onFlag} style={{ flex: 1, justifyContent: "center" }}>
            {flagged ? "✓ Flagged for Exit" : "⚑ Flag for Exit Review"}
          </Button>
        )}
        <Button variant="secondary">Open in PIM</Button>
      </Stack>

      <Stack direction="column" gap={1} style={{ background: "var(--color-warning-soft)", border: "1px solid var(--color-warning)", borderLeft: "3px solid var(--color-warning)", borderRadius: "var(--r2)", padding: "var(--sp-3)" }}>
        <Text variant="caption" tone="warning" style={{ fontWeight: 700 }}>Disagree with this signal?</Text>
        <Text variant="micro" tone="muted">Add local context. The DA team reviews disagreements weekly.</Text>
        <Stack direction="row"><Button variant="secondary" size="small">Disagree with reason</Button></Stack>
      </Stack>
    </Stack>
  );
}
