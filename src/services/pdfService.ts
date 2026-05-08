import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';

export const downloadLessonPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  
  if (element) {
    try {
      // Temporarily hide elements that shouldn't be in PDF
      const style = document.createElement('style');
      style.innerHTML = `
        .pdf-hide { display: none !important; }
        #${elementId} { 
          padding: 40px !important; 
          background: white !important; 
          color: black !important;
          width: 800px !important;
          margin: 0 auto !important;
        }
        textarea { height: auto !important; border: none !important; background: transparent !important; resize: none !important; }
      `;
      document.head.appendChild(style);

      // We need to wait a bit for styles to apply and textareas to resize
      await new Promise(resolve => setTimeout(resolve, 800));

      const imgData = await htmlToImage.toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        width: 800,
        style: {
          transform: 'none',
        }
      });

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit image to A4 width
      const img = new Image();
      img.src = imgData;
      await new Promise(resolve => img.onload = resolve);
      
      const imgWidth = pdfWidth;
      const imgHeight = (img.height * imgWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`${filename.replace(/\s+/g, '_')}_Plan.pdf`);
      
      document.head.removeChild(style);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF generation failed. This might be due to complex styling or cross-origin images.");
    }
  } else {
    console.error("Content element not found:", elementId);
    alert("Could not find the lesson content. Please try again.");
  }
};


