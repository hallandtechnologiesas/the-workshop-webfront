import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { supabase } from "@/utils/supabase/server";

import OrderUploadClient from "./OrderUploadClient";

const idSchema = z.object({ id: z.string().uuid() });

const getOrder = cache(async (id: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
});

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = await params;
  const parsed = idSchema.safeParse(resolved);

  if (!parsed.success) {
    notFound();
  }

  const order = await getOrder(parsed.data.id);

  if (!order) {
    notFound();
  }

  return <OrderUploadClient orderId={order.id} initialStatus={order.status ?? "uploading"} />;
}
