"use server";

import { z } from "zod";

import { supabase } from "@/utils/supabase/server";

import { MATERIAL_TYPES, OVERRIDE_KEYS, PRINT_PRESETS } from "./types";

const overrideShape = OVERRIDE_KEYS.reduce((shape, key) => {
  shape[key] = z.string();
  return shape;
}, {} as Record<(typeof OVERRIDE_KEYS)[number], z.ZodString>);

const configSchema = z.object({
  preset: z.enum(PRINT_PRESETS),
  overrides: z.object(overrideShape).strict(),
  materialType: z.enum(MATERIAL_TYPES),
  materialColor: z.string(),
});

const fileSchema = z.object({
  name: z.string(),
  size: z.number().nonnegative(),
  config: configSchema,
  originalName: z.string().optional(),
});

const updateOrderSchema = z.object({
  orderId: z.string().uuid(),
  status: z.string().min(1),
});

const registerOrderSchema = z.object({
  orderId: z.string().uuid(),
  files: z.array(fileSchema).min(1),
});

const markFileUploadedSchema = z.object({
  orderId: z.string().uuid(),
  fileId: z.string().uuid(),
});

type FileInput = z.infer<typeof fileSchema>;

type CreatedOrderFile = {
  id: string;
};

const persistOrderFiles = async (
  orderId: string,
  files: FileInput[]
): Promise<CreatedOrderFile[]> => {
  const created: CreatedOrderFile[] = [];

  for (const file of files) {
    const { data, error } = await supabase
      .from("files")
      .insert({
        order_id: orderId,
        config: file.config,
        original_name: file.originalName || file.name,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("Could not register order files.");
    }

    created.push({ id: data.id as string });
  }

  return created;
};

export const createOrderRecord = async () => {
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({ status: "uploading" })
    .select("id")
    .single();

  if (orderError || !orderData) {
    throw new Error("Could not create order.");
  }

  return { id: orderData.id as string };
};

export const registerOrderFilesAction = async (input: {
  orderId: string;
  files: FileInput[];
}) => {
  const validation = registerOrderSchema.safeParse(input);

  if (!validation.success) {
    throw new Error("Invalid order payload.");
  }

  const createdFiles = await persistOrderFiles(
    validation.data.orderId,
    validation.data.files
  );

  return { files: createdFiles };
};

export const updateOrderStatusAction = async (input: {
  orderId: string;
  status: string;
}) => {
  const validation = updateOrderSchema.safeParse(input);

  if (!validation.success) {
    throw new Error("Invalid status payload.");
  }

  const { orderId, status } = validation.data;
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    throw new Error("Could not update order status.");
  }
};

export const markFileUploadedAction = async (input: {
  orderId: string;
  fileId: string;
}) => {
  const validation = markFileUploadedSchema.safeParse(input);

  if (!validation.success) {
    throw new Error("Invalid upload payload.");
  }

  const { orderId, fileId } = validation.data;
  const uploadedAt = new Date().toISOString();

  const { error } = await supabase
    .from("files")
    .update({ uploaded_at: uploadedAt })
    .eq("id", fileId)
    .eq("order_id", orderId);

  if (error) {
    throw new Error("Could not record file upload.");
  }

  return { uploadedAt };
};
