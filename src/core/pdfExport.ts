// pdfExport.ts
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { worldToScreen } from './geometry';
import type { CanvasView, ClipFrame } from './types';

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export async function exportToPDF(
  stage: HTMLElement,
  clipFrame: ClipFrame | null,
  view: CanvasView,
  scale = 4
) {
  if (!clipFrame) {
    alert('يرجى تفعيل الكليشة أولاً');
    return;
  }

  window.dispatchEvent(
    new CustomEvent('pdf-export-grid', { detail: false })
  );

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => resolve())
  );

  await new Promise<void>((resolve) =>
    setTimeout(resolve, 100)
  );

  try {
    const canvases = stage.querySelectorAll('canvas');

    if (!canvases.length) {
      alert('تعذر العثور على عناصر الرسم');
      return;
    }

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    /*
     * حساب حدود الكليشة على الشاشة.
     * نستخدم هذه الحدود مباشرة بدل إنشاء Canvas
     * ضخم بحجم الـ Stage كامل.
     */
    const left = clipFrame.x - clipFrame.width / 2;
    const right = clipFrame.x + clipFrame.width / 2;
    const top = clipFrame.y - clipFrame.height / 2;
    const bottom = clipFrame.y + clipFrame.height / 2;

    const topLeft = worldToScreen(
      left,
      top,
      stageWidth,
      stageHeight,
      view.zoom,
      view.offsetX,
      view.offsetY
    );

    const bottomRight = worldToScreen(
      right,
      bottom,
      stageWidth,
      stageHeight,
      view.zoom,
      view.offsetX,
      view.offsetY
    );

    const cropX = Math.max(
      0,
      Math.min(topLeft.x, bottomRight.x)
    );

    const cropY = Math.max(
      0,
      Math.min(topLeft.y, bottomRight.y)
    );

    const cropRight = Math.min(
      stageWidth,
      Math.max(topLeft.x, bottomRight.x)
    );

    const cropBottom = Math.min(
      stageHeight,
      Math.max(topLeft.y, bottomRight.y)
    );

    const cropWidth = Math.max(
      1,
      cropRight - cropX
    );

    const cropHeight = Math.max(
      1,
      cropBottom - cropY
    );

    /*
     * ننشئ فقط Canvas بحجم الكليشة.
     * لا يتم إنشاء Canvas بحجم stage × 8.
     */
    const exportWidth = Math.round(cropWidth * scale);
    const exportHeight = Math.round(cropHeight * scale);

    const exportCanvas = document.createElement('canvas');

    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      alert('تعذر تجهيز صورة المسقط للتصدير');
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      0,
      0,
      exportWidth,
      exportHeight
    );

    /*
     * رسم كل طبقات الـ Canvas مباشرة داخل منطقة القص.
     * نحافظ على نفس موضع المسقط بدون تغيير.
     */
    canvases.forEach((canvas) => {
      if (!canvas.width || !canvas.height) return;

      ctx.drawImage(
        canvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        exportWidth,
        exportHeight
      );
    });

    /*
     * PDF A3 أفقي.
     */
    const pdf = new jsPDF(
      'landscape',
      'mm',
      'a3'
    );

    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    const imageRatio =
      exportWidth / exportHeight;

    const pageRatio =
      pageWidth / pageHeight;

    let imgWidth: number;
    let imgHeight: number;

    if (imageRatio > pageRatio) {
      imgWidth = pageWidth;
      imgHeight = pageWidth / imageRatio;
    } else {
      imgHeight = pageHeight;
      imgWidth = pageHeight * imageRatio;
    }

    /*
     * JPEG أخف كثيرًا من PNG في الذاكرة،
     * مع جودة عالية مناسبة للمسقط المعماري.
     */
    const imgData =
      exportCanvas.toDataURL(
        'image/jpeg',
        0.98
      );

    pdf.addImage(
      imgData,
      'JPEG',
      (pageWidth - imgWidth) / 2,
      (pageHeight - imgHeight) / 2,
      imgWidth,
      imgHeight,
      undefined,
      'FAST'
    );

    const fileName =
      'المسقط_المعماري.pdf';

    /*
     * Android APK
     */
    if (Capacitor.isNativePlatform()) {
      const pdfBlob =
        pdf.output('blob');

      const base64Data =
        await blobToBase64(pdfBlob);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri =
        await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });

      await Share.share({
        title: 'المسقط المعماري',
        text: 'المسقط المعماري',
        url: fileUri.uri,
        dialogTitle:
          'مشاركة المسقط المعماري PDF',
      });
    } else {
      /*
       * المتصفح
       */
      pdf.save(fileName);
    }

    /*
     * تحرير الذاكرة بعد الانتهاء.
     */
    exportCanvas.width = 1;
    exportCanvas.height = 1;
  } catch (error) {
    console.error(
      'PDF export error:',
      error
    );

    alert(
      'حدث خطأ أثناء تصدير المسقط إلى PDF'
    );
  } finally {
    window.dispatchEvent(
      new CustomEvent(
        'pdf-export-grid',
        { detail: true }
      )
    );
  }
      }
