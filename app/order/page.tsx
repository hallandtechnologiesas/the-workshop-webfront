'use client';

import type { DragEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { createOrderAction, updateOrderStatusAction } from './actions';
import AdvancedOptions from './components/AdvancedOptions';
import UploadFileList from './components/UploadFileList';
import UploadDropzone from './components/UploadDropzone';
import { PRESET_DEFAULTS } from './constants';
import { createDefaultConfig, makeFileId } from './utils';
import type { MaterialType, OverrideKey, PrintFileEntry, PrintPreset, UploadState } from './types';

export default function Order() {
  const [files, setFiles] = useState<PrintFileEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const selectedFile = files.find((entry) => entry.id === selectedId) ?? null;
  const hasFiles = files.length > 0;

  const updateSelectedFile = useCallback(
    (updater: (entry: PrintFileEntry) => PrintFileEntry) => {
      if (!selectedId) return;
      setFiles((prev) => prev.map((entry) => (entry.id === selectedId ? updater(entry) : entry)));
    },
    [selectedId],
  );

  const ensureUploadState = useCallback((fileId: string) => {
    setUploadStates((prev) => {
      if (prev[fileId]) return prev;
      return {
        ...prev,
        [fileId]: { progress: 0, status: 'idle' },
      };
    });
  }, []);

  const updateUploadState = useCallback((fileId: string, partial: Partial<UploadState>) => {
    setUploadStates((prev) => {
      const existing = prev[fileId] ?? { progress: 0, status: 'idle' };
      return {
        ...prev,
        [fileId]: {
          ...existing,
          ...partial,
        },
      };
    });
  }, []);

  useEffect(() => {
    setUploadStates((prev) => {
      const next: Record<string, UploadState> = {};
      files.forEach((entry) => {
        next[entry.id] = prev[entry.id] ?? { progress: 0, status: 'idle' };
      });
      return next;
    });
  }, [files]);

  const handleFilesAdded = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;

    const incoming = Array.from(list).map<PrintFileEntry>((file) => ({
      id: makeFileId(),
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

      nextSelected = filtered[filtered.length - 1].id;
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

  const uploadSingleFile = useCallback(
    (orderId: string, entry: PrintFileEntry) =>
      new Promise<void>((resolve, reject) => {
        ensureUploadState(entry.id);
        updateUploadState(entry.id, { status: 'uploading', error: undefined });

        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('fileId', entry.id);
        formData.append('fileName', entry.file.name);
        formData.append('mimeType', entry.file.type ?? '');
        formData.append('config', JSON.stringify(entry.config));
        formData.append('file', entry.file);

        const request = new XMLHttpRequest();
        request.open('POST', '/api/upload');

        request.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const ratio = event.total ? event.loaded / event.total : 0;
          updateUploadState(entry.id, {
            progress: Math.min(Math.max(ratio, 0), 1),
            status: 'uploading',
          });
        };

        request.onerror = () => {
          const message = 'Network error while uploading the file.';
          updateUploadState(entry.id, { status: 'error', error: message });
          reject(new Error(message));
        };

        request.onload = () => {
          if (request.status >= 200 && request.status < 300) {
            updateUploadState(entry.id, { progress: 1, status: 'success' });
            resolve();
            return;
          }

          const message = (() => {
            try {
              const parsed = JSON.parse(request.responseText);
              return parsed?.error ?? 'Upload failed.';
            } catch {
              return request.responseText || 'Upload failed.';
            }
          })();

          updateUploadState(entry.id, { status: 'error', error: message });
          reject(new Error(message));
        };

        request.send(formData);
      }),
    [ensureUploadState, updateUploadState],
  );

  const handleStartUpload = useCallback(async () => {
    if (!hasFiles || isSubmitting) return;

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const orderId = await createOrderAction({
        files: files.map((entry) => ({
          id: entry.id,
          name: entry.file.name,
          size: entry.file.size,
          config: entry.config,
        })),
      });

      if (!orderId) {
        throw new Error('Order ID missing from response.');
      }

      setCreatedOrderId(orderId);

      for (const entry of files) {
        await uploadSingleFile(orderId, entry);
      }

      try {
        await updateOrderStatusAction({ orderId, status: 'uploaded' });
      } catch (statusError) {
        console.warn('Failed to update order status to uploaded', statusError);
      }

      router.push(`/order/${orderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not start the upload.';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [files, hasFiles, isSubmitting, router, uploadSingleFile]);

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
          Bring your STL, OBJ, AMF, or 3MF models and we&rsquo;ll handle the heavy lifting. Start the upload, keep an eye on
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
              {isSubmitting ? 'Uploading...' : 'Create order & upload files'}
            </button>
            {createdOrderId ? <p className="text-[11px] text-muted-foreground">Order ID: {createdOrderId}</p> : null}
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Configuration</h2>
              <p className="text-sm text-muted-foreground">
                We&rsquo;ll use sensible defaults for slicing. Toggle Advanced options if you need to fine tune a file before
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
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-10 text-center">
              <div className="flex max-w-sm flex-col items-center gap-4 text-muted-foreground">
                <Settings2 className="h-10 w-10" />
                <p className="text-sm">
                  Select a file from the left to configure its print settings. Upload multiple files to prepare a full build
                  sheet before submitting your order.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
