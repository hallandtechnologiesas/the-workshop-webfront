import { supabase } from '@/utils/supabase/server';

export const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? 'order-files';

type StorageErrorWithStatus = {
  statusCode?: string | number;
};

const isStatusMatch = (error: unknown, codes: Array<string | number>) => {
  if (!error || typeof error !== 'object') return false;
  const status = (error as StorageErrorWithStatus).statusCode;
  return codes.includes(status ?? '');
};

const isBucketNotFound = (error: unknown) => isStatusMatch(error, [404, '404']);

export const isUnsupportedMimeError = (error: unknown) => isStatusMatch(error, [400, 415, '400', '415']);

const ensureBucket = async () => {
  const { data, error } = await supabase.storage.getBucket(bucketName);

  if (error) {
    if (isBucketNotFound(error)) {
      const createResult = await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: null,
      });

      if (createResult.error) {
        throw createResult.error;
      }
      return;
    }

    throw error;
  }

  const bucketMeta = (data ?? {}) as {
    allowed_mime_types?: string[] | null;
    allowedMimeTypes?: string[] | null;
    public?: boolean;
  };

  const currentAllowed = bucketMeta.allowed_mime_types ?? bucketMeta.allowedMimeTypes ?? null;

  if (currentAllowed === null) {
    return;
  }

  const updateResult = await supabase.storage.updateBucket(bucketName, {
    public: bucketMeta.public ?? false,
    allowedMimeTypes: null,
  });

  if (updateResult.error) {
    throw updateResult.error;
  }
};

let ensurePromise: Promise<void> | null = null;

export const ensureBucketConfigured = async () => {
  if (!ensurePromise) {
    ensurePromise = ensureBucket().catch((error) => {
      console.error('Failed to ensure storage bucket configuration', error);
      throw error;
    });
  }

  try {
    await ensurePromise;
  } catch {
    ensurePromise = null;
  }
};
