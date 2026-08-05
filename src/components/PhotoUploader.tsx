import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { stampPhotoWithTimestamp } from "@/lib/photoStamp";
import { useSignedPhotoUrl } from "@/lib/signedPhotoUrl";

export function PhotoUploader({
  label,
  value,
  onChange,
  bucket = "client-photos",
  folder,
  max,
  stamp,
  variant = "grid",
}: {
  label: string;
  value: string[];
  onChange: (paths: string[]) => void;
  bucket?: string;
  folder: string; // e.g. `${userId}/pool`
  max?: number;
  stamp?: boolean; // burns the current date/time into the photo before upload
  // "grid" (default) is a small square dropzone alongside photo thumbnails.
  // "button" is a full-width "Add photos" bar, used where the empty upload
  // slot needs to read as a labeled action rather than an icon-only square.
  variant?: "grid" | "button";
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      const room = max !== undefined ? Math.max(0, max - value.length) : files.length;
      for (const rawFile of Array.from(files).slice(0, room)) {
        const file = stamp ? await stampPhotoWithTimestamp(rawFile) : rawFile;
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (error) throw error;
        uploaded.push(path);
      }
      onChange([...value, ...uploaded]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = async (idx: number) => {
    const path = value[idx];
    onChange(value.filter((_, i) => i !== idx));
    try { await supabase.storage.from(bucket).remove([path]); } catch { /* ignore */ }
  };

  const canAddMore = max === undefined || value.length < max;

  return (
    <div>
      {label && <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">{label}</label>}
      {variant === "button" ? (
        <div className={label ? "mt-2" : ""}>
          {value.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {value.map((path, idx) => (
                <PhotoThumb key={path} path={path} bucket={bucket} onRemove={() => removeAt(idx)} />
              ))}
            </div>
          )}
          {canAddMore && (
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-[var(--dash-border)] py-3 text-sm font-semibold text-[var(--dash-link)] hover:border-[var(--dash-navy)]">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple={max !== 1}
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      ) : (
        <div className={`flex flex-wrap gap-2 ${label ? "mt-2" : ""}`}>
          {value.map((path, idx) => (
            <PhotoThumb key={path} path={path} bucket={bucket} onRemove={() => removeAt(idx)} />
          ))}
          {canAddMore && (
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-[10px] border-2 border-dashed border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-[var(--dash-navy)] hover:text-[var(--dash-navy)]">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <input
                type="file"
                accept="image/*"
                multiple={max !== 1}
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export function PhotoThumb({ path, bucket = "client-photos", onRemove }: { path: string; bucket?: string; onRemove?: () => void }) {
  const url = useSignedPhotoUrl(bucket, path);
  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-[10px] border border-[var(--dash-border)] bg-[var(--dash-bg)]">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center"><Loader2 className="h-4 w-4 animate-spin text-[var(--dash-text-muted)]" /></div>}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
