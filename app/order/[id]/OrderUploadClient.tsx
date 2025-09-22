'use client';

import type { DragEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import clsx from 'clsx';
import { Settings2 } from 'lucide-react';

import { markFileUploadedAction, registerOrderFilesAction, updateOrderStatusAction } from '../actions';
import AdvancedOptions from '../components/AdvancedOptions';
import UploadFileList from '../components/UploadFileList';
import UploadDropzone from '../components/UploadDropzone';
import { PRESET_DEFAULTS } from '../constants';
import { createDefaultConfig, makeLocalFileId } from '../utils';
import type {
  MaterialType,
  OverrideKey,
  PrintFileEntry,
  PrintPreset,
  UploadState,
} from '../types';

type OrderUploadClientProps = {
  orderId: string;
  initialStatus: string;
};

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

const getStorageEndpoint = () => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl) {
    throw new Error('Missing Supabase URL for uploads.');
  }

  return `${baseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`;
};

export default function OrderUploadClient({ orderId, initialStatus }: OrderUploadClientProps) {
  const [files, setFiles] = useState<PrintFileEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState(initialStatus);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uppyRef = useRef<Uppy | null>(null);

  const selectedFile = useMemo(
    () => files.find((entry) => entry.localId === selectedId) ?? null,
    [files, selectedId],
  );

  const hasFiles = files.length > 0;

  useEffect(() => {
    const endpoint = getStorageEndpoint();
    const uppy = new Uppy({ autoProceed: false, allowMultipleUploads: true });

    uppy.use(Tus, {
      endpoint,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      uploadDataDuringCreation: true,
      headers: (file) => ({
        'x-upsert': 'true',
        bucketName: 'order-files',
        objectName: file.meta.objectName as string,
      }),
    });

    uppy.on('upload-progress', (file, progress) => {
      const ratio = progress.bytesTotal ? progress.bytesUploaded / progress.bytesTotal : 0;

      setUploadStates((prev) => ({
        ...prev,
        [file.id]: {
          ...(prev[file.id] ?? { progress: 0, status: 'idle' }),
          progress: Math.min(Math.max(ratio, 0), 1),
          status: 'uploading',
        },
      }));
    });

    uppy.on('upload-success', (file) => {
      const fileId = file.meta.fileId as string | undefined;

      if (fileId) {
        markFileUploadedAction({ orderId, fileId }).catch((error) => {
          console.error('Failed to mark file as uploaded', error);
          setUploadStates((prev) => ({
            ...prev,
            [file.id]: {
              ...(prev[file.id] ?? { progress: 0, status: 'idle' }),
              status: 'error',
              error: 'Upload completed but could not be recorded.',
            },
          }));
        });
      }

      setUploadStates((prev) => ({
        ...prev,
        [file.id]: {
          ...(prev[file.id] ?? { progress: 0, status: 'idle' }),
          progress: 1,
          status: 'success',
          error: undefined,
        },
      }));
    });

    uppy.on('upload-error', (file, error) => {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setUploadStates((prev) => ({
        ...prev,
        [file.id]: {
          ...(prev[file.id] ?? { progress: 0, status: 'idle' }),
          status: 'error',
          error: message,
        },
      }));
    });

    uppyRef.current = uppy;

    return () => {
      uppy.close({ reason: 'unmount' });
      uppyRef.current = null;
    };
  }, [orderId]);

  useEffect(() => {
    setUploadStates((prev) => {
      const next: Record<string, UploadState> = {};
      files.forEach((entry) => {
        next[entry.localId] = prev[entry.localId] ?? { progress: 0, status: 'idle' };
      });
      return next;
    });
  }, [files]);

  const ensureUploadState = useCallback((fileId: string) => {
    setUploadStates((prev) => {
      if (prev[fileId]) return prev;
      return {
        ...prev,
        [fileId]: { progress: 0, status: 'idle' },
      };
    });
  }, []);

  const updateSelectedFile = useCallback(
    (updater: (entry: PrintFileEntry) => PrintFileEntry) => {
      if (!selectedId) return;
      setFiles((prev) => prev.map((entry) => (entry.localId === selectedId ? updater(entry) : entry)));
    },
    [selectedId],
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
        (entry) => !prev.some((existing) => existing.file.name === entry.file.name && existing.file.size === entry.file.size),
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
    [handleFilesAdded],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isDragging) setIsDragging(true);
    },
    [isDragging],
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
    [updateSelectedFile],
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
    [updateSelectedFile],
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
    [updateSelectedFile],
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
    [updateSelectedFile],
  );

  const handleStartUpload = useCallback(async () => {
    if (!hasFiles || isSubmitting) return;

    const uppy = uppyRef.current;

    if (!uppy) {
      setSubmissionError('Upload system is not ready yet.');
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);
    setOrderStatus('uploading');

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
          })),
        });

        if (!registration?.files || registration.files.length !== filesNeedingId.length) {
          throw new Error('Could not register all files for upload.');
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
        throw new Error('One or more files are missing identifiers.');
      }

      setFiles(filesWithIds);

      uppy.cancelAll();
      uppy.reset();

      filesWithIds.forEach((entry) => {
        if (!entry.fileId) return;
        ensureUploadState(entry.localId);

        uppy.addFile({
          id: entry.localId,
          name: entry.file.name,
          type: entry.file.type || DEFAULT_CONTENT_TYPE,
          data: entry.file,
          meta: {
            fileId: entry.fileId,
            orderId,
            objectName: `${orderId}/${entry.fileId}`,
            contentType: entry.file.type || DEFAULT_CONTENT_TYPE,
          },
        });

        setUploadStates((prev) => ({
          ...prev,
          [entry.localId]: {
            ...(prev[entry.localId] ?? { progress: 0, status: 'idle' }),
            progress: 0,
            status: 'uploading',
            error: undefined,
          },
        }));
      });

      const result = await uppy.upload();

      if (result.failed.length > 0) {
        const firstError = result.failed[0]?.error;
        throw firstError instanceof Error
          ? firstError
          : new Error('Some files could not be uploaded.');
      }

      await updateOrderStatusAction({ orderId, status: 'uploaded' });
      setOrderStatus('uploaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not start the upload.';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [ensureUploadState, files, hasFiles, isSubmitting, orderId]);

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
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Send us your 3D print files</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Bring your STL, OBJ, AMF, or 3MF models and we&apos;ll handle the heavy lifting. Start the upload, keep an eye on
          progress, and add optional print settings later via Advanced options.
        </p>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(0,_45%)_minmax(0,_55%)]">
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Files</h2>
            <p className="text-sm text-muted-foreground">
              Drag &amp; drop your print files here. We currently support STL, OBJ, AMF, and 3MF files up to 100&nbsp;MB each.
            </p>
          </div>

          {hasFiles ? null : <UploadDropzone {...dropzoneProps} />}

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-muted-foreground">Uploaded files</h3>
              {hasFiles ? (
                <span className="text-xs font-medium text-muted-foreground">{files.length} file{files.length > 1 ? 's' : ''}</span>
              ) : null}
            </div>

            {hasFiles ? (
              <UploadFileList files={files} selectedId={selectedId} onSelect={setSelectedId} uploadStates={uploadStates} />
            ) : (
              <p className="rounded-md border border-dashed border-muted-foreground/40 px-4 py-6 text-center text-sm text-muted-foreground">
                No files yet. Upload a 3D model to begin placing your order.
              </p>
            )}
          </div>

          {hasFiles ? <UploadDropzone {...dropzoneProps} /> : null}

          <div className="flex flex-col gap-2">
            {submissionError ? <p className="text-xs text-destructive">{submissionError}</p> : null}
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={!hasFiles || isSubmitting}
              className={clsx(
                'inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30',
                !hasFiles || isSubmitting
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {isSubmitting ? 'Uploading...' : 'Upload files'}
            </button>
            <p className="text-[11px] text-muted-foreground">Order ID: {orderId}</p>
            <p className="text-[11px] text-muted-foreground">Status: {orderStatus}</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Configuration</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll use sensible defaults for slicing. Toggle Advanced options if you need to fine tune a file before
                handing it off to our printers.
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
