import { NextResponse } from "next/server";

import { orderIdParamSchema } from "@/app/order/schema";
import type { FileConfig } from "@/app/order/types";
import { supabase } from "@/utils/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const parsed = orderIdParamSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order identifier." },
      { status: 400 }
    );
  }

  const orderId = parsed.data.id;

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, status, updated_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json(
      { error: "Failed to load order data." },
      { status: 500 }
    );
  }

  if (!orderData) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: filesData, error: filesError } = await supabase
    .from("files")
    .select("id, config, created_at, original_name")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (filesError) {
    return NextResponse.json(
      { error: "Failed to load order files." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    order: {
      id: orderData.id as string,
      status: ((orderData.status as string | null) ?? "uploading") as string,
      updatedAt: (orderData.updated_at as string | null) ?? null,
    },
    files: (filesData ?? []).map((file) => ({
      id: file.id as string,
      config: (file.config ?? null) as FileConfig | null,
      createdAt: (file.created_at as string | null) ?? null,
      originalName: (file.original_name as string | null) ?? null,
    })),
  });
}
