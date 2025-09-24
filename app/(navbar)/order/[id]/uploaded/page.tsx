import { notFound, redirect } from "next/navigation";

import { getOrderDetails } from "../../data";
import { orderIdParamSchema } from "../../schema";

import OrderProcessingStatus from "../../components/OrderProcessingStatus";
import OrderUploadSummary from "../../components/OrderUploadSummary";

type UploadedPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UploadedPage({ params }: UploadedPageProps) {
  const resolvedParams = await params;
  const parsed = orderIdParamSchema.safeParse(resolvedParams);

  if (!parsed.success) {
    notFound();
  }

  const orderDetails = await getOrderDetails(parsed.data.id);

  if (!orderDetails) {
    notFound();
  }

  if (orderDetails.order.status !== "uploaded") {
    redirect(`/order/${orderDetails.order.id}/${orderDetails.order.status}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Upload complete</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Thanks for sending your files
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          We&apos;ll review your models and follow up with production details
          shortly. If you need to make changes, reach out to our team and
          reference the order ID below.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">What happens next?</h2>
            <p className="text-sm text-muted-foreground">
              Your files are locked in for review. We&apos;re queuing them for
              processing so that our pricing engine can validate the presets and
              generate a quote. Keep this page open to watch for live updates.
            </p>
          </div>

          <OrderProcessingStatus
            orderId={orderDetails.order.id}
            initialStatus={orderDetails.order.status}
            initialData={orderDetails}
          />

          <OrderUploadSummary
            orderId={orderDetails.order.id}
            initialData={orderDetails}
          />

          <p className="text-sm text-muted-foreground">
            Need to provide additional context or new files? Contact support and
            we&apos;ll reopen the order for edits.
          </p>
        </div>
      </section>
    </main>
  );
}
