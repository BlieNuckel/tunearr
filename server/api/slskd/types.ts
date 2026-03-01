// --- slskd API types ---

export type SlskdSearchRequest = {
  id: string;
  searchText: string;
};

export type SlskdSearchState = {
  id: string;
  searchText: string;
  isComplete: boolean;
  responseCount: number;
  fileCount: number;
};

export type SlskdFile = {
  filename: string;
  size: number;
  bitRate?: number;
  sampleRate?: number;
  bitDepth?: number;
  length?: number;
};

export type SlskdSearchResponse = {
  username: string;
  hasFreeUploadSlot: boolean;
  uploadSpeed: number;
  fileCount: number;
  files: SlskdFile[];
  lockedFileCount: number;
  lockedFiles: SlskdFile[];
};

export type SlskdTransferDirection = "Download" | "Upload";

export type SlskdTransfer = {
  username: string;
  direction: SlskdTransferDirection;
  filename: string;
  size: number;
  startOffset: number;
  state: string;
  bytesTransferred: number;
  averageSpeed: number;
  percentComplete: number;
  remainingTime?: string;
  id: string;
};

export type SlskdTransferGroup = {
  username: string;
  directories: {
    directory: string;
    files: SlskdTransfer[];
  }[];
};

// --- Grouped search result (our internal representation) ---

export type GroupedSearchResult = {
  guid: string;
  username: string;
  directory: string;
  files: SlskdFile[];
  totalSize: number;
  hasFreeUploadSlot: boolean;
  uploadSpeed: number;
  bitRate: number;
  category: number;
  formatTag: string;
};

// --- NZB metadata (encoded into NZB XML for transport) ---

export type NzbMetadata = {
  username: string;
  files: { filename: string; size: number }[];
};

// --- Download tracker types ---

export type TrackedDownload = {
  nzoId: string;
  title: string;
  category: string;
  username: string;
  files: { filename: string; size: number }[];
  totalSize: number;
  addedAt: number;
};

// --- SABnzbd API response types ---

export type SabnzbdQueueSlot = {
  nzo_id: string;
  filename: string;
  cat: string;
  mb: string;
  mbleft: string;
  percentage: string;
  status: string;
  timeleft: string;
};

export type SabnzbdHistorySlot = {
  nzo_id: string;
  name: string;
  category: string;
  bytes: number;
  status: string;
  completed: number;
  storage: string;
};
