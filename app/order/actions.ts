'use server';

import { createOrder, updateOrderStatus } from './server/orders';
import type { OrderFilePayload } from './types';
import { createOrderSchema, updateOrderSchema } from './validation';

export const createOrderAction = async (input: { files: OrderFilePayload[] }) => {
  const validation = createOrderSchema.safeParse(input);

  if (!validation.success) {
    throw new Error('Invalid order payload.');
  }

  return createOrder(validation.data.files);
};

export const updateOrderStatusAction = async (input: { orderId: string; status: string }) => {
  const validation = updateOrderSchema.safeParse(input);

  if (!validation.success) {
    throw new Error('Invalid status payload.');
  }

  const { orderId, status } = validation.data;
  await updateOrderStatus(orderId, status);
};
