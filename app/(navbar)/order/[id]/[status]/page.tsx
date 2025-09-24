import { notFound, redirect } from "next/navigation";

import { getOrderById } from "../../data";
import { orderIdParamSchema } from "../../schema";

type OrderStatusPageProps = {
  params: Promise<{ id: string; status: string }>;
};

export default async function OrderStatusPage({
  params,
}: OrderStatusPageProps) {
  const resolvedParams = await params;
  const parsedId = orderIdParamSchema.safeParse({ id: resolvedParams.id });

  if (!parsedId.success) {
    notFound();
  }

  const order = await getOrderById(parsedId.data.id);

  if (!order) {
    notFound();
  }

  if (order.status !== resolvedParams.status) {
    redirect(`/order/${order.id}/${order.status}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Order status</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {order.status}
        </h1>
      </header>
      <p className="text-sm text-muted-foreground">
        This order is currently in the <strong>{order.status}</strong> state. A dedicated
        page has not been created for this status yet.
      </p>
    </main>
  );
}
