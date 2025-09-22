import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getOrderById } from "../data";
import { orderIdParamSchema } from "../schema";

type OrderLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function OrderLayout({
  children,
  params,
}: OrderLayoutProps) {
  const resolvedParams = await params;
  const parsed = orderIdParamSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    notFound();
  }

  const order = await getOrderById(parsed.data.id);

  if (!order) {
    notFound();
  }

  return <>{children}</>;
}
