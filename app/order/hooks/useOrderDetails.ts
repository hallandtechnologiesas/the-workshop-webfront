"use client";

import { useQuery } from "@tanstack/react-query";

import type { FileConfig } from "../types";

export type PricingBreakdownItem = {
  label: string;
  amount: number;
};

export type PricingSummary = {
  currency: string;
  total: number;
  breakdown: PricingBreakdownItem[];
  turnaround: string;
};

export type OrderDetailsResponse = {
  order: {
    id: string;
    status: string;
    pricingSummary: PricingSummary | null;
    updatedAt: string | null;
  };
  files: Array<{
    id: string;
    config: FileConfig | null;
    createdAt: string | null;
    originalName?: string | null;
  }>;
};

const fetchOrderDetails = async (
  orderId: string
): Promise<OrderDetailsResponse> => {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load the order details.");
  }

  return (await response.json()) as OrderDetailsResponse;
};

export const useOrderDetails = (
  orderId: string,
  initialData?: OrderDetailsResponse
) =>
  useQuery<OrderDetailsResponse, Error>({
    queryKey: ["order-details", orderId],
    queryFn: () => fetchOrderDetails(orderId),
    enabled: Boolean(orderId),
    initialData,
  });
