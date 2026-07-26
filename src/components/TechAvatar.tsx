import { initials } from "@/lib/db";
import { useSignedPhotoUrl } from "@/lib/signedPhotoUrl";

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
  const url = useSignedPhotoUrl("client-photos", photoPath);

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
