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
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export async function exportToPDF(
  stage: HTMLElement,
  clipFrame: ClipFrame | null,
  view: CanvasView,
  scale = 8
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

  await new Promise<void>((resolve) => setTimeout(resolve, 100));

  try {
    const canvases = stage.querySelectorAll('canvas');

    if (!canvases.length) {
      alert('تعذر العثور على عناصر الرسم');
      return;
    }

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    const exportCanvas = document.createElement('canvas');

    exportCanvas.width = stageWidth * scale;
    exportCanvas.height = stageHeight * scale;

    const ctx = exportCanvas.getContext('2d');

    if (!ctx) return;

    canvases.forEach((canvas) => {
      if (canvas.width && canvas.height) {
        ctx.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
          0,
          exportCanvas.width,
          exportCanvas.height
        );
      }
    });

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

    const croppedCanvas = document.createElement('canvas');

    croppedCanvas.width = Math.round(cropWidth * scale);
    croppedCanvas.height = Math.round(cropHeight * scale);

    const cropCtx = croppedCanvas.getContext('2d');

    if (!cropCtx) return;

    cropCtx.drawImage(
      exportCanvas,
      cropX * scale,
      cropY * scale,
      cropWidth * scale,
      cropHeight * scale,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );

    const pdf = new jsPDF(
      'landscape',
      'mm',
      'a3'
    );

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imageRatio =
      croppedCanvas.width / croppedCanvas.height;

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

    pdf.addImage(
      croppedCanvas.toDataURL('image/png'),
      'PNG',
      (pageWidth - imgWidth) / 2,
      (pageHeight - imgHeight) / 2,
      imgWidth,
      imgHeight
    );

    const fileName = 'المسقط_المعماري.pdf';

    /*
     * في APK Android:
     * لا نستخدم pdf.save() لأن WebView لا يتعامل
     * مع تنزيل الملفات مثل المتصفح.
     *
     * بدلاً من ذلك:
     * PDF → Blob → Base64 → Filesystem → Share
     */
    if (Capacitor.isNativePlatform()) {
      const pdfBlob = pdf.output('blob');

      const base64Data = await blobToBase64(pdfBlob);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'المسقط المعماري',
        text: 'المسقط المعماري',
        url: fileUri.uri,
        dialogTitle: 'مشاركة المسقط المعماري PDF',
      });
    } else {
      /*
       * في المتصفح:
       * يبقى التنزيل بالطريقة الأصلية.
       */
      pdf.save(fileName);
    }
  } catch (error) {
    console.error('PDF export error:', error);

    alert('حدث خطأ أثناء تصدير المسقط إلى PDF');
  } finally {
    window.dispatchEvent(
      new CustomEvent('pdf-export-grid', { detail: true })
    );
  }
      }
