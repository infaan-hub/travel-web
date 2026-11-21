"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  DollarSign,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { SerializedRoutePrice } from "@/lib/services/route-prices";
import {
  formatTzs,
  formatUsd,
  tzsToUsd,
  USD_TO_TZS_RATE,
  usdToTzs,
} from "@/lib/zanzibar-route-pricing";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/route-prices-manager.module.css";

type RoutePricesManagerProps = {
  initialPrices: SerializedRoutePrice[];
  canManage: boolean;
  readOnlyNotice?: string;
  onRefresh: () => Promise<SerializedRoutePrice[]>;
  onCreate?: (payload: {
    origin: string;
    destination: string;
    one_way_usd: number;
    wait_return_usd: number;
    full_day_usd: number;
  }) => Promise<SerializedRoutePrice>;
  onUpdate?: (
    id: number,
    payload: {
      origin: string;
      destination: string;
      one_way_usd: number;
      wait_return_usd: number;
      full_day_usd: number;
    },
  ) => Promise<SerializedRoutePrice>;
  onDelete?: (id: number) => Promise<void>;
  onResetDefaults?: () => Promise<SerializedRoutePrice[]>;
};

type FormDraft = {
  origin: string;
  destination: string;
  oneWayUsd: string;
  waitReturnUsd: string;
  fullDayUsd: string;
};

const EMPTY_DRAFT: FormDraft = {
  origin: "",
  destination: "",
  oneWayUsd: "35",
  waitReturnUsd: "60",
  fullDayUsd: "120",
};

function tzsInputValue(usdStr: string): string {
  const num = Number(usdStr);
  if (!usdStr.trim() || !Number.isFinite(num) || num <= 0) return "";
  return String(usdToTzs(num));
}

