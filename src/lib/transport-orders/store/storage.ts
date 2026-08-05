import { appError, type AppError } from "@/lib/assignments/errors";
import { PRIVATE_STORAGE_BUCKET } from "@/lib/transport-orders/constants";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Private Supabase Storage helpers for transport-order PDFs.
 * Uses the server-only service client; never expose the service role to the browser.
 */
export async function assertPrivateTransportOrderBucket(): Promise<true | AppError> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.storage.getBucket(PRIVATE_STORAGE_BUCKET);
    if (error || !data) {
      return appError(
        "CONFIGURATION_ERROR",
        `Private Storage bucket '${PRIVATE_STORAGE_BUCKET}' is missing or inaccessible.`,
        { bucket: PRIVATE_STORAGE_BUCKET },
      );
    }
    if (data.public) {
      return appError(
        "CONFIGURATION_ERROR",
        `Storage bucket '${PRIVATE_STORAGE_BUCKET}' must be private.`,
        { bucket: PRIVATE_STORAGE_BUCKET },
      );
    }
    return true;
  } catch (err) {
    return appError(
      "CONFIGURATION_ERROR",
      err instanceof Error ? err.message : "Storage configuration unavailable.",
    );
  }
}

export async function uploadPrivatePdf(input: {
  storageKey: string;
  bytes: Buffer;
  contentType: string;
}): Promise<true | AppError> {
  const bucketOk = await assertPrivateTransportOrderBucket();
  if (bucketOk !== true) return bucketOk;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(PRIVATE_STORAGE_BUCKET).upload(input.storageKey, input.bytes, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) {
    return appError("CONFIGURATION_ERROR", "Private Storage upload failed.", {
      reason: error.message,
    });
  }
  return true;
}

export async function downloadPrivatePdf(storageKey: string): Promise<Buffer | AppError> {
  const bucketOk = await assertPrivateTransportOrderBucket();
  if (bucketOk !== true) return bucketOk;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(PRIVATE_STORAGE_BUCKET).download(storageKey);
  if (error || !data) {
    return appError("NOT_FOUND", "Private PDF not found in Storage.");
  }
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

export async function removePrivatePdf(storageKey: string): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.storage.from(PRIVATE_STORAGE_BUCKET).remove([storageKey]);
  } catch {
    // Best-effort cleanup after failed DB registration.
  }
}

export async function createPrivatePdfSignedUrl(
  storageKey: string,
  expiresInSeconds = 300,
): Promise<{ signedUrl: string } | AppError> {
  const bucketOk = await assertPrivateTransportOrderBucket();
  if (bucketOk !== true) return bucketOk;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(PRIVATE_STORAGE_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);
  if (error || !data?.signedUrl) {
    return appError("CONFIGURATION_ERROR", "Could not create signed URL for private PDF.");
  }
  return { signedUrl: data.signedUrl };
}
