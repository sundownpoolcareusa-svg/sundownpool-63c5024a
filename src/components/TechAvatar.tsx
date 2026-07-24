import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/db";

export function TechAvatar({
  name,
  color,
  photoPath,
  className,
  textClassName,
}: {
  name: string;
  color: string;
  photoPath?: string | null;
  className: string; // sizing, e.g. "h-10 w-10"
  textClassName?: string; // font size, e.g. "text-[13px]"
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!photoPath) return;
    let alive = true;
    supabase.storage.from("client-photos").createSignedUrl(photoPath, 60 * 60).then(({ data }) => {
      if (alive && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [photoPath]);

  if (url) {
    return <img src={url} alt={name} className={`${className} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <div
      className={`${className} grid shrink-0 place-items-center rounded-full font-bold text-white ${textClassName ?? ""}`}
      style={{ background: color }}
    >
      {initials(name)}
    </div>
  );
}
