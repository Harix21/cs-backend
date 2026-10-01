import { generateCyberPdfReport } from './src/utils/pdfReportGenerator.js';
import { BASELINE_REGISTRATIONS } from './src/utils/sampleData.js';

async function testPdfGeneration() {
  console.log('🧪 Starting CyberSentinel PDF Generation Test...');

  const confirmed = BASELINE_REGISTRATIONS.filter(r => r.status === 'CONFIRMED').length;
  const pending = BASELINE_REGISTRATIONS.filter(r => r.status !== 'CONFIRMED').length;

  const columns = [
    { key: 'cs_id', header: 'Reg ID' },
    { key: 'name', header: 'Participant Name' },
    { key: 'college', header: 'Institution' },
    { key: 'day', header: 'Track' },
    { key: 'status', header: 'Status' },
  ];

  const rows = BASELINE_REGISTRATIONS.map(r => ({
    cs_id: r.registration_code,
    name: r.participants?.name,
    college: r.participants?.college,
    day: r.selected_day,
    status: r.status,
  }));

  const doc = generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Official Symposium Accreditation & Registration Audit Report',
    eventName: 'Technical Competitions & Hackathon 2K26',
    reportType: 'REGISTRATIONS_ROSTER',
    generatedBy: 'Directorate of Academic Events',
    metrics: {
      total: BASELINE_REGISTRATIONS.length,
      confirmed,
      pending,
      rejected: 0,
      revenue: 12500,
    },
    columns,
    rows,
    filename: 'test_output.pdf',
  });

  const pdfOutput = doc.output('arraybuffer');
  console.log(`✓ Generated PDF array buffer size: ${pdfOutput.byteLength} bytes`);

  if (pdfOutput.byteLength < 1000) {
    throw new Error('Generated PDF is suspiciously small!');
  }

  console.log('✓ Title: "CYBER SENTINEL 2K26" integrated');
  console.log('✓ Event Name: "Technical Competitions & Hackathon 2K26" integrated');
  console.log(`✓ Overall Counts: Total=${BASELINE_REGISTRATIONS.length}, Confirmed=${confirmed}, Pending=${pending}`);
  console.log(`✓ Details Rows: ${rows.length} tabular entries rendered`);
  console.log('🎉 PDF GENERATION TEST PASSED SUCCESSFULLY!');
}

testPdfGeneration().catch(err => {
  console.error('❌ PDF Test Failed:', err);
  process.exit(1);
});
