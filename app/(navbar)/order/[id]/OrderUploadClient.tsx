"use client";

import type { DragEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Settings2 } from "lucide-react";
import { Upload } from "tus-js-client";
import { useRouter } from "next/navigation";

import {
  markFileUploadedAction,
  registerOrderFilesAction,
  updateOrderStatusAction,
} from "../actions";
import AdvancedOptions from "../components/AdvancedOptions";
import UploadFileList from "../components/UploadFileList";
import UploadDropzone from "../components/UploadDropzone";
import { PRESET_DEFAULTS } from "../constants";
import { createDefaultConfig, makeLocalFileId } from "../utils";
import type {
  MaterialType,
  OverrideKey,
  PrintFileEntry,
  PrintPreset,
  UploadState,
} from "../types";

type OrderUploadClientProps = {
  orderId: string;
  initialStatus: string;
};

const getStorageEndpoint = () => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl) {
    throw new Error("Missing Supabase URL for uploads.");
  }

  return `${baseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
};

export default function OrderUploadClient({
  orderId,
  initialStatus,
}: OrderUploadClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<PrintFileEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState(initialStatus);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadsRef = useRef<Record<string, Upload | null>>({});

  const selectedFile = useMemo(
    () => files.find((entry) => entry.localId === selectedId) ?? null,
    [files, selectedId]
  );

  const hasFiles = files.length > 0;

  useEffect(() => {
    setUploadStates((prev) => {
      const next: Record<string, UploadState> = {};
      files.forEach((entry) => {
        next[entry.localId] = prev[entry.localId] ?? {
          progress: 0,
          status: "idle",
        };
      });
      return next;
    });
  }, [files]);

  useEffect(() => {
    return () => {
      Object.values(uploadsRef.current).forEach((upload) => {
        try {
          upload?.abort(true);
        } catch (error) {
          console.error("Failed to abort upload", error);
        }
      });
      uploadsRef.current = {};
    };
  }, []);

  const updateSelectedFile = useCallback(
    (updater: (entry: PrintFileEntry) => PrintFileEntry) => {
      if (!selectedId) return;
      setFiles((prev) =>
        prev.map((entry) =>
          entry.localId === selectedId ? updater(entry) : entry
        )
      );
    },
    [selectedId]
  );

  const handleFilesAdded = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;

    const incoming = Array.from(list).map<PrintFileEntry>((file) => ({
      localId: makeLocalFileId(),
      fileId: undefined,
      file,
      config: createDefaultConfig(),
      createdAt: Date.now(),
    }));

    let nextSelected: string | null = null;

    setFiles((prev) => {
      const filtered = incoming.filter(
        (entry) =>
          !prev.some(
            (existing) =>
              existing.file.name === entry.file.name &&
              existing.file.size === entry.file.size
          )
      );

      if (filtered.length === 0) {
        return prev;
      }

      nextSelected = filtered[filtered.length - 1].localId;
      return [...prev, ...filtered];
    });

    if (nextSelected) {
      setSelectedId(nextSelected);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFilesAdded(event.dataTransfer?.files ?? null);
    },
    [handleFilesAdded]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isDragging) setIsDragging(true);
    },
    [isDragging]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearDragState = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleOverrideChange = useCallback(
    (key: OverrideKey, value: string) => {
      updateSelectedFile((entry) => ({
        ...entry,
        config: {
          ...entry.config,
          overrides: {
            ...entry.config.overrides,
            [key]: value,
          },
        },
      }));
    },
    [updateSelectedFile]
  );

  const handlePresetSelect = useCallback(
    (preset: PrintPreset) => {
      updateSelectedFile((entry) => ({
        ...entry,
        config: {
          ...entry.config,
          preset,
          overrides: { ...PRESET_DEFAULTS[preset] },
        },
      }));
    },
    [updateSelectedFile]
  );

  const handleMaterialSelect = useCallback(
    (material: MaterialType) => {
      updateSelectedFile((entry) => ({
        ...entry,
        config: {
          ...entry.config,
          materialType: material,
        },
      }));
    },
    [updateSelectedFile]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      updateSelectedFile((entry) => ({
        ...entry,
        config: {
          ...entry.config,
          materialColor: color,
        },
      }));
    },
    [updateSelectedFile]
  );

  const startTusUpload = useCallback(
    (entry: PrintFileEntry) =>
      new Promise<void>((resolve, reject) => {
        if (!entry.fileId) {
          reject(new Error("Missing file identifier for upload."));
          return;
        }

        const fileType = entry.file.type;
        const extensionIndex = entry.file.name.lastIndexOf(".");
        const extension =
          extensionIndex >= 0
            ? entry.file.name.substring(extensionIndex + 1).toLowerCase() ||
              "bin"
            : "bin";
        const objectName = `${orderId}/${entry.fileId}.${extension}`;

        const upload = new Upload(entry.file, {
          endpoint: getStorageEndpoint(),
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            "x-upsert": "true", // optionally set upsert to true to overwrite existing files
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
          metadata: {
            bucketName: "order-files",
            objectName: objectName,
            contentType: fileType,
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
          onError: (error) => {
            const message =
              error instanceof Error ? error.message : "Upload failed.";
            setUploadStates((prev) => ({
              ...prev,
              [entry.localId]: {
                ...(prev[entry.localId] ?? { progress: 0, status: "error" }),
                status: "error",
                error: message,
              },
            }));
            delete uploadsRef.current[entry.localId];
            reject(error instanceof Error ? error : new Error(message));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const progress = bytesTotal > 0 ? bytesUploaded / bytesTotal : 0;
            setUploadStates((prev) => ({
              ...prev,
              [entry.localId]: {
                ...(prev[entry.localId] ?? {
                  progress: 0,
                  status: "uploading",
                }),
                progress,
                status: "uploading",
                error: undefined,
              },
            }));
          },
          onSuccess: () => {
            void (async () => {
              try {
                await markFileUploadedAction({
                  orderId,
                  fileId: entry.fileId!,
                });
                setUploadStates((prev) => ({
                  ...prev,
                  [entry.localId]: {
                    ...(prev[entry.localId] ?? {
                      progress: 1,
                      status: "success",
                    }),
                    progress: 1,
                    status: "success",
                    error: undefined,
                  },
                }));
                resolve();
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to record upload.";
                setUploadStates((prev) => ({
                  ...prev,
                  [entry.localId]: {
                    ...(prev[entry.localId] ?? {
                      progress: 1,
                      status: "error",
                    }),
                    progress: 1,
                    status: "error",
                    error: message,
                  },
                }));
                reject(error instanceof Error ? error : new Error(message));
              } finally {
                delete uploadsRef.current[entry.localId];
              }
            })();
          },
        });

        uploadsRef.current[entry.localId] = upload;
        setUploadStates((prev) => ({
          ...prev,
          [entry.localId]: {
            ...(prev[entry.localId] ?? { progress: 0, status: "uploading" }),
            progress: 0,
            status: "uploading",
            error: undefined,
          },
        }));

        try {
          upload.start();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Could not start upload.";
          setUploadStates((prev) => ({
            ...prev,
            [entry.localId]: {
              ...(prev[entry.localId] ?? { progress: 0, status: "error" }),
              status: "error",
              error: message,
            },
          }));
          delete uploadsRef.current[entry.localId];
          reject(error instanceof Error ? error : new Error(message));
        }
      }),
    [orderId]
  );

  const handleStartUpload = useCallback(async () => {
    if (!hasFiles || isSubmitting) return;

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const filesNeedingId = files.filter((entry) => !entry.fileId);
      let newFileIds: { id: string }[] = [];

      if (filesNeedingId.length > 0) {
        const registration = await registerOrderFilesAction({
          orderId,
          files: filesNeedingId.map((entry) => ({
            name: entry.file.name,
            size: entry.file.size,
            config: entry.config,
            originalName: entry.file.name,
          })),
        });

        if (
          !registration?.files ||
          registration.files.length !== filesNeedingId.length
        ) {
          throw new Error("Could not register all files for upload.");
        }

        newFileIds = registration.files;
      }

      const filesWithIds = files.map((entry) => {
        if (entry.fileId) return entry;

        const nextId = newFileIds.shift();

        return {
          ...entry,
          fileId: nextId?.id ?? entry.fileId,
        };
      });

      if (filesWithIds.some((entry) => !entry.fileId)) {
        throw new Error("One or more files are missing identifiers.");
      }

      setFiles(filesWithIds);

      const pendingUploads = filesWithIds.filter((entry) => {
        const currentState = uploadStates[entry.localId];
        return entry.fileId && currentState?.status !== "success";
      });

      if (pendingUploads.length === 0) {
        setSubmissionError("All files have already been uploaded.");
        return;
      }

      setOrderStatus("uploading");

      setUploadStates((prev) => {
        const nextState = { ...prev };
        pendingUploads.forEach((entry) => {
          nextState[entry.localId] = {
            ...(prev[entry.localId] ?? { progress: 0, status: "uploading" }),
            progress: 0,
            status: "uploading",
            error: undefined,
          };
        });
        return nextState;
      });

      const results = await Promise.allSettled(
        pendingUploads.map((entry) => startTusUpload(entry))
      );

      const hasFailures = results.some(
        (result) => result.status === "rejected"
      );

      if (hasFailures) {
        setSubmissionError(
          "Some files failed to upload. Please retry the failed uploads."
        );
      } else {
        await updateOrderStatusAction({ orderId, status: "uploaded" });
        setOrderStatus("uploaded");
        router.replace(`/order/${orderId}/uploaded`);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We could not start the upload.";
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    files,
    hasFiles,
    isSubmitting,
    orderId,
    router,
    startTusUpload,
    uploadStates,
  ]);

  const dropzoneProps = {
    isDragging,
    onDragOver: handleDragOver,
    onDragLeave: clearDragState,
    onDrop: handleDrop,
    onBrowseClick: handleBrowseClick,
    fileInputRef,
    onFilesSelected: handleFilesAdded,
  } as const;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Upload</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Send us your 3D print files
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Bring your STL, OBJ, AMF, or 3MF models and we&apos;ll handle the
          heavy lifting. Start the upload, keep an eye on progress, and add
          optional print settings later via Advanced options.
        </p>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(0,_45%)_minmax(0,_55%)]">
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Files</h2>
            <p className="text-sm text-muted-foreground">
              Drag &amp; drop your print files here. We currently support STL,
              OBJ, AMF, and 3MF files up to 100&nbsp;MB each.
            </p>
          </div>

          {hasFiles ? null : <UploadDropzone {...dropzoneProps} />}

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Uploaded files
              </h3>
              {hasFiles ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {files.length} file{files.length > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>

            {hasFiles ? (
              <UploadFileList
                files={files}
                selectedId={selectedId}
                onSelect={setSelectedId}
                uploadStates={uploadStates}
              />
            ) : (
              <p className="rounded-md border border-dashed border-muted-foreground/40 px-4 py-6 text-center text-sm text-muted-foreground">
                No files yet. Upload a 3D model to begin placing your order.
              </p>
            )}
          </div>

          {hasFiles ? <UploadDropzone {...dropzoneProps} /> : null}

          <div className="flex flex-col gap-2">
            {submissionError ? (
              <p className="text-xs text-destructive">{submissionError}</p>
            ) : null}
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={!hasFiles || isSubmitting}
              className={clsx(
                "inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30",
                !hasFiles || isSubmitting
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSubmitting ? "Uploading..." : "Upload files"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              Order ID: {orderId}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Status: {orderStatus}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Configuration</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll use sensible defaults for slicing. Toggle Advanced
                options if you need to fine tune a file before handing it off to
                our printers.
              </p>
            </div>
            {selectedFile ? (
              <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                {selectedFile.file.name}
              </div>
            ) : null}
          </div>

          {selectedFile ? (
            <AdvancedOptions
              selectedFile={selectedFile}
              showAdvanced={showAdvanced}
              onToggle={() => setShowAdvanced((prev) => !prev)}
              onPresetSelect={handlePresetSelect}
              onOverrideChange={handleOverrideChange}
              onMaterialSelect={handleMaterialSelect}
              onColorSelect={handleColorSelect}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
              <Settings2 className="h-6 w-6" />
              <p>Select a file to configure its print preset and materials.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
