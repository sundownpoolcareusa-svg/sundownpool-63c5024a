export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Uses the browser's native print-to-PDF. Temporarily swapping document.title
// makes Chrome/Edge suggest that name as the saved PDF filename.
export async function downloadElementAsPdf(_el: HTMLElement, filename: string) {
  const prevTitle = document.title;
  document.title = filename;
  try {
    window.print();
  } finally {
    setTimeout(() => { document.title = prevTitle; }, 1000);
  }
}
