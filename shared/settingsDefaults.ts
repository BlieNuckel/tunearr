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

export type SpendingSettings = {
  currency: string;
  monthlyLimit: number | null;
};

export const DEFAULT_PURCHASE_DECISION: PurchaseDecisionSettings = {
  labelBlocklist: [],
  oldReleaseThresholdYears: 50,
};

export const DEFAULT_SPENDING: SpendingSettings = {
  currency: "USD",
  monthlyLimit: null,
};

/**
 * Live events (tour dates). Everything here spends or bounds JamBase quota,
 * which is why it is server-wide: per-user knobs are filters over already-swept
 * data and live on the user row instead.
 */
export type LiveEventsSettings = {
  enabled: boolean;
  apiKey: string;
  /** Default home location for users who have not set their own. Null until an admin sets one. */
  originLat: number | null;
  originLon: number | null;
  /** Upper bound on how far any user's "local" radius can reach. */
  sweepRadiusKm: number;
  /** Capped at 180 by the Developer tier's 6-month future window. */
  bannerHorizonDays: number;
  announceDays: number;
  /** The imminent window scales with distance: a trip needs more lead time. */
  imminentDaysLocal: number;
  imminentDaysRegional: number;
  /** ISO 3166-1 alpha-2 default for users who have not chosen their own. GB, not UK. */
  regions: string[];
  /** JamBase accepts at least 100 pipe-delimited artistIds per call. */
  rosterBatchSize: number;
  /** Hard stop per run. Overage bills rather than fails, so this is a cost control. */
  maxPagesPerRun: number;
  sweepIntervalHours: number;
  /** How often a non-delta pass runs to catch anything a delta sweep missed. */
  fullSweepIntervalDays: number;
  /**
   * Delta state, not a preference: the watermark a `dateModifiedFrom` sweep
   * resumes from, and when the last full pass completed. Null means the next run
   * is a full pass.
   */
  rosterWatermark: string | null;
  rosterFullSweptAt: string | null;
  /** Plan allowance. Editable because paid tiers differ (Startup is 20,000). */
  monthlyQuota: number;
  quotaWarnRatio: number;
  /** The API bills past the allowance rather than refusing, so we stop instead. */
  quotaHardStop: boolean;
  /** Billing periods start on the subscription date, not the 1st. */
  billingPeriodStartDay: number;
};

export const DEFAULT_LIVE_EVENTS: LiveEventsSettings = {
  enabled: false,
  apiKey: "",
  originLat: null,
  originLon: null,
  sweepRadiusKm: 150,
  bannerHorizonDays: 180,
  announceDays: 14,
  imminentDaysLocal: 21,
  imminentDaysRegional: 45,
  regions: [],
  rosterBatchSize: 100,
  maxPagesPerRun: 20,
  sweepIntervalHours: 24,
  fullSweepIntervalDays: 30,
  rosterWatermark: null,
  rosterFullSweptAt: null,
  monthlyQuota: 1000,
  quotaWarnRatio: 0.8,
  quotaHardStop: true,
  billingPeriodStartDay: 1,
};
