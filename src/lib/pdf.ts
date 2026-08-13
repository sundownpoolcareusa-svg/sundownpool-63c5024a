import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

// Wide enough to trigger the same `sm:` layout the desktop admin sees
// (e.g. DocCardHeader's logo-beside-title row), regardless of how narrow
// the phone screen actually is — html2canvas's windowWidth simulates the
// viewport used to evaluate media queries in its cloned render, it isn't
// just a crop.
const PDF_CAPTURE_WIDTH = 820;

// Shared by downloadElementAsPdf and generateElementPdfBase64 — renders the
// element to a jsPDF document, always at a fixed desktop-like width so it
// looks the same whether the owner is on a phone or a computer.
async function renderElementToPdf(el: HTMLElement): Promise<jsPDF> {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: PDF_CAPTURE_WIDTH,
  });

  const pdf = new jsPDF("p", "mm", "letter");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  // mm per source canvas pixel, and how many source pixels of height fit
  // in one page at that scale.
  const pxToMm = availableWidth / canvas.width;
  const pageHeightPx = Math.max(1, Math.floor(availableHeight / pxToMm));

  // Slice the source canvas into separate, non-overlapping per-page
  // canvases instead of redrawing the whole image shifted on each page —
  // that older approach left a sliver of overlap at every page seam,
  // duplicating whatever line of text happened to land there.
  let sourceY = 0;
  let pageIndex = 0;
  while (sourceY < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - sourceY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, availableWidth, sliceHeightPx * pxToMm);

    sourceY += sliceHeightPx;
    pageIndex++;
  }

  return pdf;
}

// Renders the element to a clean PDF (no browser print headers/footers)
// and triggers a browser download.
export async function downloadElementAsPdf(el: HTMLElement, filename: string) {
  const pdf = await renderElementToPdf(el);
  pdf.save(`${filename}.pdf`);
}

// Same rendering, but returns the raw base64 PDF bytes instead of
// downloading — used to attach the invoice as a PDF on the "email a paid
// receipt" flow, since that request is built and sent from the browser.
export async function generateElementPdfBase64(el: HTMLElement): Promise<string> {
  const pdf = await renderElementToPdf(el);
  return pdf.output("datauristring").split(",")[1] ?? "";
}
