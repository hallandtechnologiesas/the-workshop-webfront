import { notFound, redirect } from "next/navigation";

import { getOrderById } from "../../data";
import { orderIdParamSchema } from "../../schema";

import OrderUploadClient from "../OrderUploadClient";

type UploadingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UploadingPage({ params }: UploadingPageProps) {
  const resolvedParams = await params;
  const parsed = orderIdParamSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    notFound();
  }

  const order = await getOrderById(parsed.data.id);

  if (!order) {
    notFound();
  }

  if (order.status !== "uploading") {
    redirect(`/order/${order.id}/${order.status}`);
  }

  return <OrderUploadClient orderId={order.id} initialStatus={order.status} />;
}
