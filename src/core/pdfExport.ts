import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { worldToScreen } from './geometry';
import type { CanvasView, ClipFrame } from './types';

export async function exportToPDF(stage: HTMLElement, clipFrame: ClipFrame | null, view: CanvasView, scale = 4) {
  if (!clipFrame) { alert('يرجى تفعيل الكليشة أولاً'); return; }
  
  window.dispatchEvent(new CustomEvent('pdf-export-grid', { detail: false }));
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    alert('1. جاري إنشاء صورة المسقط...');
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

    // ✅ الحل: تحويل الصورة إلى Base64 وحفظها عبر Capacitor Filesystem
    const imageData = croppedCanvas.toDataURL('image/png').split(',')[1];
    const fileName = `Finalplan_${Date.now()}.png`;

    if (Capacitor.isNativePlatform()) {
      alert('2. تم إنشاء الصورة، جاري الحفظ في ذاكرة التطبيق...');
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: imageData,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      alert('3. تم الحفظ بنجاح! جاري فتح نافذة المشاركة...');
      await Share.share({
        title: 'المسقط المعماري',
        text: 'تم إنشاء المسقط المعماري',
        url: savedFile.uri,
        dialogTitle: 'مشاركة المسقط',
      });
    } else {
      // للمتصفح العادي فقط
      alert('2. أنت تستخدم المتصفح، تم تحميل الصورة.');
      const link = document.createElement('a');
      link.download = 'المسقط_المعماري.png';
      link.href = croppedCanvas.toDataURL('image/png');
      link.click();
    }

  } catch (error: any) {
    console.error('PDF Export Error:', error);
    alert('حدث خطأ: ' + (error?.message || 'خطأ غير معروف'));
  } finally {
    window.dispatchEvent(new CustomEvent('pdf-export-grid', { detail: true }));
  }
}
