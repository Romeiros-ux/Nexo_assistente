import { supabase } from "@/integrations/supabase/client";

export type IngestSource =
  | { kind: "file"; file: File }
  | { kind: "link"; url: string };

export type ManualTaxonomyInput = {
  tags?: string;
  keywords?: string;
};

export function parseCommaList(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function sanitizePathSegment(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

export async function uploadDocumentFile(params: {
  documentId: string;
  file: File;
  bucket?: string;
}) {
  const bucket = params.bucket ?? "documents";
  const ext = params.file.name.split(".").pop() || "bin";
  const fileName = sanitizePathSegment(params.file.name);
  const storagePath = `${params.documentId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, params.file, {
      contentType: params.file.type || undefined,
      upsert: false,
    });

  if (uploadError) throw uploadError;
  return { bucket, storagePath, ext: ext.toLowerCase() };
}

export async function invokeIngest(params:
  | { kind: "file"; documentId: string }
  | { kind: "link"; documentId: string }) {
  const fnName = params.kind === "file" ? "documents-ingest" : "documents-ingest-link";
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: { documentId: params.documentId },
  });
  if (error) throw error;
  return data as any;
}
