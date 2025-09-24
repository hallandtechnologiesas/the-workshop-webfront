import { cache } from "react";

import { supabase } from "@/utils/supabase/server";
import { FileConfig } from "./types";
import type { OrderDetailsResponse } from "./hooks/useOrderDetails";

export type OrderRecord = {
  id: string;
  status: string;
};

export const getOrderById = cache(
  async (id: string): Promise<OrderRecord | null> => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id as string,
      status: (data.status as string | null) ?? "uploading",
    };
  }
);

export const getFilesByOrderId = cache(
  async (
    orderId: string
  ): Promise<
    { id: string; config: FileConfig | null; originalName?: string | null }[]
  > => {
    const { data, error } = await supabase
      .from("files")
      .select("id, config, original_name")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return (data ?? []).map((file) => ({
      id: file.id as string,
      config: (file.config ?? null) as FileConfig | null,
      originalName: (file.original_name as string | null) ?? null,
    }));
  }
);

export const getOrderDetails = cache(
  async (orderId: string): Promise<OrderDetailsResponse | null> => {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, status, updated_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !orderData) {
      return null;
    }

    const { data: filesData, error: filesError } = await supabase
      .from("files")
      .select("id, config, created_at, original_name")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (filesError) {
      return null;
    }

    return {
      order: {
        id: orderData.id as string,
        status: ((orderData.status as string | null) ?? "uploading") as string,
        pricingSummary: null, // This would need to be fetched from another table if available
        updatedAt: (orderData.updated_at as string | null) ?? null,
      },
      files: (filesData ?? []).map((file) => ({
        id: file.id as string,
        config: (file.config ?? null) as FileConfig | null,
        createdAt: (file.created_at as string | null) ?? null,
        originalName: (file.original_name as string | null) ?? null,
      })),
    };
  }
);
