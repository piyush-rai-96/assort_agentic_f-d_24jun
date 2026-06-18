import { useMemo, useState } from "react";
import { Card, Button, Badge, Checkbox, Input, Chips, FiltersStrip, FilterPanel } from "impact-ui";
import { X, Pencil, ClipboardList } from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import FdSelect from "../components/FdSelect.jsx";
import {
  PLR_DEPTS,
  MONTHS,
  YEARS,
  PLR_DEPT_COLOR,
  PLR_DEPT_BADGE,
  buildWeeks,
  seedPlrItems,
} from "../data/plr.js";
import "./PlrCalendar.css";
import { panelSx } from "../styles/panelSx.js";


const GRID_COLS = "2.4fr 1.2fr 90px 130px 130px 110px 56px";
const DEPT_FILTERS = ["All", ...PLR_DEPTS];
const emptyDraft = { dept: "", month: "", year: 2026, startWk: 0, endWk: undefined, status: "Open" };
const emptyFlow = { name: "", type: "phase", start: "", end: "" };

export default function PlrCalendar() {
  const [plrItems, setPlrItems] = useState(seedPlrItems);
  const [deptFilter, setDeptFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editKey, setEditKey] = useState(null); // `${plrId}|${flowId}`
  const [editDraft, setEditDraft] = useState(emptyFlow);
  const [addFor, setAddFor] = useState(null); // plrId
  const [addDraft, setAddDraft] = useState(emptyFlow);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("dept");

  const allItems = useMemo(() => Object.values(plrItems), [plrItems]);
  const filteredItems = useMemo(() => {
    const list = deptFilter === "All" ? allItems : allItems.filter((p) => p.dept === deptFilter);
    return [...list].sort((a, b) => {
      if (a.status === "Open" && b.status !== "Open") return -1;
      if (b.status === "Open" && a.status !== "Open") return 1;
      return (b.presDate || "").localeCompare(a.presDate || "");
    });
  }, [allItems, deptFilter]);

  const openCount = allItems.filter((p) => p.status === "Open").length;
  const closedCount = allItems.filter((p) => p.status === "Closed").length;

  const plrFilterTags = useMemo(() => {
    const tags = [];
    if (deptFilter !== "All") {
      tags.push({ id: "dept", label: "Department", values: [{ id: 1, label: deptFilter }] });
    }
    return tags;
  }, [deptFilter]);

  const DEPT_FD_OPTIONS = PLR_DEPTS.map((d) => ({ value: d, label: d }));

  /* ── New-PLR form derived values ── */
  const calWeeks = useMemo(
    () => (draft.month && draft.year ? buildWeeks(draft.month, parseInt(draft.year, 10)) : []),
    [draft.month, draft.year]
  );
  const selStart = draft.startWk !== undefined && calWeeks[draft.startWk] ? calWeeks[draft.startWk].clampStart : "";
  const selEnd = draft.endWk !== undefined && calWeeks[draft.endWk] ? calWeeks[draft.endWk].clampEnd : "";
  const autoName = draft.dept && draft.month && draft.year ? `${draft.dept.toUpperCase()} ${draft.month.toUpperCase()} - ${draft.year}` : "";

  /* ── Mutations ── */
  const patchItem = (id, fn) => setPlrItems((prev) => ({ ...prev, [id]: fn(prev[id]) }));

  const toggleFlows = (id) => patchItem(id, (p) => ({ ...p, flowsOpen: !p.flowsOpen }));
  const deleteItem = (id) => {
    if (!window.confirm("Delete this PLR?")) return;
    setPlrItems((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };
  const toggleFlowDone = (plrId, flowId) =>
    patchItem(plrId, (p) => ({ ...p, flows: p.flows.map((f) => (f.id === flowId ? { ...f, done: !f.done } : f)) }));
  const deleteFlow = (plrId, flowId) =>
    patchItem(plrId, (p) => ({ ...p, flows: p.flows.filter((f) => f.id !== flowId) }));

  const startEditFlow = (plrId, flow) => {
    setEditKey(`${plrId}|${flow.id}`);
    setEditDraft({ name: flow.name, type: flow.type, start: flow.start || "", end: flow.end || "" });
    setAddFor(null);
  };
  const saveEditFlow = (plrId, flowId) => {
    patchItem(plrId, (p) => ({ ...p, flows: p.flows.map((f) => (f.id === flowId ? { ...f, ...editDraft } : f)) }));
    setEditKey(null);
  };
  const startAddFlow = (p) => {
    setAddFor(p.id);
    setAddDraft({ name: "", type: "phase", start: p.presDate || "", end: p.dueDate || "" });
    setEditKey(null);
  };
  const saveAddFlow = (plrId) => {
    if (!addDraft.name.trim()) return;
    const flow = { id: `f${Date.now()}`, name: addDraft.name.trim(), type: addDraft.type, start: addDraft.start, end: addDraft.end, done: false };
    patchItem(plrId, (p) => ({ ...p, flows: [...p.flows, flow] }));
    setAddFor(null);
  };

  const saveNew = () => {
    if (!draft.dept || !draft.month || !draft.year) {
      window.alert("Please select a department, month, and year.");
      return;
    }
    const weeks = buildWeeks(draft.month, parseInt(draft.year, 10));
    if (!weeks.length) return;
    const startWk = draft.startWk !== undefined ? draft.startWk : 0;
    const endWk = draft.endWk !== undefined ? draft.endWk : weeks.length - 1;
    const id = `plr-${Date.now()}`;
    const item = {
      id,
      calId: null,
      name: `${draft.dept.toUpperCase()} ${draft.month.toUpperCase()} - ${draft.year}`,
      dept: draft.dept,
      presDate: weeks[startWk].clampStart,
      dueDate: weeks[endWk].clampEnd,
      status: draft.status || "Open",
      flowsOpen: false,
      flows: [],
    };
    setPlrItems((prev) => ({ ...prev, [id]: item }));
    setShowForm(false);
    setDraft(emptyDraft);
  };

  /* ── Render helpers ── */
  const weekOptions = calWeeks.map((w, i) => ({ value: i, label: `${w.label} (${w.clampStart} → ${w.clampEnd})` }));

  return (
    <Stack direction="column" gap={4}>
      {/* Header */}
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="flex-start" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">PLR Calendar</Text>
            <Text variant="caption" tone="muted" />
          </Stack>
          <Button variant="primary" size="medium" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <><X size={13} aria-hidden="true" /> Close</> : "+ Create new PLR"}
          </Button>
        </Stack>
      </Card>

      {/* Filters strip */}
      <FiltersStrip
        filterTags={plrFilterTags}
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
        title="PLR Filters"
        size="medium"
        anchor="right"
        isOpen={filterPanelOpen}
        setIsOpen={setFilterPanelOpen}
        active={activeFilterTab}
        setActive={setActiveFilterTab}
        filters={[
          {
            value: "dept",
            title: "Department",
            numberOfFilter: deptFilter !== "All" ? 1 : 0,
            children: (
              <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
                <FdSelect
                  label="Department"
                  value={deptFilter === "All" ? "" : deptFilter}
                  options={[{ value: "", label: "All" }, ...DEPT_FD_OPTIONS]}
                  onChange={(v) => setDeptFilter(v || "All")}
                  width={320}
                />
              </Stack>
            ),
          },
        ]}
        primaryButtonLabel="Apply"
        onPrimaryButtonClick={() => setFilterPanelOpen(false)}
      />

      {/* New PLR form */}
      {showForm ? (
        <Card sx={{ ...panelSx, background: "var(--color-surface-alt)" }}>
          <Stack direction="column" gap={3}>
            <Text variant="overline" tone="primary" />
            <Grid columns="repeat(auto-fit, minmax(180px, 1fr))" gap={3} align="end">
              <FdSelect label="Department" value={draft.dept} options={PLR_DEPTS.map((d) => ({ value: d, label: d }))} onChange={(v) => setDraft((p) => ({ ...p, dept: v }))} />
              <FdSelect label="Month" value={draft.month} options={MONTHS.map((m) => ({ value: m, label: m }))} onChange={(v) => setDraft((p) => ({ ...p, month: v, startWk: 0, endWk: undefined }))} />
              <FdSelect label="Year" value={draft.year} options={YEARS.map((y) => ({ value: y, label: String(y) }))} onChange={(v) => setDraft((p) => ({ ...p, year: v, startWk: 0, endWk: undefined }))} />
              <FdSelect label="Status" value={draft.status} options={["Open", "Closed"].map((s) => ({ value: s, label: s }))} onChange={(v) => setDraft((p) => ({ ...p, status: v }))} />
            </Grid>

            <Grid columns="repeat(auto-fit, minmax(240px, 1fr))" gap={3} align="end">
              <Stack direction="column" gap={1}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Start week</Text>
                {calWeeks.length ? (
                  <FdSelect value={draft.startWk} options={weekOptions} onChange={(v) => setDraft((p) => ({ ...p, startWk: v, endWk: p.endWk === undefined || p.endWk < v ? v : p.endWk }))} />
                ) : (
                  <div className="plr-summary" />
                )}
              </Stack>
              <Stack direction="column" gap={1}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>End week</Text>
                {calWeeks.length ? (
                  <FdSelect value={draft.endWk} options={weekOptions} onChange={(v) => setDraft((p) => ({ ...p, endWk: v, startWk: v < p.startWk ? v : p.startWk }))} />
                ) : (
                  <div className="plr-summary" />
                )}
              </Stack>
              <Stack direction="column" gap={1}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Period name &amp; span</Text>
                <div className={`plr-summary${autoName && selStart ? " is-set" : ""}`}>
                  <Text variant="body-strong" tone={autoName ? "primary" : "subtle"}>{autoName || "—"}</Text>
                  {selStart && selEnd ? (
                    <Text variant="micro" tone="muted" mono>{selStart} → {selEnd}</Text>
                  ) : (
                  <Text variant="micro" tone="subtle" />
                  )}
                </div>
              </Stack>
            </Grid>

            {calWeeks.length ? (
              <div style={{ overflowX: "auto" }}>
                <Grid columns={`repeat(${calWeeks.length}, minmax(72px, 1fr))`} gap={2} style={{ minWidth: calWeeks.length * 76 }}>
                  {calWeeks.map((w, i) => {
                    const inRange = draft.startWk !== undefined && draft.endWk !== undefined && i >= draft.startWk && i <= draft.endWk;
                    const isStart = i === draft.startWk;
                    const isEnd = i === draft.endWk;
                    return (
                      <Stack key={w.start} direction="column" gap={1} className={`plr-week${inRange ? " in-range" : ""}`}>
                        <Text variant="micro" tone={inRange ? "strong" : "subtle"} style={{ fontWeight: 800 }}>{w.label}</Text>
                        <Text variant="micro" tone={inRange ? "muted" : "subtle"} mono>{w.clampStart}</Text>
                        <Text variant="micro" tone={inRange ? "muted" : "subtle"} mono>{w.clampEnd}</Text>
                        {isStart ? <Text variant="micro" tone="primary" style={{ fontWeight: 700 }}>START</Text> : null}
                        {isEnd && !isStart ? <Text variant="micro" tone="primary" style={{ fontWeight: 700 }}>END</Text> : null}
                      </Stack>
                    );
                  })}
                </Grid>
              </div>
            ) : null}

            <Stack direction="row" gap={3} align="center" wrap>
              <Button variant="primary" size="medium" onClick={saveNew}>Save PLR</Button>
              <Button variant="secondary" size="medium" onClick={() => { setShowForm(false); setDraft(emptyDraft); }}><X size={13} aria-hidden="true" /> Cancel</Button>
              <Text variant="micro" tone="subtle" />
            </Stack>
          </Stack>
        </Card>
      ) : null}

      {/* List */}
      {!filteredItems.length ? (
        <Card sx={panelSx}>
          <Stack direction="column" gap={1} align="center" paddingY={6}>
            <ClipboardList size={24} aria-hidden="true" style={{ color: "var(--color-text-subtle)" }} />
            <Text variant="body-strong" tone="muted">No PLRs found</Text>
            <Text variant="caption" tone="subtle" />
          </Stack>
        </Card>
      ) : (
        <Stack direction="column" gap={3}>
          <Grid className="plr-colhead" columns={GRID_COLS} gap={0}>
            {["PLR Name", "Department", "PLR ID", "Presentation Date", "Final Due Date", "Status", ""].map((c, i) => (
              <Text key={i} variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>{c}</Text>
            ))}
          </Grid>

          {filteredItems.map((p) => {
            const dc = PLR_DEPT_COLOR[p.dept] || "var(--color-text-muted)";
            const doneFlows = p.flows.filter((f) => f.done).length;
            const open = p.flowsOpen;
            return (
              <div key={p.id} className="plr-card" style={{ borderLeft: `5px solid ${dc}` }}>
                {/* Header row */}
                <Grid className={`plr-row${open ? " is-open" : ""}`} columns={GRID_COLS} gap={0} onClick={() => toggleFlows(p.id)}>
                  <Stack direction="row" align="center" gap={2} style={{ minWidth: 0 }}>
                    <Text variant="micro" tone="subtle">{open ? "▲" : "▼"}</Text>
                    <Text variant="caption" tone="strong" truncate style={{ fontWeight: 700, textTransform: "uppercase" }}>{p.name}</Text>
                    {p.flows.length ? <Badge variant="subtle" size="small" color={PLR_DEPT_BADGE[p.dept] || "info"} label={`${doneFlows}/${p.flows.length} phases`} /> : null}
                  </Stack>
                  <div><Badge variant="subtle" size="small" color={PLR_DEPT_BADGE[p.dept] || "info"} label={p.dept} /></div>
                  <Text variant="caption" tone="subtle" mono>{p.calId || "—"}</Text>
                  <Text variant="caption" tone="default" mono>{p.presDate || "—"}</Text>
                  <Text variant="caption" tone="default" mono>{p.dueDate || "—"}</Text>
                  <div>
                    {p.status === "Open"
                      ? <Badge size="small" color="success" label="Open" />
                      : <Badge variant="stroke" size="small" color="default" label="Closed" />}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                            <Button variant="text" size="small" onClick={() => deleteItem(p.id)} aria-label="Delete PLR"><X size={13} aria-hidden="true" /></Button>
                  </div>
                </Grid>

                {/* Phases */}
                {open ? (
                  <div>
                    {p.flows.map((f) => {
                      const editing = editKey === `${p.id}|${f.id}`;
                      if (editing) {
                        return (
                          <div className="plr-form" onClick={(e) => e.stopPropagation()}>
                            <Stack direction="column" gap={2}>
                              <Input label="Phase name" value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} size="small" />
                              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr auto", gap: "var(--sp-3)", alignItems: "end" }}>
                                <FdSelect label="Type" value={editDraft.type} options={[{ value: "phase", label: "Phase" }, { value: "milestone", label: "Milestone" }]} onChange={(v) => setEditDraft((d) => ({ ...d, type: v }))} width={160} />
                                <Input label="Start" type="date" value={editDraft.start} onChange={(e) => setEditDraft((d) => ({ ...d, start: e.target.value }))} size="small" fullWidth />
                                <Input label="End" type="date" value={editDraft.end} onChange={(e) => setEditDraft((d) => ({ ...d, end: e.target.value }))} size="small" fullWidth />
                                <Stack direction="row" gap={2} align="flex-end" style={{ paddingBottom: 2 }}>
                                  <Button variant="primary" size="small" onClick={() => saveEditFlow(p.id, f.id)}>Save</Button>
                                  <Button variant="secondary" size="small" onClick={() => setEditKey(null)} aria-label="Cancel edit"><X size={13} aria-hidden="true" /></Button>
                                </Stack>
                              </div>
                            </Stack>
                          </div>
                        );
                      }
                      const fc = f.done ? dc : "var(--color-text-subtle)";
                      return (
                        <Grid key={f.id} className="plr-phase" columns={GRID_COLS} gap={0} onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" align="center" gap={2} style={{ minWidth: 0 }}>
                            <span className={`plr-phase-dot is-${f.type}`} style={{ background: fc }} />
                            <Text variant="caption" tone="default" truncate>{f.name}</Text>
                            <Badge variant="subtle" size="small" color={f.type === "milestone" ? "info" : "success"} label={f.type} />
                          </Stack>
                          <div />
                          <div />
                          <Text variant="caption" tone="muted" mono>{f.start || "—"}</Text>
                          <Text variant="caption" tone="muted" mono>{f.type === "milestone" ? "—" : f.end || "—"}</Text>
                          <Stack direction="row" align="center" gap={2}>
                            <Checkbox withoutFormLabel checked={!!f.done} onChange={() => toggleFlowDone(p.id, f.id)} />
                            <Text variant="micro" tone={f.done ? "success" : "subtle"} style={{ fontWeight: f.done ? 700 : 400 }}>{f.done ? "Done" : "Pending"}</Text>
                          </Stack>
                          <Stack direction="row" gap={2}>
                            <Button variant="text" size="small" onClick={() => startEditFlow(p.id, f)} aria-label="Edit phase"><Pencil size={12} aria-hidden="true" /></Button>
                            <Button variant="text" size="small" onClick={() => deleteFlow(p.id, f.id)}>✕</Button>
                          </Stack>
                        </Grid>
                      );
                    })}

                    {addFor === p.id ? (
                      <div className="plr-form" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="column" gap={2}>
                          <Input label="Phase / milestone name *" placeholder="e.g. Store curation window" value={addDraft.name} onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))} size="small" />
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr auto", gap: "var(--sp-3)", alignItems: "end" }}>
            <FdSelect label="Type" value={addDraft.type} options={[{ value: "phase", label: "Phase" }, { value: "milestone", label: "Milestone" }]} onChange={(v) => setAddDraft((d) => ({ ...d, type: v }))} width={160} />
            <Input label="Start date" type="date" value={addDraft.start} onChange={(e) => setAddDraft((d) => ({ ...d, start: e.target.value }))} size="small" fullWidth />
                            <Input label="End date" type="date" value={addDraft.end} onChange={(e) => setAddDraft((d) => ({ ...d, end: e.target.value }))} size="small" fullWidth />
                            <Stack direction="row" gap={2} align="flex-end" style={{ paddingBottom: 2 }}>
                              <Button variant="primary" size="small" onClick={() => saveAddFlow(p.id)}>+ Add</Button>
                              <Button variant="secondary" size="small" onClick={() => setAddFor(null)}>✕</Button>
                            </Stack>
                          </div>
                        </Stack>
                      </div>
                    ) : (
                      <div className="plr-addrow" onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="small" onClick={() => startAddFlow(p)}>+ Add phase or milestone</Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Stack>
      )}

      {/* Footer summary */}
      <Card sx={{ ...panelSx, padding: "var(--sp-3) var(--sp-4)" }}>
        <Stack direction="row" gap={3} align="center" wrap>
          <Text variant="caption" tone="strong">{allItems.length} PLRs</Text>
          <Text variant="caption" tone="subtle">·</Text>
          <Text variant="caption" tone="success">{openCount} open</Text>
          <Text variant="caption" tone="subtle">·</Text>
          <Text variant="caption" tone="muted">{closedCount} closed</Text>
          <Text variant="micro" tone="subtle" style={{ marginLeft: "auto" }} />
        </Stack>
      </Card>
    </Stack>
  );
}
