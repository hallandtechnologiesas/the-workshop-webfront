import { supabase } from '@/utils/supabase/server';

import type { OrderFilePayload } from '../types';
import {
  bucketName,
  ensureBucketConfigured,
  isUnsupportedMimeError,
} from './storage';

export const createOrder = async (files: OrderFilePayload[]) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided.');
  }

  await ensureBucketConfigured();

  const { data, error } = await supabase
    .from('orders')
    .insert({ status: 'uploading' })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Could not create order.');
  }

  await persistManifest(data.id, files);

  return data.id as string;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);

  if (error) {
    throw new Error('Could not update order status.');
  }
};

const persistManifest = async (orderId: string, files: OrderFilePayload[]) => {
  const manifest = JSON.stringify({ files, createdAt: new Date().toISOString() });
  const payload = new Blob([manifest], { type: 'application/json' });
  const manifestPath = `${orderId}/manifest.json`;

  const result = await supabase.storage.from(bucketName).upload(manifestPath, payload, {
    upsert: true,
    contentType: 'application/json',
  });

  if (result.error) {
    if (isUnsupportedMimeError(result.error)) {
      const retry = await supabase.storage.from(bucketName).upload(manifestPath, payload, {
        upsert: true,
        contentType: 'text/plain',
      });

      if (retry.error) {
        console.error('Failed to persist order manifest after fallback', retry.error);
      }
    } else {
      console.error('Failed to persist order manifest', result.error);
    }
  }
};
