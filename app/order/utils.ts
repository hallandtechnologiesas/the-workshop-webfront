import { COLOR_SWATCHES, PRESET_DEFAULTS } from './constants';
import type { FileConfig, PrintFileEntry, PrintPreset } from './types';

export const createDefaultConfig = (preset: PrintPreset = 'standard'): FileConfig => ({
  preset,
  overrides: { ...PRESET_DEFAULTS[preset] },
  materialType: 'PLA',
  materialColor: COLOR_SWATCHES[0].value,
});

export const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const rounded = value < 10 && exponent > 0 ? value.toFixed(1) : value.toFixed(0);
  return `${rounded} ${units[exponent]}`;
};

export const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const makeLocalFileId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const sortFilesByCreatedAt = (files: PrintFileEntry[]) =>
  [...files].sort((a, b) => a.createdAt - b.createdAt);
