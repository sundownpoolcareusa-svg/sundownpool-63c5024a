export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Uses the browser's native print-to-PDF. Clones the element into a print-only
// container so the rest of the app (sidebar, nav, list) isn't included.
export async function downloadElementAsPdf(el: HTMLElement, filename: string) {
  const prevTitle = document.title;
  document.title = filename;

  const printRoot = document.createElement("div");
  printRoot.id = "print-root";
  const clone = el.cloneNode(true) as HTMLElement;
  printRoot.appendChild(clone);
  document.body.appendChild(printRoot);
  document.body.classList.add("printing");

  const cleanup = () => {
    document.body.classList.remove("printing");
    printRoot.remove();
    document.title = prevTitle;
  };

  const onAfter = () => {
    window.removeEventListener("afterprint", onAfter);
    cleanup();
  };
  window.addEventListener("afterprint", onAfter);

  try {
    // Force reflow so the print media styles fully apply before printing
    void document.body.offsetHeight;
    window.print();

  } finally {
    // Fallback in case afterprint doesn't fire
    setTimeout(() => {
      if (document.getElementById("print-root")) cleanup();
    }, 2000);
  }
}
