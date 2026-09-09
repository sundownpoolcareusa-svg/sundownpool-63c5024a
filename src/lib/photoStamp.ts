// Phone cameras routinely produce 3-8MB originals — fine for one photo, but
// a technician attaching 3-4 of them was slow/unreliable enough on mobile
// data that the upload batch (handleFiles only calls onChange once, after
// ALL files finish) sometimes never completed, silently leaving
// visit_photos empty and the client never getting an email at all. Capping
// the longest side keeps every photo clearly viewable on any screen while
// cutting file size dramatically.
const MAX_DIMENSION = 1600;

// Burns the current date/time into the bottom-right corner of a photo
// before it's uploaded, so a visit photo visibly proves when it was taken
// — the client sees the stamp right on the image itself, not just in text
// elsewhere in the email that could point to a different moment (e.g. the
// stop's completion time, if the photo was added later). Also downsizes
// and re-compresses the photo so multi-photo uploads stay fast and light.
export async function stampPhotoWithTimestamp(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const label = new Date().toLocaleString("en-US", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

    const fontSize = Math.max(20, Math.round(canvas.width * 0.028));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = "middle";
    const paddingX = fontSize * 0.6;
    const paddingY = fontSize * 0.45;
    const textWidth = ctx.measureText(label).width;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
    const margin = fontSize * 0.5;
    const x = canvas.width - boxWidth - margin;
    const y = canvas.height - boxHeight - margin;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + paddingX, y + boxHeight / 2);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob) return file;
    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // If stamping fails for any reason (unsupported format, etc.), upload
    // the original photo rather than blocking the technician.
    return file;
  }
}
