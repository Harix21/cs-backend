import * as jspdfModule from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './helpers.js';

const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;

/**
 * Cyber Sentinel 2K26 Professional PDF Report Generator
 * Designed to match the cyber neon & dark navy color palette with executive print fidelity.
 */
export function generateCyberPdfReport({
  title = 'CYBER SENTINEL 2K26',
  subtitle = 'Official Symposium Accreditation & Data Report',
  eventName = 'Cyber Sentinel 2K26 - All Events & Tracks',
  reportType = 'REGISTRATIONS_ROSTER',
  generatedBy = 'Administrator',
  metrics = {
    total: 0,
    confirmed: 0,
    pending: 0,
    rejected: 0,
    revenue: null,
  },
  columns = [],
  rows = [],
  filename = 'cybersentinel-report.pdf',
}) {
  // Use landscape for wide tables with multiple columns
  const isWide = columns.length > 5;
  const doc = new jsPDF({
    orientation: isWide ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // 1. TOP NEON ACCENT BARS
  // Electric Cyan Top Strip
  doc.setFillColor(0, 240, 255);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Neon Purple Accent Secondary Strip
  doc.setFillColor(168, 85, 247);
  doc.rect(0, 5, pageWidth * 0.45, 2.5, 'F');

  // 2. HEADER BANNER BLOCK (Deep Cyber Navy: #070d24)
  doc.setFillColor(7, 13, 36);
  doc.rect(margin, 18, contentWidth, 76, 'F');

  // Header border
  doc.setDrawColor(0, 240, 255);
  doc.setLineWidth(1);
  doc.rect(margin, 18, contentWidth, 76, 'S');

  // Watermark text in header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 240, 255);
  doc.text(title.toUpperCase(), margin + 18, 44);

  // Subtitle & Event Name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(subtitle, margin + 18, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(168, 85, 247); // Purple
  doc.text(`EVENT / SCOPE: ${eventName.toUpperCase()}`, margin + 18, 78);

  // Right Side Metadata Pill in Header
  const rightX = pageWidth - margin - 18;
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`ISSUED BY: ${generatedBy}`, rightX, 42, { align: 'right' });
  doc.text(`DATE: ${formatDate(new Date().toISOString())}`, rightX, 58, { align: 'right' });
  doc.setTextColor(0, 240, 255);
  doc.text(`AUTH CODE: CS26-VERIFIED`, rightX, 74, { align: 'right' });

  // 3. OVERALL KPI COUNTS CARDS (4-5 metric blocks)
  const kpiTop = 104;
  const kpiHeight = 44;

  let kpiData = [];
  if (Array.isArray(metrics.customKpis) && metrics.customKpis.length > 0) {
    kpiData = metrics.customKpis;
  } else if (reportType === 'COORDINATOR_ATTENDANCE' || reportType === 'ATTENDANCE_AUDIT') {
    const present = metrics.confirmed || 0;
    const total = metrics.total || rows.length;
    const absent = metrics.rejected !== undefined ? metrics.rejected : Math.max(0, total - present);
    const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';
    kpiData = [
      { label: 'TOTAL DELEGATES', value: String(total), color: [0, 240, 255] },
      { label: 'ACCREDITED (PRESENT)', value: String(present), color: [16, 185, 129] },
      { label: 'NOT CHECKED IN', value: String(absent), color: [239, 68, 68] },
      { label: 'ATTENDANCE RATE', value: rate, color: [168, 85, 247] },
    ];
  } else {
    kpiData = [
      { label: 'TOTAL PARTICIPANTS', value: String(metrics.total || rows.length), color: [0, 240, 255] },
      { label: 'CONFIRMED / VERIFIED', value: String(metrics.confirmed || 0), color: [16, 185, 129] },
      { label: 'PENDING / REVIEW', value: String(metrics.pending || 0), color: [245, 158, 11] },
      { label: 'REJECTED / CANCELLED', value: String(metrics.rejected || 0), color: [239, 68, 68] },
    ];

    if (metrics.revenue !== null && metrics.revenue !== undefined) {
      kpiData.push({
        label: 'TOTAL REVENUE',
        value: `INR ${Number(metrics.revenue || 0).toLocaleString('en-IN')}`,
        color: [168, 85, 247],
      });
    }
  }

  const numCards = kpiData.length;
  const cardGap = 10;
  const cardWidth = (contentWidth - cardGap * (numCards - 1)) / numCards;

  kpiData.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + cardGap);

    // Card background
    doc.setFillColor(11, 19, 43);
    doc.roundedRect(cardX, kpiTop, cardWidth, kpiHeight, 4, 4, 'F');

    // Card top border accent in metric color
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cardX, kpiTop, cardWidth, 3, 2, 2, 'F');

    // Metric Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.label, cardX + 8, kpiTop + 16);

    // Metric Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cardX + 8, kpiTop + 34);
  });

  // 4. DATA TABLE (autoTable)
  const startY = kpiTop + kpiHeight + 14;

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin, bottom: 45 },
    head: [columns.map((c) => c.header.toUpperCase())],
    body: rows.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        return val !== undefined && val !== null ? String(val) : '—';
      })
    ),
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      font: 'helvetica',
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      textColor: [30, 41, 59], // Dark slate for crystal clear readability on print
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [7, 13, 36], // Cyber Navy Header
      textColor: [0, 240, 255], // Electric Cyan Text
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [0, 240, 255],
      lineWidth: 0.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Subtle alternating row
    },
    didParseCell: (data) => {
      // Style status column with rich badge colors
      if (data.section === 'body') {
        const rawText = String(data.cell.raw || '').toUpperCase();
        if (rawText === 'CONFIRMED' || rawText === 'VERIFIED' || rawText === 'PRESENT' || rawText === 'PAID') {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
          data.cell.styles.fontStyle = 'bold';
        } else if (rawText.includes('PENDING') || rawText.includes('REVIEW')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
          data.cell.styles.fontStyle = 'bold';
        } else if (rawText === 'REJECTED' || rawText === 'CANCELLED' || rawText === 'ABSENT') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => {
      // 5. OFFICIAL FOOTER ON EVERY PAGE
      const footerY = pageHeight - 20;

      // Bottom Cyan Accent Line
      doc.setFillColor(0, 240, 255);
      doc.rect(margin, pageHeight - 30, contentWidth, 1, 'F');

      // Left: Symposium affiliation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'CYBER SENTINEL 2K26 • DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING • OFFICIAL VERIFIED REPORT',
        margin,
        footerY
      );

      // Right: Page numbering
      const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
      doc.text(pageStr, pageWidth - margin, footerY, { align: 'right' });
    },
  });

  // Save the PDF
  doc.save(filename);
  return doc;
}
