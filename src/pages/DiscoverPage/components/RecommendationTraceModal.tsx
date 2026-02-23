import type { RecommendationTrace } from "@/hooks/usePromotedAlbum";
import Modal from "@/components/Modal";

interface RecommendationTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: RecommendationTrace;
  albumName: string;
  artistName: string;
}

function FlowConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
      <div className="text-gray-400 dark:text-gray-500 text-xs leading-none">
        ▼
      </div>
    </div>
  );
}

function StageCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="stage-card"
      className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black p-4"
    >
      <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function PlexArtistsStage({
  artists,
}: {
  artists: RecommendationTrace["plexArtists"];
}) {
  return (
    <StageCard title="Plex Listening History">
      <div className="flex flex-wrap gap-1.5">
        {artists.map((a) => (
          <span
            key={a.name}
            data-testid={a.picked ? "picked-artist" : "artist"}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
              a.picked
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600"
            }`}
          >
            {a.name}
            <span className="text-[10px] opacity-70">({a.viewCount})</span>
          </span>
        ))}
      </div>
    </StageCard>
  );
}

function TagContributionsStage({
  artists,
}: {
  artists: RecommendationTrace["plexArtists"];
}) {
  const picked = artists.filter((a) => a.picked);

  return (
    <StageCard title="Tag Contributions">
      <div className="space-y-2">
        {picked.map((a) => (
          <div key={a.name}>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {a.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {a.tagContributions.map((tc) => (
                <span
                  key={tc.tagName}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600"
                >
                  {tc.tagName}
                  <span className="text-[10px] opacity-70">w:{tc.weight}</span>
                </span>
              ))}
              {a.tagContributions.length === 0 && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                  No tags
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </StageCard>
  );
}

function TagPoolStage({
  tags,
  chosenTagName,
}: {
  tags: RecommendationTrace["weightedTags"];
  chosenTagName: string;
}) {
  return (
    <StageCard title="Merged Tag Pool">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t.name}
            data-testid={
              t.name === chosenTagName ? "chosen-tag" : "pool-tag"
            }
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
              t.name === chosenTagName
                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border-violet-300 dark:border-violet-700 font-bold"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600"
            }`}
          >
            {t.name}
            <span className="text-[10px] opacity-70">
              w:{Math.round(t.weight)}
            </span>
          </span>
        ))}
      </div>
    </StageCard>
  );
}

function AlbumPoolStage({ pool }: { pool: RecommendationTrace["albumPool"] }) {
  return (
    <StageCard title="Album Pool">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <p className="text-gray-500 dark:text-gray-400">Page 1</p>
          <p
            data-testid="page1-count"
            className="font-bold text-gray-900 dark:text-gray-100"
          >
            {pool.page1Count} albums
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <p className="text-gray-500 dark:text-gray-400">
            Page {pool.deepPage}
          </p>
          <p
            data-testid="deep-page-count"
            className="font-bold text-gray-900 dark:text-gray-100"
          >
            {pool.deepPageCount} albums
          </p>
        </div>
        <div className="col-span-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <p className="text-gray-500 dark:text-gray-400">After dedup</p>
          <p
            data-testid="total-after-dedup"
            className="font-bold text-gray-900 dark:text-gray-100"
          >
            {pool.totalAfterDedup} unique albums
          </p>
        </div>
      </div>
    </StageCard>
  );
}

function ResultStage({
  albumName,
  artistName,
  selectionReason,
}: {
  albumName: string;
  artistName: string;
  selectionReason: RecommendationTrace["selectionReason"];
}) {
  const reasonLabel =
    selectionReason === "preferred_non_library"
      ? "New discovery"
      : "Already in library";
  const reasonColor =
    selectionReason === "preferred_non_library"
      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700";

  return (
    <StageCard title="Result">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">
            {albumName}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
            {artistName}
          </p>
        </div>
        <span
          data-testid="selection-reason"
          className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium border ${reasonColor}`}
        >
          {reasonLabel}
        </span>
      </div>
    </StageCard>
  );
}

export default function RecommendationTraceModal({
  isOpen,
  onClose,
  trace,
  albumName,
  artistName,
}: RecommendationTraceModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="md:max-w-2xl">
      <div className="overflow-y-auto max-h-[80vh] px-1 -mx-1 pb-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          How this was recommended
        </h3>

        <div className="flex flex-col">
          <PlexArtistsStage artists={trace.plexArtists} />
          <FlowConnector />
          <TagContributionsStage artists={trace.plexArtists} />
          <FlowConnector />
          <TagPoolStage
            tags={trace.weightedTags}
            chosenTagName={trace.chosenTag.name}
          />
          <FlowConnector />
          <AlbumPoolStage pool={trace.albumPool} />
          <FlowConnector />
          <ResultStage
            albumName={albumName}
            artistName={artistName}
            selectionReason={trace.selectionReason}
          />
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
