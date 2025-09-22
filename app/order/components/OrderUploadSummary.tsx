"use client";

import type { PrintPreset } from "../types";
import {
  useOrderDetails,
  type OrderDetailsResponse,
} from "../hooks/useOrderDetails";

const formatPreset = (preset: PrintPreset | string | undefined | null) => {
  if (!preset) return "Unknown";
  const safePreset = `${preset}`;
  return `${safePreset.charAt(0).toUpperCase()}${safePreset.slice(1)}`;
};

const formatMaterial = (input: string | undefined | null) => {
  if (!input) return "Not specified";
  return input;
};

const formatTimestamp = (input: string | null | undefined) => {
  if (!input) return "Unknown";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const getColorPreview = (color: string | undefined | null) => {
  if (!color) return null;

  // Simple color mapping for common material colors
  const colorMap: Record<string, string> = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#a855f7",
    pink: "#ec4899",
    black: "#000000",
    white: "#ffffff",
    gray: "#6b7280",
    grey: "#6b7280",
    silver: "#c0c0c0",
    gold: "#ffd700",
    brown: "#a3501a",
    transparent: "rgba(255,255,255,0.3)",
    clear: "rgba(255,255,255,0.3)",
  };

  const lowerColor = color.toLowerCase();
  return colorMap[lowerColor] || color;
};

type OrderUploadSummaryProps = {
  orderId: string;
  initialData?: OrderDetailsResponse;
};

const OrderUploadSummary = ({
  orderId,
  initialData,
}: OrderUploadSummaryProps) => {
  const { data, isLoading, error } = useOrderDetails(orderId, initialData);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
        Loading uploaded files…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  const files = data?.files ?? [];

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
        No uploaded files were found for this order yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Uploaded files</h3>
      <ul className="space-y-2">
        {files.map((file) => {
          const config = file.config;
          const overrides = config?.overrides ?? null;

          return (
            <li
              key={file.id}
              className="rounded-lg border border-muted-foreground/40 bg-muted/40 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  {file.originalName && (
                    <p className="text-sm font-medium text-foreground mb-1">
                      {file.originalName}
                    </p>
                  )}
                  <p className="font-mono text-xs text-muted-foreground">
                    File ID: {file.id}
                  </p>
                  <p className="text-sm text-foreground">
                    Preset: {formatPreset(config?.preset)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Material: {formatMaterial(config?.materialType)}
                    </span>
                    {config?.materialColor && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full border border-border shadow-sm"
                            style={{
                              backgroundColor:
                                getColorPreview(config.materialColor) ||
                                "#6b7280",
                              border:
                                config.materialColor?.toLowerCase() === "white"
                                  ? "1px solid #e5e7eb"
                                  : undefined,
                            }}
                            title={`Color: ${config.materialColor}`}
                          />
                          <span>{config.materialColor}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Uploaded: {formatTimestamp(file.createdAt)}
                </div>
              </div>

              {overrides ? (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  {Object.entries(overrides).map(([key, value]) => (
                    <div key={key} className="rounded bg-card px-2 py-1">
                      <dt className="uppercase tracking-wide">{key}</dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {value || "Default"}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default OrderUploadSummary;
