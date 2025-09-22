import { redirect } from "next/navigation";

import { createOrderRecord } from "./actions";

export const dynamic = "force-dynamic";

export default async function OrderRedirectPage() {
  try {
    const order = await createOrderRecord();

    redirect(`/order/${order.id}`);
  } catch (error) {
    console.log(error);
    const message =
      error instanceof Error
        ? error.message
        : "We couldn't start a new order right now.";

    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Oops! Something went wrong.
        </h1>
        <p className="text-base text-muted-foreground">{message}</p>
      </main>
    );
  }
}
