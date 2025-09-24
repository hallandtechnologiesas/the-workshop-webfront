import { notFound, redirect } from "next/navigation";

import { getOrderById } from "../data";
import { orderIdParamSchema } from "../schema";

type OrderStatusRedirectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderStatusRedirectPage({
  params,
}: OrderStatusRedirectPageProps) {
  const resolvedParams = await params;
  const parsed = orderIdParamSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    notFound();
  }

  const order = await getOrderById(parsed.data.id);

  if (!order) {
    notFound();
  }

  redirect(`/order/${order.id}/${order.status}`);
}
