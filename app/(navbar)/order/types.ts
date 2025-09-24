export const PRINT_PRESETS = ['draft', 'standard', 'fine', 'strong'] as const;
export type PrintPreset = (typeof PRINT_PRESETS)[number];

export const OVERRIDE_KEYS = ['layerHeight', 'walls', 'infill'] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

export const MATERIAL_TYPES = ['PLA', 'PETG', 'PETG-CF20', 'TPU', 'PA6-CF'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export type FileConfig = {
  preset: PrintPreset;
  overrides: Record<OverrideKey, string>;
  materialType: MaterialType;
  materialColor: string;
};

export type PrintFileEntry = {
  localId: string;
  fileId?: string;
  file: File;
  config: FileConfig;
  createdAt: number;
};

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type UploadState = {
  progress: number;
  status: UploadStatus;
  error?: string;
};
