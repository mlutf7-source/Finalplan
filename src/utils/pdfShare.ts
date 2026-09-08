import { Capacitor } from '@capacitor/core';
// ملاحظة: لا نستخدم Filesystem أو Share هنا في هذا الحل

const safeName = (name: string) =>
  name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');

export const createPdfFromElement = async (
  elementId: string,
  title = 'تقرير المشروع'
) => {
  const element = document.getElementById(elementId);

  if (!element) {
    alert('لم يتم العثور على منطقة التقرير');
    return;
  }

  try {
    // تحميل المكتبات كسولاً (Dynamic Import)
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    const clone = element.cloneNode(true) as HTMLElement;

    // مزامنة القوائم المنسدلة
    const originalSelects = element.querySelectorAll('select');
    const clonedSelects = clone.querySelectorAll('select');

    originalSelects.forEach((select, index) => {
      const clonedSelect = clonedSelects[index] as HTMLSelectElement;
      if (clonedSelect) {
        const selectedText = (select as HTMLSelectElement).selectedOptions[0]?.textContent || '';
        const span = document.createElement('span');
        span.textContent = selectedText;
        span.style.display = 'inline-block';
        span.style.padding = '6px 10px';
        clonedSelect.replaceWith(span);
      }
    });

    // مزامنة حقول الإدخال
    const originalInputs = element.querySelectorAll('input, textarea');
    const clonedInputs = clone.querySelectorAll('input, textarea');

    originalInputs.forEach((input, index) => {
      if (clonedInputs[index]) {
        const original = input as HTMLInputElement | HTMLTextAreaElement;
        const cloned = clonedInputs[index] as HTMLInputElement | HTMLTextAreaElement;
        cloned.value = original.value;
      }
    });

    // إعداد نسخة التقرير
    clone.style.width = '760px';
    clone.style.maxWidth = '760px';
    clone.style.boxSizing = 'border-box';
    clone.style.margin = '0 auto';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.background = '#ffffff';
    clone.style.padding = '16px';
    clone.style.direction = 'rtl';
    clone.style.fontFamily = 'Cairo, Arial, sans-serif';

    // إظهار النسخة خارج الشاشة
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.width = '800px';
    wrapper.style.background = '#ffffff';
    wrapper.style.overflow = 'visible';
    wrapper.style.zIndex = '-1';

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // السماح للمتصفح بإكمال عملية الرسم
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollY: 0,
      windowWidth: 800,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 6;
    const marginY = 8;

    const usableWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginY * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = marginY;

    pdf.addImage(imgData, 'JPEG', marginX, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = marginY - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', marginX, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= usableHeight;
    }

    // ✅ طريقة التحميل المباشر (تعمل بدون Filesystem)
    const fileName = `${safeName(title)}.pdf`;
    
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // ✅ محاولة المشاركة المباشرة (Web Share API)
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: title });
      }
    } catch (shareError) {
      console.log('Share failed or cancelled', shareError);
    }

    document.body.removeChild(wrapper);

  } catch (error) {
    console.error('PDF creation error:', error);
    alert('حدث خطأ أثناء إنشاء ملف PDF');
  }
};
