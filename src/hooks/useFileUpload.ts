import { useState, useCallback, useRef } from "react";
import type { ManualImportItem } from "./useManualImport";

type FileStatus = "pending" | "uploading" | "done" | "error";

type TrackedFile = {
  file: File;
  status: FileStatus;
  error?: string;
};

type UploadStep =
  | "idle"
  | "uploading"
  | "scanning"
  | "reviewing"
  | "importing"
  | "done"
  | "error";

type UploadState = {
  step: UploadStep;
  files: TrackedFile[];
  uploadId: string | null;
  items: ManualImportItem[];
  error: string | null;
};

const MAX_CONCURRENT = 3;

const INITIAL_STATE: UploadState = {
  step: "idle",
  files: [],
  uploadId: null,
  items: [],
  error: null,
};

async function uploadSingleFile(
  file: File,
  albumMbid: string,
  uploadId: string
): Promise<void> {
  const formData = new FormData();
  formData.append("albumMbid", albumMbid);
  formData.append("uploadId", uploadId);
  formData.append("file", file);

  const res = await fetch("/api/lidarr/import/upload-file", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `Upload failed for ${file.name}`;
    try {
      msg = JSON.parse(text).error || msg;
    } catch {
      // use default message
    }
    throw new Error(msg);
  }
}

async function scanFiles(
  uploadId: string,
  albumMbid: string
): Promise<{ artistId: number; albumId: number; items: ManualImportItem[] }> {
  const res = await fetch("/api/lidarr/import/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, albumMbid }),
  });

  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(data.error || "Scan failed");
  return data;
}

async function confirmImport(items: ManualImportItem[]): Promise<void> {
  const res = await fetch("/api/lidarr/import/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = "Import failed";
    try {
      msg = JSON.parse(text).error || msg;
    } catch {
      // use default message
    }
    throw new Error(msg);
  }
}

export default function useFileUpload() {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const uploadIdRef = useRef<string | null>(null);
  const filesRef = useRef<TrackedFile[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    setState((s) => {
      const updated = [
        ...s.files,
        ...newFiles.map((file) => ({ file, status: "pending" as const })),
      ];
      filesRef.current = updated;
      return { ...s, files: updated };
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setState((s) => {
      const updated = s.files.filter((_, i) => i !== index);
      filesRef.current = updated;
      return { ...s, files: updated };
    });
  }, []);

  const startUpload = useCallback(async (albumMbid: string) => {
    setState((s) => ({ ...s, step: "uploading", error: null }));

    const files = filesRef.current;
    if (!files.length) {
      setState((s) => ({ ...s, step: "error", error: "No files selected" }));
      return;
    }

    const updateFileStatus = (
      index: number,
      status: FileStatus,
      error?: string
    ) => {
      setState((s) => ({
        ...s,
        files: s.files.map((f, i) =>
          i === index ? { ...f, status, error } : f
        ),
      }));
    };

    const currentUploadId = uploadIdRef.current || crypto.randomUUID();
    uploadIdRef.current = currentUploadId;
    setState((s) => ({ ...s, uploadId: currentUploadId }));

    const queue = files.map((_, i) => i);
    let hasError = false;

    const processNext = async (): Promise<void> => {
      while (queue.length > 0 && !hasError) {
        const idx = queue.shift()!;
        updateFileStatus(idx, "uploading");
        try {
          await uploadSingleFile(files[idx].file, albumMbid, currentUploadId);
          updateFileStatus(idx, "done");
        } catch (err) {
          hasError = true;
          const msg = err instanceof Error ? err.message : "Upload failed";
          updateFileStatus(idx, "error", msg);
          setState((s) => ({ ...s, step: "error", error: msg }));
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT, files.length) },
      () => processNext()
    );
    await Promise.all(workers);

    if (hasError) return;

    setState((s) => ({ ...s, step: "scanning" }));

    try {
      const scanResult = await scanFiles(currentUploadId!, albumMbid);
      setState((s) => ({
        ...s,
        step: "reviewing",
        items: scanResult.items,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: "error",
        error: err instanceof Error ? err.message : "Scan failed",
      }));
    }
  }, []);

  const confirm = useCallback(async (items: ManualImportItem[]) => {
    setState((s) => ({ ...s, step: "importing", error: null }));
    try {
      await confirmImport(items);
      setState((s) => ({ ...s, step: "done" }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: "error",
        error: err instanceof Error ? err.message : "Import failed",
      }));
    }
  }, []);

  const cancel = useCallback(async () => {
    const uploadId = uploadIdRef.current;
    if (uploadId) {
      await fetch(`/api/lidarr/import/${uploadId}`, { method: "DELETE" }).catch(
        () => {}
      );
    }
    uploadIdRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const reset = useCallback(() => {
    uploadIdRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    addFiles,
    removeFile,
    startUpload,
    confirm,
    cancel,
    reset,
  };
}
