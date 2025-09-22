"use client";

import { useMemo } from "react";

import {
  useOrderDetails,
  type PricingSummary,
  type OrderDetailsResponse,
} from "../hooks/useOrderDetails";

type OrderProcessingStatusProps = {
  orderId: string;
  initialStatus: string;
  initialData?: OrderDetailsResponse;
};

const SAMPLE_PRICING: PricingSummary = {
  currency: "USD",
  total: 148.75,
  turnaround: "2-3 business days",
  breakdown: [
    { label: "Material & print time", amount: 112.5 },
    { label: "Post-processing", amount: 24.0 },
    { label: "Setup", amount: 12.25 },
  ],
};

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

const fallbackPricing = (value: PricingSummary | null | undefined) => {
  if (!value) {
    return { ...SAMPLE_PRICING, breakdown: [...SAMPLE_PRICING.breakdown] };
  }

  const hasBreakdown =
    Array.isArray(value.breakdown) && value.breakdown.length > 0;

  return {
    ...value,
    breakdown: hasBreakdown ? value.breakdown : [...SAMPLE_PRICING.breakdown],
  };
};

const OrderProcessingStatus = ({
  orderId,
  initialStatus,
  initialData,
}: OrderProcessingStatusProps) => {
  const { data, isLoading, isFetching, error } = useOrderDetails(
    orderId,
    initialData
  );

  const currentStatus = data?.order.status ?? initialStatus;
  const pricing = fallbackPricing(data?.order.pricingSummary);
  const updatedAt = data?.order.updatedAt
    ? new Date(data.order.updatedAt)
    : null;

  const formattedBreakdown = useMemo(
    () =>
      pricing.breakdown.map((entry) => ({
        label: entry.label,
        amount: formatCurrency(entry.amount, pricing.currency),
      })),
    [pricing.breakdown, pricing.currency]
  );

  const formattedTotal = useMemo(
    () => formatCurrency(pricing.total, pricing.currency),
    [pricing.currency, pricing.total]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Order ID
          </p>
          <p className="mt-1 font-mono text-sm">{orderId}</p>
        </div>
        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Current status
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {currentStatus}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {isLoading
              ? "Loading latest details..."
              : isFetching
              ? "Refreshing order information..."
              : "Latest data loaded"}
            {updatedAt ? ` • Updated ${updatedAt.toLocaleTimeString()}` : ""}
          </p>
          {error ? (
            <p className="mt-2 text-[11px] text-destructive">{error.message}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Price preview
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formattedTotal}
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
            {pricing.turnaround}
          </span>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {formattedBreakdown.map((entry) => (
            <li key={entry.label} className="flex items-center justify-between">
              <span>{entry.label}</span>
              <span className="font-medium text-foreground">
                {entry.amount}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          We&apos;ll replace this sample breakdown with live pricing as soon as
          it&apos;s available from our processing server.
        </p>
      </div>
    </div>
  );
};

export default OrderProcessingStatus;
