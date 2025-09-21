import { Buffer } from 'node:buffer';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { supabase } from '@/utils/supabase/server';
import {
  bucketName,
  ensureBucketConfigured,
  isUnsupportedMimeError,
} from '@/app/order/server/storage';

export const runtime = 'nodejs';

const buildObjectPath = (orderId: string, fileId: string, fileName: string) => {
  const extension = (() => {
    const parts = fileName.split('.');
    if (parts.length <= 1) return '';
    const ext = parts.pop();
    if (!ext) return '';
    return `.${ext.toLowerCase()}`;
  })();

  const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${orderId}/${safeId}${extension}`;
};

export async function POST(req: NextRequest) {
  await ensureBucketConfigured();

  const formData = await req.formData();

  const orderId = formData.get('orderId');
  const fileId = formData.get('fileId');
  const config = formData.get('config');
  const fileNameFromForm = formData.get('fileName');
  const mimeTypeFromForm = formData.get('mimeType');
  const file = formData.get('file');

  if (typeof orderId !== 'string' || !orderId) {
    return NextResponse.json({ error: 'Missing order ID.' }, { status: 400 });
  }

  if (typeof fileId !== 'string' || !fileId) {
    return NextResponse.json({ error: 'Missing file identifier.' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file supplied.' }, { status: 400 });
  }

  const fileName = typeof fileNameFromForm === 'string' && fileNameFromForm.length > 0 ? fileNameFromForm : file.name;
  const objectPath = buildObjectPath(orderId, fileId, fileName || 'model');

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const submittedMime = typeof mimeTypeFromForm === 'string' ? mimeTypeFromForm.trim() : '';
  const contentType = submittedMime || file.type || 'application/octet-stream';

  const { error: uploadError } = await supabase.storage.from(bucketName).upload(objectPath, fileBuffer, {
    upsert: true,
    contentType,
  });

  if (uploadError) {
    if (isUnsupportedMimeError(uploadError)) {
      const retry = await supabase.storage.from(bucketName).upload(objectPath, fileBuffer, {
        upsert: true,
        contentType: 'text/plain',
      });

      if (!retry.error) {
        return NextResponse.json({ path: objectPath });
      }

      console.error('Fallback upload failed', retry.error);
    }

    console.error('Failed to upload file to storage', uploadError);
    return NextResponse.json({ error: 'Could not upload file.' }, { status: 500 });
  }

  if (typeof config === 'string' && config.length > 0) {
    const configPath = `${orderId}/${fileId.replace(/[^a-zA-Z0-9_-]/g, '_')}/config.json`;
    const configBuffer = Buffer.from(config, 'utf-8');

    const { error: configError } = await supabase.storage.from(bucketName).upload(configPath, configBuffer, {
      upsert: true,
      contentType: 'application/json',
    });

    if (configError) {
      if (isUnsupportedMimeError(configError)) {
        const retryConfig = await supabase.storage.from(bucketName).upload(configPath, configBuffer, {
          upsert: true,
          contentType: 'text/plain',
        });

        if (retryConfig.error) {
          console.error('Failed to upload configuration after fallback', retryConfig.error);
        }
      } else {
        console.error('Failed to upload configuration', configError);
      }
    }
  }

  return NextResponse.json({ path: objectPath });
}
