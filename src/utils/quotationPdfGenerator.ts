// jspdf is browser-only; import it dynamically so SSR bundling doesn't pull it in.
import type jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface QuotationPDFData {
  quotationNumber: string;
  createdAt: string;
  validUntil: string | null;
  
  // Seller info
  sellerName: string;
  sellerCompany: string;
  sellerEmail: string | null;
  sellerPhone: string | null;
  sellerAddress: string | null;
  sellerLogoUrl: string | null;
  sellerGST: string | null;
  
  // Buyer info
  buyerName: string;
  buyerCompany: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  buyerAddress: string | null;
  
  // Items
  items: {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  
  // Pricing
  subtotal: number;
  discountType?: string;
  discountValue?: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  
  // Terms
  termsConditions: string | null;
  notes: string | null;
}

const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const symbol = currency === 'INR' ? 'Rs.' : currency === 'USD' ? '$' : currency;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formatted}`;
};

export const generateQuotationPDF = async (data: QuotationPDFData): Promise<jsPDF> => {
  const { default: JsPDF } = await import('jspdf');
  const pdf = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue-600
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const mutedColor: [number, number, number] = [107, 114, 128]; // Gray-500
  const borderColor: [number, number, number] = [229, 231, 235]; // Gray-200

  // Helper functions
  const drawLine = (y: number, startX: number = margin, endX: number = pageWidth - margin) => {
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.3);
    pdf.line(startX, y, endX, y);
  };

  const addText = (text: string, x: number, y: number, options?: {
    fontSize?: number;
    fontStyle?: 'normal' | 'bold' | 'italic';
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
    maxWidth?: number;
  }) => {
    const { fontSize = 10, fontStyle = 'normal', color = textColor, align = 'left', maxWidth } = options || {};
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(...color);
    
    if (maxWidth) {
      pdf.text(text, x, y, { maxWidth, align });
    } else {
      pdf.text(text, x, y, { align });
    }
  };

  // === HEADER SECTION ===
  
  // Try to add seller logo if available
  let logoLoaded = false;
  if (data.sellerLogoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxSize = 40;
            const ratio = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', margin, yPos, canvas.width * 0.4, canvas.height * 0.4);
            logoLoaded = true;
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = reject;
        img.src = data.sellerLogoUrl!;
      });
    } catch (error) {
      console.log('Could not load seller logo:', error);
    }
  }

  // Quotation Title (right side)
  addText('QUOTATION', pageWidth - margin, yPos + 5, {
    fontSize: 24,
    fontStyle: 'bold',
    color: primaryColor,
    align: 'right',
  });

  addText(`#${data.quotationNumber}`, pageWidth - margin, yPos + 13, {
    fontSize: 12,
    color: mutedColor,
    align: 'right',
  });

  yPos += logoLoaded ? 25 : 20;

  // Quotation details
  addText(`Date: ${format(new Date(data.createdAt), 'dd MMM yyyy')}`, pageWidth - margin, yPos, {
    fontSize: 10,
    align: 'right',
  });
  
  if (data.validUntil) {
    yPos += 5;
    addText(`Valid Until: ${format(new Date(data.validUntil), 'dd MMM yyyy')}`, pageWidth - margin, yPos, {
      fontSize: 10,
      align: 'right',
    });
  }

  yPos += 15;
  drawLine(yPos);
  yPos += 10;

  // === SELLER & BUYER INFO ===
  const colWidth = (pageWidth - margin * 2) / 2 - 10;

  // Seller Info (Left)
  addText('FROM', margin, yPos, {
    fontSize: 9,
    fontStyle: 'bold',
    color: primaryColor,
  });
  yPos += 6;
  
  addText(data.sellerCompany || data.sellerName, margin, yPos, {
    fontSize: 11,
    fontStyle: 'bold',
  });
  yPos += 5;
  
  if (data.sellerCompany && data.sellerName) {
    addText(data.sellerName, margin, yPos, { fontSize: 9, color: mutedColor });
    yPos += 4;
  }
  
  if (data.sellerAddress) {
    addText(data.sellerAddress, margin, yPos, { fontSize: 9, maxWidth: colWidth });
    yPos += 8;
  }
  
  if (data.sellerPhone) {
    addText(`Phone: ${data.sellerPhone}`, margin, yPos, { fontSize: 9 });
    yPos += 4;
  }
  
  if (data.sellerEmail) {
    addText(`Email: ${data.sellerEmail}`, margin, yPos, { fontSize: 9 });
    yPos += 4;
  }
  
  if (data.sellerGST) {
    addText(`GST: ${data.sellerGST}`, margin, yPos, { fontSize: 9 });
  }

  // Buyer Info (Right)
  let buyerYPos = yPos - 27;
  const rightColX = pageWidth / 2 + 5;

  addText('TO', rightColX, buyerYPos, {
    fontSize: 9,
    fontStyle: 'bold',
    color: primaryColor,
  });
  buyerYPos += 6;
  
  addText(data.buyerCompany || data.buyerName, rightColX, buyerYPos, {
    fontSize: 11,
    fontStyle: 'bold',
  });
  buyerYPos += 5;
  
  if (data.buyerCompany && data.buyerName) {
    addText(data.buyerName, rightColX, buyerYPos, { fontSize: 9, color: mutedColor });
    buyerYPos += 4;
  }
  
  if (data.buyerAddress) {
    addText(data.buyerAddress, rightColX, buyerYPos, { fontSize: 9, maxWidth: colWidth });
    buyerYPos += 8;
  }
  
  if (data.buyerPhone) {
    addText(`Phone: ${data.buyerPhone}`, rightColX, buyerYPos, { fontSize: 9 });
    buyerYPos += 4;
  }
  
  if (data.buyerEmail) {
    addText(`Email: ${data.buyerEmail}`, rightColX, buyerYPos, { fontSize: 9 });
  }

  yPos = Math.max(yPos, buyerYPos) + 15;
  drawLine(yPos);
  yPos += 10;

  // === ITEMS TABLE ===
  
  // Table Header
  const tableStartY = yPos;
  const colWidths = {
    sno: 12,
    item: 65,
    qty: 15,
    price: 40,
    total: 43,
  };
  
  pdf.setFillColor(...primaryColor);
  pdf.rect(margin, yPos - 3, pageWidth - margin * 2, 8, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  
  let tableX = margin + 3;
  pdf.text('S.No', tableX, yPos + 2);
  tableX += colWidths.sno;
  pdf.text('Item / Description', tableX, yPos + 2);
  tableX += colWidths.item;
  pdf.text('Qty', tableX, yPos + 2);
  tableX += colWidths.qty;
  pdf.text('Unit Price', tableX, yPos + 2);
  tableX += colWidths.price;
  pdf.text('Total', tableX, yPos + 2);
  
  yPos += 10;
  pdf.setTextColor(...textColor);

  // Table Rows
  data.items.forEach((item, index) => {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      yPos = margin;
    }

    // Alternate row background
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPos - 3, pageWidth - margin * 2, 10, 'F');
    }

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    tableX = margin + 3;
    pdf.text(String(index + 1), tableX, yPos + 2);
    tableX += colWidths.sno;
    
    // Item name (with description if available)
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.name.substring(0, 40), tableX, yPos + 2);
    if (item.description) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...mutedColor);
      pdf.text(item.description.substring(0, 50), tableX, yPos + 6);
      pdf.setTextColor(...textColor);
    }
    
    tableX += colWidths.item;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(item.quantity), tableX, yPos + 2);
    tableX += colWidths.qty;
    pdf.text(formatCurrency(item.unitPrice, data.currency), tableX, yPos + 2);
    tableX += colWidths.price;
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(item.total, data.currency), tableX, yPos + 2);

    yPos += item.description ? 12 : 8;
  });

  yPos += 5;
  drawLine(yPos);
  yPos += 10;

  // === TOTALS SECTION ===
  const totalsX = pageWidth - margin - 70;
  const totalsValueX = pageWidth - margin;

  addText('Subtotal:', totalsX, yPos, { fontSize: 10 });
  addText(formatCurrency(data.subtotal, data.currency), totalsValueX, yPos, { fontSize: 10, align: 'right' });
  yPos += 6;

  if (data.discountAmount > 0) {
    addText(`Discount${data.discountType === 'percentage' ? ` (${data.discountValue}%)` : ''}:`, totalsX, yPos, { fontSize: 10, color: [22, 163, 74] });
    addText(`-${formatCurrency(data.discountAmount, data.currency)}`, totalsValueX, yPos, { fontSize: 10, align: 'right', color: [22, 163, 74] });
    yPos += 6;
  }

  if (data.taxAmount > 0) {
    addText(`Tax (${data.taxRate}%):`, totalsX, yPos, { fontSize: 10 });
    addText(formatCurrency(data.taxAmount, data.currency), totalsValueX, yPos, { fontSize: 10, align: 'right' });
    yPos += 6;
  }

  if (data.shippingAmount > 0) {
    addText('Shipping:', totalsX, yPos, { fontSize: 10 });
    addText(formatCurrency(data.shippingAmount, data.currency), totalsValueX, yPos, { fontSize: 10, align: 'right' });
    yPos += 6;
  }

  yPos += 2;
  pdf.setFillColor(...primaryColor);
  pdf.rect(totalsX - 5, yPos - 3, 80, 10, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total:', totalsX, yPos + 3);
  pdf.text(formatCurrency(data.totalAmount, data.currency), totalsValueX, yPos + 3, { align: 'right' });
  
  yPos += 20;

  // === TERMS & CONDITIONS ===
  if (data.termsConditions) {
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      yPos = margin;
    }

    addText('Terms & Conditions', margin, yPos, {
      fontSize: 11,
      fontStyle: 'bold',
      color: primaryColor,
    });
    yPos += 6;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...mutedColor);
    
    const termsLines = pdf.splitTextToSize(data.termsConditions, pageWidth - margin * 2);
    termsLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 10;
  }

  // === NOTES ===
  if (data.notes) {
    if (yPos > pageHeight - 50) {
      pdf.addPage();
      yPos = margin;
    }

    addText('Additional Notes', margin, yPos, {
      fontSize: 11,
      fontStyle: 'bold',
      color: primaryColor,
    });
    yPos += 6;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...mutedColor);
    
    const notesLines = pdf.splitTextToSize(data.notes, pageWidth - margin * 2);
    notesLines.forEach((line: string) => {
      pdf.text(line, margin, yPos);
      yPos += 4;
    });
  }

  // === FOOTER ===
  const footerY = pageHeight - 15;
  
  drawLine(footerY - 5);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(...mutedColor);
  pdf.text(
    'This quotation has been generated and submitted via the RobotVerse platform.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  
  pdf.setFontSize(7);
  pdf.text(
    'www.robotverse.in | India\'s Leading Industrial Robotics Marketplace',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  return pdf;
};

export const downloadQuotationPDF = async (data: QuotationPDFData): Promise<void> => {
  const pdf = await generateQuotationPDF(data);
  pdf.save(`Quotation-${data.quotationNumber}.pdf`);
};

export const getQuotationPDFBlob = async (data: QuotationPDFData): Promise<Blob> => {
  const pdf = await generateQuotationPDF(data);
  return pdf.output('blob');
};
