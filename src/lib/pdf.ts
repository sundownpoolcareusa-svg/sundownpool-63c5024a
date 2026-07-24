import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

// Renders the element to a clean PDF (no browser print headers/footers).
export async function downloadElementAsPdf(el: HTMLElement, filename: string) {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "letter");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const scale = availableWidth / imgWidth;
  const scaledHeight = imgHeight * scale;

  let yOffset = 0;
  let pageIndex = 0;

  while (yOffset < scaledHeight) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, margin - yOffset, availableWidth, scaledHeight);
    yOffset += availableHeight;
    pageIndex++;
  }

  pdf.save(`${filename}.pdf`);
}
