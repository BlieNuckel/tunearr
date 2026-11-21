/**
 * The settings both sides of the wire need to agree on.
 *
 * The server deep-merges these under whatever is persisted, and the frontend spreads
 * them under whatever `/api/settings` returns. Two copies of that meant a new knob
 * added server-side and forgotten client-side would silently show the frontend's
 * guess in the settings form — and write that guess back as truth on the next save.
 * One definition, imported by both.
 */

export type PurchaseDecisionSettings = {
  labelBlocklist: string[];
  oldReleaseThresholdYears: number;
};

export const DEFAULT_PURCHASE_DECISION: PurchaseDecisionSettings = {
  labelBlocklist: [],
  oldReleaseThresholdYears: 50,
};

/**
 * Live events (tour dates). Everything here spends or bounds JamBase quota,
 * which is why it is server-wide: per-user knobs are filters over already-swept
 * data and live on the user row instead.
 */
/**
 * A full pass that ran out of page budget, resumed on the next run. Artist ids
 * are swept in sorted order, so `afterId` is the last id of the last finished
 * batch and `page` is the next page of the batch after it.
 */
export type RosterFullPassCursor = {
  startedAt: string;
  afterId: string | null;
  page: number;
};

export type LiveEventsSettings = {
  enabled: boolean;
  apiKey: string;
  /** Capped at 180 by the Developer tier's 6-month future window. */
  bannerHorizonDays: number;
  /** JamBase accepts at least 100 pipe-delimited artistIds per call. */
  rosterBatchSize: number;
  /** Hard stop per run. Overage bills rather than fails, so this is a cost control. */
  maxPagesPerRun: number;
  sweepIntervalHours: number;
  /**
   * Delta state, not a preference: the watermark a `dateModifiedFrom` sweep
   * resumes from, and when the last full pass completed. Null means the next run
   * is a full pass.
   */
  rosterWatermark: string | null;
  rosterFullSweptAt: string | null;
  /** Where an unfinished full pass resumes; null when none is in progress. */
  rosterFullPass: RosterFullPassCursor | null;
  /**
   * JamBase bills past the plan allowance rather than refusing, so calls stop
   * there unless this is on. Usage comes from JamBase's own `GET /quota`.
   */
  allowOverage: boolean;
};

export const DEFAULT_LIVE_EVENTS: LiveEventsSettings = {
  enabled: false,
  apiKey: "",
  bannerHorizonDays: 180,
  rosterBatchSize: 100,
  maxPagesPerRun: 20,
  sweepIntervalHours: 24,
  rosterWatermark: null,
  rosterFullSweptAt: null,
  rosterFullPass: null,
  allowOverage: false,
};
