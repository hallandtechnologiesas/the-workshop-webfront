import { NextRequest, NextResponse } from 'next/server';

import { createOrder, updateOrderStatus } from '@/app/order/server/orders';
import { createOrderSchema, updateOrderSchema } from '@/app/order/validation';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order payload.' }, { status: 400 });
  }

  try {
    const orderId = await createOrder(parsed.data.files);
    return NextResponse.json({ orderId });
  } catch (error) {
    console.error('Failed to create order', error);
    return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = updateOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status payload.' }, { status: 400 });
  }

  const { orderId, status } = parsed.data;

  try {
    await updateOrderStatus(orderId, status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update order status', error);
    return NextResponse.json({ error: 'Could not update order status.' }, { status: 500 });
  }
}
