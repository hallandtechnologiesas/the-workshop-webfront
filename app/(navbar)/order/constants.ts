import { MATERIAL_TYPES, PRINT_PRESETS } from './types';
import type { MaterialType, OverrideKey, PrintPreset } from './types';

export const PRESET_DEFAULTS: Record<PrintPreset, Record<OverrideKey, string>> = {
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

export const PRESET_OPTIONS: Array<{
  value: PrintPreset;
  label: string;
  description: string;
}> = PRINT_PRESETS.map((preset) => {
  switch (preset) {
    case 'draft':
      return {
        value: preset,
        label: 'Draft',
        description: 'Fastest turnaround with visible layer lines.',
      };
    case 'standard':
      return {
        value: preset,
        label: 'Standard',
        description: 'Balanced quality, ideal for everyday parts.',
      };
    case 'fine':
      return {
        value: preset,
        label: 'Fine',
        description: 'High detail prints for visual models.',
      };
    case 'strong':
      return {
        value: preset,
        label: 'Strong',
        description: 'Reinforced walls and infill for functional parts.',
      };
    default:
      return {
        value: preset,
        label: preset,
        description: '',
      };
  }
});

export const MATERIAL_OPTIONS: Array<{
  value: MaterialType;
  label: string;
  description: string;
}> = MATERIAL_TYPES.map((material) => {
  switch (material) {
    case 'PLA':
      return {
        value: material,
        label: 'PLA',
        description: 'Affordable and versatile for most prints.',
      };
    case 'PETG':
      return {
        value: material,
        label: 'PETG',
        description: 'Durable and temperature resistant.',
      };
    case 'PETG-CF20':
      return {
        value: material,
        label: 'PETG-CF20',
        description: 'Carbon fibre fill for added stiffness.',
      };
    case 'TPU':
      return {
        value: material,
        label: 'TPU',
        description: 'Flexible for gaskets and wearable parts.',
      };
    case 'PA6-CF':
      return {
        value: material,
        label: 'PA6-CF',
        description: 'Nylon carbon fibre for high strength.',
      };
    default:
      return {
        value: material,
        label: material,
        description: '',
      };
  }
});

export const COLOR_SWATCHES = [
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
