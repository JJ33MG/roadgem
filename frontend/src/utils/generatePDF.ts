import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export async function generateTripPDF(element: HTMLElement, destination: string, startDate: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0c0c10',
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

  const datePart = sanitize(startDate.slice(0, 10));
  const destinationPart = sanitize(destination);
  pdf.save(`ROADGEM_${destinationPart}_${datePart}.pdf`);
}