export default function RoutePricesManager({
  initialPrices,
  canManage,
  readOnlyNotice,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  onResetDefaults,
}: RoutePricesManagerProps) {
  const toast = useToast();
  const [prices, setPrices] = useState<SerializedRoutePrice[]>(initialPrices);
  const [search, setSearch] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [savingCreate, setSavingCreate] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);

  const originGroups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of prices) {
      const clean = row.origin.trim();
      const key = clean.toLowerCase();
      if (clean && !seen.has(key)) seen.set(key, clean);
    }
    return ["All", ...Array.from(seen.values())];
  }, [prices]);

  const filteredPrices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prices.filter((row) => {
      if (
        selectedOrigin !== "All" &&
        row.origin.trim().toLowerCase() !== selectedOrigin.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return `${row.origin} ${row.destination}`.toLowerCase().includes(q);
    });
  }, [prices, search, selectedOrigin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const next = await onRefresh();
      setPrices(next);
    } catch {
      toast.error("Could not refresh route prices.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !onCreate) return;
    const ow = Number(createDraft.oneWayUsd);
    const wr = Number(createDraft.waitReturnUsd);
    const fd = Number(createDraft.fullDayUsd);
    if (!createDraft.origin.trim() || !createDraft.destination.trim()) {
      toast.error("Enter both origin and destination.");
      return;
    }
    if (createDraft.origin.trim().toLowerCase() === createDraft.destination.trim().toLowerCase()) {
      toast.error("Origin and destination must be different.");
      return;
    }
    if (!(ow > 0) || !(wr > 0) || !(fd > 0)) {
      toast.error("Enter valid positive USD prices for all 3 trip options.");
      return;
    }

    setSavingCreate(true);
    try {
      const created = await onCreate({
        origin: createDraft.origin.trim(),
        destination: createDraft.destination.trim(),
        one_way_usd: ow,
        wait_return_usd: wr,
        full_day_usd: fd,
      });
      setPrices((prev) => [created, ...prev]);
      setCreateDraft(EMPTY_DRAFT);
      setShowCreate(false);
      toast.success(`Added price for ${created.origin} – ${created.destination}.`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not add route price.");
    } finally {
      setSavingCreate(false);
    }
  };

  const startEdit = (row: SerializedRoutePrice) => {
    if (!canManage) return;
    setEditingId(row.id);
    setEditDraft({
      origin: row.origin,
      destination: row.destination,
      oneWayUsd: String(row.one_way_usd),
      waitReturnUsd: String(row.wait_return_usd),
      fullDayUsd: String(row.full_day_usd),
    });
  };

  const handleSaveEdit = async (id: number) => {
    if (!canManage || !onUpdate) return;
    const ow = Number(editDraft.oneWayUsd);
    const wr = Number(editDraft.waitReturnUsd);
    const fd = Number(editDraft.fullDayUsd);
    if (!editDraft.origin.trim() || !editDraft.destination.trim()) {
      toast.error("Origin and destination cannot be empty.");
      return;
    }
    if (!(ow > 0) || !(wr > 0) || !(fd > 0)) {
      toast.error("Enter valid positive prices for all 3 options.");
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await onUpdate(id, {
        origin: editDraft.origin.trim(),
        destination: editDraft.destination.trim(),
        one_way_usd: ow,
        wait_return_usd: wr,
        full_day_usd: fd,
      });
      setPrices((prev) => prev.map((row) => (row.id === id ? updated : row)));
      setEditingId(null);
      toast.success(`Updated ${updated.origin} – ${updated.destination}.`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not update route price.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (row: SerializedRoutePrice) => {
    if (!canManage || !onDelete) return;
    if (!window.confirm(`Delete price for ${row.origin} – ${row.destination}?`)) return;
    setDeletingId(row.id);
    try {
      await onDelete(row.id);
      setPrices((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) setEditingId(null);
      toast.success("Route price deleted.");
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not delete route price.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetDefaults = async () => {
    if (!canManage || !onResetDefaults) return;
    if (
      !window.confirm(
        "Reset all route prices back to the 100 standard Zanzibar routes? Custom edits will be replaced.",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      const restored = await onResetDefaults();
      setPrices(restored);
      setSelectedOrigin("All");
      setEditingId(null);
      toast.success("Restored all 100 standard Zanzibar route prices.");
    } catch {
      toast.error("Could not restore standard prices.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div id="route-prices-manager" className={styles.manager}>
      {!canManage ? (
        <div className={styles.readOnlyBanner} role="status">
          <Lock size={16} aria-hidden="true" />
          <span>
            {readOnlyNotice ||
              "View-only access: private hire company drivers cannot edit or delete prices. Your company sets these prices in /company/prices/."}
          </span>
        </div>
      ) : null}

      {/* Summary & Action Bar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search route (e.g. Airport, Stone Town, Nungwi, Paje)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <span className={styles.rateBadge}>
            <DollarSign size={13} aria-hidden="true" />
            $1 = {formatTzs(USD_TO_TZS_RATE)} · {filteredPrices.length} routes
          </span>
        </div>

        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => void handleRefresh()}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? styles.spin : ""} aria-hidden="true" />
            Refresh
          </button>

          {canManage ? (
            <>
              {onResetDefaults ? (
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => void handleResetDefaults()}
                  disabled={resetting}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  {resetting ? "Resetting…" : "Restore 100 defaults"}
                </button>
              ) : null}

              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setShowCreate((open) => !open)}
              >
                {showCreate ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                {showCreate ? "Close form" : "Add route price"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Create Route Price Form */}
      {canManage && showCreate ? (
        <form className={styles.createCard} onSubmit={handleCreateSubmit}>
          <h3 className={styles.createTitle}>Add custom route price ($ &amp; TSh)</h3>
          <div className={styles.createGrid}>
            <label className={styles.field}>
              <span>Origin</span>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Airport"
                value={createDraft.origin}
                onChange={(e) => setCreateDraft((d) => ({ ...d, origin: e.target.value }))}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Destination</span>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Nungwi"
                value={createDraft.destination}
                onChange={(e) => setCreateDraft((d) => ({ ...d, destination: e.target.value }))}
                required
              />
            </label>
          </div>

          <div className={styles.tierDraftGrid}>
            {(
              [
                ["One-way", "oneWayUsd"],
                ["Wait & return", "waitReturnUsd"],
                ["Full day Private charter", "fullDayUsd"],
              ] as const
            ).map(([label, field]) => (
              <div key={field} className={styles.tierDraftBox}>
                <span className={styles.tierDraftLabel}>{label}</span>
                <div className={styles.dualInputs}>
                  <label className={styles.currencyField}>
                    <span>USD ($)</span>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      step="any"
                      className={styles.input}
                      value={createDraft[field]}
                      onChange={(e) =>
                        setCreateDraft((d) => ({ ...d, [field]: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className={styles.currencyField}>
                    <span>TSh</span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      className={styles.input}
                      value={tzsInputValue(createDraft[field])}
                      onChange={(e) => {
                        const tzs = Number(e.target.value);
                        setCreateDraft((d) => ({
                          ...d,
                          [field]: Number.isFinite(tzs) && tzs > 0 ? String(tzsToUsd(tzs)) : "",
                        }));
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={savingCreate}>
              <Save size={14} aria-hidden="true" />
              {savingCreate ? "Saving…" : "Save route price"}
            </button>
          </div>
        </form>
      ) : null}

      {/* Origin Hub Filter Pills */}
      <div className={styles.originChips} role="group" aria-label="Filter by origin hub">
        {originGroups.map((hub) => (
          <button
            key={hub}
            type="button"
            className={`${styles.originChip} ${
              selectedOrigin === hub ? styles.originChipActive : ""
            }`}
            aria-pressed={selectedOrigin === hub}
            onClick={() => setSelectedOrigin(hub)}
          >
            {hub}
          </button>
        ))}
      </div>

      {/* Responsive Route Prices List / Table */}
      {filteredPrices.length === 0 ? (
        <div className={styles.emptyBox}>
          <p>No route prices match your filter.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Trip route</th>
                <th>One-way</th>
                <th>Wait &amp; return</th>
                <th>Full day Private charter</th>
                {canManage ? <th className={styles.actionsCol}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredPrices.map((row, idx) => {
                const isEditing = canManage && editingId === row.id;
                if (isEditing) {
                  return (
                    <tr key={row.id} className={styles.editingRow}>
                      <td>{idx + 1}</td>
                      <td>
                        <div className={styles.inlineRouteEdit}>
                          <input
                            type="text"
                            className={styles.inlineInput}
                            value={editDraft.origin}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, origin: e.target.value }))
                            }
                            aria-label="Origin"
                          />
                          <span>→</span>
                          <input
                            type="text"
                            className={styles.inlineInput}
                            value={editDraft.destination}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, destination: e.target.value }))
                            }
                            aria-label="Destination"
                          />
                        </div>
                      </td>
                      {(["oneWayUsd", "waitReturnUsd", "fullDayUsd"] as const).map((field) => (
                        <td key={field}>
                          <div className={styles.inlinePriceEdit}>
                            <input
                              type="number"
                              min={1}
                              max={100000}
                              step="any"
                              className={styles.inlineNum}
                              value={editDraft[field]}
                              onChange={(e) =>
                                setEditDraft((d) => ({ ...d, [field]: e.target.value }))
                              }
                              aria-label={`${field} USD`}
                            />
                            <span className={styles.tzsPreview}>
                              {formatTzs(usdToTzs(Number(editDraft[field]) || 0))}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.btnSaveSmall}
                            onClick={() => void handleSaveEdit(row.id)}
                            disabled={savingEdit}
                          >
                            <Save size={13} aria-hidden="true" />
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.btnCancelSmall}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={row.id}>
                    <td className={styles.numCell}>{idx + 1}</td>
                    <td className={styles.routeCell}>
                      <strong>{row.origin}</strong>
                      <span className={styles.routeSep}>–</span>
                      <strong>{row.destination}</strong>
                    </td>
                    <td>
                      <div className={styles.priceCell}>
                        <strong>{formatUsd(row.one_way_usd)}</strong>
                        <span>{formatTzs(row.one_way_tzs)}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.priceCell}>
                        <strong>{formatUsd(row.wait_return_usd)}</strong>
                        <span>{formatTzs(row.wait_return_tzs)}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.priceCell}>
                        <strong>{formatUsd(row.full_day_usd)}</strong>
                        <span>{formatTzs(row.full_day_tzs)}</span>
                      </div>
                    </td>
                    {canManage ? (
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => startEdit(row)}
                            aria-label={`Edit ${row.origin} to ${row.destination}`}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtnDanger}
                            onClick={() => void handleDelete(row)}
                            disabled={deletingId === row.id}
                            aria-label={`Delete ${row.origin} to ${row.destination}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
