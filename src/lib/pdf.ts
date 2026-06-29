export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function downloadElementAsPdf(el: HTMLElement, filename: string) {
  const mod = await import("html2pdf.js");
  const html2pdf = (mod as any).default || (mod as any);
  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `${filename}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
    })
    .from(el)
    .save();
}
