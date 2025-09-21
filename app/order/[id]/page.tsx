import { supabase } from "@/utils/supabase/server";
import z from "zod";

const idSchema = z.uuid();

type AsyncParams = Promise<{
    id: string;
}>

// TODO: make status look pretty
// TODO: turn page pretty
// TODO: expand with files, price etc.

export default async function OrderPage({
  params,
}: {
  params: AsyncParams
}) {
    const {id } = await params;
  const parseResult = idSchema.safeParse(id);
  if (!parseResult.success) {
    return (
      <div className="space-y-4 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Oops! Something went wrong.
        </h1>
        <p className="text-lg">The provided order identifier is invalid.</p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id);

  if (error) {
    return (
      <div className="space-y-4 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Oops! Something went wrong.
        </h1>
        <p className="text-lg">Could not get your order details.</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="space-y-4 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Oops! Something went wrong.
        </h1>
        <p className="text-lg">We couldn&apos;t find your order.</p>
      </div>
    );
  }

  const order = data[0];

  return (
    <main className="space-y-4 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Order Details
      </h1>
      <p className="text-lg">Order ID: {order.id}</p>
      <p className="text-lg">Status: {order.status}</p>
      <p className="text-lg">Created At: {new Date(order.created_at).toLocaleString()}</p>
    </main>
  );
}
