'use client';

import clsx from 'clsx';

import { COLOR_SWATCHES, MATERIAL_OPTIONS, PRESET_DEFAULTS, PRESET_OPTIONS } from '../constants';
import type { MaterialType, OverrideKey, PrintFileEntry, PrintPreset } from '../types';
import { toTitleCase } from '../utils';

type AdvancedOptionsProps = {
  selectedFile: PrintFileEntry;
  showAdvanced: boolean;
  onToggle: () => void;
  onPresetSelect: (preset: PrintPreset) => void;
  onOverrideChange: (key: OverrideKey, value: string) => void;
  onMaterialSelect: (material: MaterialType) => void;
  onColorSelect: (color: string) => void;
};

const AdvancedOptions = ({
  selectedFile,
  showAdvanced,
  onToggle,
  onPresetSelect,
  onOverrideChange,
  onMaterialSelect,
  onColorSelect,
}: AdvancedOptionsProps) => (
  <div className="flex flex-col gap-6">
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Selected file summary</p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        <li>Preset: {toTitleCase(selectedFile.config.preset)}</li>
        <li>Material: {selectedFile.config.materialType}</li>
        <li>
          Colour:{' '}
          {COLOR_SWATCHES.find((swatch) => swatch.value === selectedFile.config.materialColor)?.name ?? 'Custom'}
        </li>
      </ul>
    </div>

    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary hover:bg-primary/10"
    >
      <span>Advanced options</span>
      <span className="text-xs text-muted-foreground">{showAdvanced ? 'Hide' : 'Show'}</span>
    </button>

    {showAdvanced ? (
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
                  onClick={() => onPresetSelect(preset.value)}
                  className={clsx(
                    'flex h-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition',
                    isActive ? 'border-primary bg-primary/5 text-foreground' : 'border-border hover:border-primary/60 hover:bg-muted',
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
                  onChange={(event) => onOverrideChange(key, event.target.value)}
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
                  onClick={() => onMaterialSelect(option.value)}
                  className={clsx(
                    'flex h-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition',
                    isActive ? 'border-primary bg-primary/5 text-foreground' : 'border-border hover:border-primary/60 hover:bg-muted',
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
                  onClick={() => onColorSelect(swatch.value)}
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
          We&rsquo;ll use these settings to auto-orient, generate supports, and slice your part in Bambu Studio to estimate time
          and material consumption. The pricing step will arrive once the backend is wired up.
        </section>
      </div>
    ) : null}
  </div>
);

export default AdvancedOptions;
