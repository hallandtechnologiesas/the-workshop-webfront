'use client';

import type { DragEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { File as FileIcon, Settings2, UploadCloud } from 'lucide-react';

type PrintPreset = 'draft' | 'standard' | 'fine' | 'strong';
type OverrideKey = 'layerHeight' | 'walls' | 'infill';
type MaterialType = 'PLA' | 'PETG' | 'PETG-CF20' | 'TPU' | 'PA6-CF';

type FileConfig = {
  preset: PrintPreset;
  overrides: Record<OverrideKey, string>;
  materialType: MaterialType;
  materialColor: string;
};

type PrintFileEntry = {
  id: string;
  file: File;
  config: FileConfig;
  createdAt: number;
};

const PRESET_DEFAULTS: Record<PrintPreset, Record<OverrideKey, string>> = {
  draft: {
    layerHeight: '0.28',
    walls: '2',
    infill: '10',
  },
  standard: {
    layerHeight: '0.2',
    walls: '3',
    infill: '15',
  },
  fine: {
    layerHeight: '0.12',
    walls: '3',
    infill: '20',
  },
  strong: {
    layerHeight: '0.2',
    walls: '4',
    infill: '40',
  },
};

const PRESET_OPTIONS: Array<{
  value: PrintPreset;
  label: string;
  description: string;
}> = [
  {
    value: 'draft',
    label: 'Draft',
    description: 'Fastest turnaround with visible layer lines.',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Balanced quality, ideal for everyday parts.',
  },
  {
    value: 'fine',
    label: 'Fine',
    description: 'High detail prints for visual models.',
  },
  {
    value: 'strong',
    label: 'Strong',
    description: 'Reinforced walls and infill for functional parts.',
  },
];

const MATERIAL_OPTIONS: Array<{
  value: MaterialType;
  label: string;
  description: string;
}> = [
  {
    value: 'PLA',
    label: 'PLA',
    description: 'Affordable and versatile for most prints.',
  },
  {
    value: 'PETG',
    label: 'PETG',
    description: 'Durable and temperature resistant.',
  },
  {
    value: 'PETG-CF20',
    label: 'PETG-CF20',
    description: 'Carbon fibre fill for added stiffness.',
  },
  {
    value: 'TPU',
    label: 'TPU',
    description: 'Flexible for gaskets and wearable parts.',
  },
  {
    value: 'PA6-CF',
    label: 'PA6-CF',
    description: 'Nylon carbon fibre for high strength.',
  },
];

const COLOR_SWATCHES = [
  { name: 'Natural', value: '#f5f5f0' },
  { name: 'Black', value: '#111111' },
  { name: 'White', value: '#ffffff' },
  { name: 'Signal Red', value: '#dc2626' },
  { name: 'Electric Blue', value: '#0ea5e9' },
  { name: 'Sunset Orange', value: '#f97316' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Graphite', value: '#475569' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Mint', value: '#34d399' },
] as const;

const createDefaultConfig = (preset: PrintPreset = 'standard'): FileConfig => ({
  preset,
  overrides: { ...PRESET_DEFAULTS[preset] },
  materialType: 'PLA',
  materialColor: COLOR_SWATCHES[0].value,
});

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const rounded = value < 10 && exponent > 0 ? value.toFixed(1) : value.toFixed(0);
  return `${rounded} ${units[exponent]}`;
};

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const makeFileId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function Order() {
  const [files, setFiles] = useState<PrintFileEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedFile = files.find((entry) => entry.id === selectedId) ?? null;
  const hasFiles = files.length > 0;

  const updateSelectedFile = useCallback(
    (updater: (entry: PrintFileEntry) => PrintFileEntry) => {
      if (!selectedId) return;
      setFiles((prev) =>
        prev.map((entry) => (entry.id === selectedId ? updater(entry) : entry)),
      );
    },
    [selectedId],
  );

  const handleFilesAdded = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;

    const incoming = Array.from(list).map<PrintFileEntry>((file) => ({
      id: makeFileId(),
      file,
      config: createDefaultConfig('standard'),
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
  }, [setSelectedId]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFilesAdded(event.dataTransfer?.files ?? null);
    },
    [handleFilesAdded],
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

  const renderDropzone = () => (
    <div
      className={clsx(
        'relative flex min-h-[220px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted',
      )}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isDragging) setIsDragging(true);
      }}
      onDragLeave={clearDragState}
      onDrop={handleDrop}
    >
      <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Drop STL or 3MF files</p>
        <p className="text-xs text-muted-foreground">You can add multiple files at once</p>
      </div>
      <button
        type="button"
        onClick={handleBrowseClick}
        className="mt-6 rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground shadow-sm transition hover:border-primary hover:bg-primary/10"
      >
        Browse files
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf"
        multiple
        className="hidden"
        onChange={(event) => {
          handleFilesAdded(event.target.files);
          if (event.target) {
            event.target.value = '';
          }
        }}
      />
    </div>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Order</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Configure your prints</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Upload your STL or 3MF files, pick the right preset, materials, and fine tune overrides. We will send the
          configuration to Bambu Studio to auto-orient, slice, and price the job next.
        </p>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(0,_45%)_minmax(0,_55%)]">
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Files</h2>
            <p className="text-sm text-muted-foreground">
              Drag &amp; drop your print files here. We currently support STL and 3MF files.
            </p>
          </div>

          {hasFiles ? null : renderDropzone()}

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-muted-foreground">Uploaded files</h3>
              {hasFiles ? (
                <span className="text-xs font-medium text-muted-foreground">{files.length} file{files.length > 1 ? 's' : ''}</span>
              ) : null}
            </div>

            {hasFiles ? (
              <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {files.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={clsx(
                        'flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left transition',
                        selectedId === entry.id
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-card hover:border-primary/60 hover:bg-muted',
                      )}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <FileIcon className="h-5 w-5" />
                      </span>
                      <div className="flex flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{entry.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(entry.file.size)} • Preset {toTitleCase(entry.config.preset)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-muted-foreground/40 px-4 py-6 text-center text-sm text-muted-foreground">
                No files yet. Upload a 3D model to start configuring your print.
              </p>
            )}
          </div>

          {hasFiles ? renderDropzone() : null}
        </div>

        <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Adjust printing parameters for the selected file before we send it to our slicer workflow.
              </p>
            </div>
            {selectedFile ? (
              <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                {selectedFile.file.name}
              </div>
            ) : null}
          </div>

          {selectedFile ? (
            <div className="flex flex-col gap-8">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preset</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRESET_OPTIONS.map((preset) => {
                    const isActive = preset.value === selectedFile.config.preset;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handlePresetSelect(preset.value)}
                        className={clsx(
                          'flex h-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition',
                          isActive
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border hover:border-primary/60 hover:bg-muted',
                        )}
                      >
                        <span className="text-sm font-medium">{preset.label}</span>
                        <span className="text-xs text-muted-foreground">{preset.description}</span>
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>Layer {PRESET_DEFAULTS[preset.value].layerHeight}mm</span>
                          <span>Walls {PRESET_DEFAULTS[preset.value].walls}</span>
                          <span>Infill {PRESET_DEFAULTS[preset.value].infill}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Overrides</h3>
                  <p className="text-xs text-muted-foreground">Override preset values for fine control.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(['layerHeight', 'walls', 'infill'] as OverrideKey[]).map((key) => (
                    <label key={key} className="flex flex-col gap-2 text-sm font-medium">
                      <span>{toTitleCase(key === 'layerHeight' ? 'Layer height' : key)}</span>
                      <input
                        type="number"
                        step={key === 'layerHeight' ? '0.01' : '1'}
                        min={0}
                        value={selectedFile.config.overrides[key]}
                        onChange={(event) => handleOverrideChange(key, event.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Material</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MATERIAL_OPTIONS.map((option) => {
                    const isActive = option.value === selectedFile.config.materialType;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleMaterialSelect(option.value)}
                        className={clsx(
                          'flex h-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition',
                          isActive
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border hover:border-primary/60 hover:bg-muted',
                        )}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Material colour</h3>
                  <span className="text-xs text-muted-foreground">
                    {COLOR_SWATCHES.find((swatch) => swatch.value === selectedFile.config.materialColor)?.name ?? 'Custom'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {COLOR_SWATCHES.map((swatch) => {
                    const isActive = swatch.value === selectedFile.config.materialColor;
                    return (
                      <button
                        key={swatch.value}
                        type="button"
                        title={swatch.name}
                        onClick={() => handleColorSelect(swatch.value)}
                        className={clsx(
                          'flex h-11 w-11 items-center justify-center rounded-full border-2 border-transparent transition focus:outline-none focus:ring-2 focus:ring-primary/30',
                          isActive ? 'ring-2 ring-primary ring-offset-2' : 'border-border',
                        )}
                        style={{ backgroundColor: swatch.value }}
                      >
                        <span className="sr-only">{swatch.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-5 py-4 text-sm text-muted-foreground">
                We&rsquo;ll use these settings to auto-orient, generate supports, and slice your part in Bambu Studio to estimate
                time and material consumption. The pricing step will arrive once the backend is wired up.
              </section>
            </div>
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
