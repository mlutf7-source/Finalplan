import { worldToScreen } from './geometry';
import type { CanvasView, ClipFrame } from './types';
export async function exportToPDF(stage: HTMLElement, clipFrame: ClipFrame | null, view: CanvasView, scale = 8) {
  if (!clipFrame) { alert('يرجى تفعيل الكليشة أولاً'); return; }
  window.dispatchEvent(new CustomEvent('pdf-export-grid', { detail: false }));
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => setTimeout(resolve, 100));
  try {
    const { jsPDF } = await import('jspdf');
    const canvases = stage.querySelectorAll('canvas');
    if (!canvases.length) { alert('تعذر العثور على عناصر الرسم'); return; }
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = stageWidth * scale;
    exportCanvas.height = stageHeight * scale;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    canvases.forEach(canvas => {
      if (canvas.width && canvas.height) {
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, exportCanvas.width, exportCanvas.height);
      }
    });
    const left = clipFrame.x - clipFrame.width / 2;
    const right = clipFrame.x + clipFrame.width / 2;
    const top = clipFrame.y - clipFrame.height / 2;
    const bottom = clipFrame.y + clipFrame.height / 2;
    const topLeft = worldToScreen(left, top, stageWidth, stageHeight, view.zoom, view.offsetX, view.offsetY);
    const bottomRight = worldToScreen(right, bottom, stageWidth, stageHeight, view.zoom, view.offsetX, view.offsetY);
    const cropX = Math.max(0, Math.min(topLeft.x, bottomRight.x));
    const cropY = Math.max(0, Math.min(topLeft.y, bottomRight.y));
    const cropRight = Math.min(stageWidth, Math.max(topLeft.x, bottomRight.x));
    const cropBottom = Math.min(stageHeight, Math.max(topLeft.y, bottomRight.y));
    const cropWidth = Math.max(1, cropRight - cropX);
    const cropHeight = Math.max(1, cropBottom - cropY);
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.round(cropWidth * scale);
    croppedCanvas.height = Math.round(cropHeight * scale);
    const cropCtx = croppedCanvas.getContext('2d');
    if (!cropCtx) return;
    cropCtx.drawImage(exportCanvas, cropX * scale, cropY * scale, cropWidth * scale, cropHeight * scale, 0, 0, croppedCanvas.width, croppedCanvas.height);
    const pdf = new jsPDF('landscape', 'mm', 'a3');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageRatio = croppedCanvas.width / croppedCanvas.height;
    const pageRatio = pageWidth / pageHeight;
    let imgWidth: number;
    let imgHeight: number;
    if (imageRatio > pageRatio) { imgWidth = pageWidth; imgHeight = pageWidth / imageRatio; }
    else { imgHeight = pageHeight; imgWidth = pageHeight * imageRatio; }
    pdf.addImage(croppedCanvas.toDataURL('image/png'), 'PNG', (pageWidth - imgWidth) / 2, (pageHeight - imgHeight) / 2, imgWidth, imgHeight);
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'المسقط_المعماري.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('حدث خطأ أثناء إنشاء ملف PDF. قد تكون مساحة الذاكرة غير كافية للدقة العالية. حاول تصغير الكليشة أو إعادة المحاولة.');
  } finally {
    window.dispatchEvent(new CustomEvent('pdf-export-grid', { detail: true }));
  }
                                  }
