const express = require('express');
const PDFDocument = require('pdfkit');
const excel4node = require('excel4node');
const { getDb } = require('../models/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth, requireRole('MAS', 'ADMIN'));

function getFullAssignment(db, id) {
  const a = db.prepare(`
    SELECT a.*, c.client_name, c.client_type, c.client_code, c.address, c.associated_project,
           s.section_name, s.section_head, u.full_name as created_by_name
    FROM assignments a
    LEFT JOIN clients c ON a.client_id = c.client_id
    LEFT JOIN sections s ON a.section_id = s.section_id
    LEFT JOIN users u ON a.created_by = u.user_id
    WHERE a.assignment_id = ?
  `).get(id);
  if (!a) return null;

  const columns = db.prepare('SELECT * FROM assignment_table_columns WHERE assignment_id = ? ORDER BY column_order').all(id);
  const rows = db.prepare('SELECT * FROM assignment_table_rows WHERE assignment_id = ? ORDER BY row_order').all(id);
  const cells = db.prepare(`SELECT atc.* FROM assignment_table_cells atc JOIN assignment_table_rows atr ON atc.row_id = atr.row_id WHERE atr.assignment_id = ?`).all(id);

  const rowsWithCells = rows.map(row => {
    const rowCells = {};
    cells.filter(c => c.row_id === row.row_id).forEach(cell => { rowCells[cell.column_id] = cell.cell_value; });
    return { ...row, cells: rowCells };
  });

  return { ...a, columns, rows: rowsWithCells };
}

// GET /api/export/:id/pdf
router.get('/:id/pdf', (req, res) => {
  const db = getDb();
  const a = getFullAssignment(db, req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found.' });

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'ASSIGNMENT_EXPORTED_PDF', affectedEntity: 'ASSIGNMENT', entityId: a.assignment_id, ipAddress: req.ip });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${a.assignment_code.replace(/\//g, '-')}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fillColor('#1a3a5c').fontSize(20).text('MECON LIMITED', { align: 'center' });
  doc.fillColor('#555').fontSize(10).text('A Government of India Enterprise', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a3a5c').lineWidth(2).stroke();
  doc.moveDown(0.5);

  doc.fillColor('#1a3a5c').fontSize(14).text('ASSIGNMENT REPORT', { align: 'center' });
  doc.moveDown(1);

  // Details
  const details = [
    ['Assignment ID', a.assignment_code],
    ['Assignment Name', a.assignment_name],
    ['Status', a.status],
    ['Client', `${a.client_name} (${a.client_type})`],
    ['Client Code', a.client_code],
    ['Section', a.section_name],
    ['Section Head', a.section_head],
    ['Created By', a.created_by_name],
    ['Created At', new Date(a.created_at).toLocaleDateString('en-IN')],
    ['Forwarded At', a.forwarded_at ? new Date(a.forwarded_at).toLocaleDateString('en-IN') : 'N/A'],
  ];

  doc.fillColor('#000').fontSize(10);
  details.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value || 'N/A');
  });

  if (a.scope) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Scope of Work:');
    doc.font('Helvetica').text(a.scope);
  }

  // Table
  if (a.columns.length > 0 && a.rows.length > 0) {
    doc.moveDown(1);
    doc.fillColor('#1a3a5c').fontSize(12).text('Assignment Data Table', { underline: true });
    doc.moveDown(0.5);

    const colWidth = Math.min(120, (495 / Math.max(a.columns.length, 1)));
    const startX = 50;
    let y = doc.y;

    // Header row
    doc.rect(startX, y, colWidth * a.columns.length, 20).fill('#1a3a5c');
    doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
    a.columns.forEach((col, i) => {
      doc.text(col.column_name, startX + i * colWidth + 3, y + 6, { width: colWidth - 6, ellipsis: true });
    });
    y += 20;

    // Data rows
    doc.font('Helvetica').fontSize(8);
    a.rows.forEach((row, ri) => {
      if (y > 750) { doc.addPage(); y = 50; }
      const bg = ri % 2 === 0 ? '#f0f4f8' : '#ffffff';
      doc.rect(startX, y, colWidth * a.columns.length, 18).fill(bg);
      doc.fillColor('#000');
      a.columns.forEach((col, i) => {
        const val = row.cells[col.column_id] || '';
        doc.text(String(val), startX + i * colWidth + 3, y + 5, { width: colWidth - 6, ellipsis: true });
      });
      y += 18;
    });
    doc.y = y + 10;
  }

  // MAS Remarks
  if (a.mas_remarks) {
    doc.moveDown(1);
    doc.fillColor('#1a3a5c').fontSize(12).text('MAS Remarks:', { underline: true });
    doc.fillColor('#000').fontSize(10).font('Helvetica').text(a.mas_remarks);
  }

  // Footer
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a3a5c').lineWidth(1).stroke();
  doc.fontSize(8).fillColor('#888').text(`Generated by MECON AMS on ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

  doc.end();
});

// GET /api/export/:id/excel
router.get('/:id/excel', (req, res) => {
  const db = getDb();
  const a = getFullAssignment(db, req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found.' });

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'ASSIGNMENT_EXPORTED_EXCEL', affectedEntity: 'ASSIGNMENT', entityId: a.assignment_id, ipAddress: req.ip });

  const wb = new excel4node.Workbook();
  const ws = wb.addWorksheet('Assignment');

  const headerStyle = wb.createStyle({ font: { bold: true, color: '#FFFFFF', size: 11 }, fill: { type: 'pattern', patternType: 'solid', fgColor: '#1a3a5c' }, alignment: { horizontal: 'center' } });
  const labelStyle = wb.createStyle({ font: { bold: true, size: 10 } });
  const valueStyle = wb.createStyle({ font: { size: 10 } });
  const tableHeaderStyle = wb.createStyle({ font: { bold: true, color: '#FFFFFF', size: 10 }, fill: { type: 'pattern', patternType: 'solid', fgColor: '#2c5f8a' }, alignment: { horizontal: 'center', wrapText: true } });
  const evenRowStyle = wb.createStyle({ fill: { type: 'pattern', patternType: 'solid', fgColor: '#EBF3FB' } });

  // Title
  ws.cell(1, 1, 1, 4, true).string('MECON LIMITED — Assignment Report').style(headerStyle);
  ws.cell(2, 1, 2, 4, true).string('A Government of India Enterprise').style({ font: { italic: true, size: 10 }, alignment: { horizontal: 'center' } });

  const infoRows = [
    ['Assignment ID', a.assignment_code],
    ['Assignment Name', a.assignment_name],
    ['Status', a.status],
    ['Client', `${a.client_name} (${a.client_type})`],
    ['Section', a.section_name],
    ['Created By', a.created_by_name],
    ['Created At', new Date(a.created_at).toLocaleDateString('en-IN')],
    ['Scope', a.scope || 'N/A'],
    ['MAS Remarks', a.mas_remarks || 'N/A'],
  ];

  infoRows.forEach(([label, value], i) => {
    ws.cell(4 + i, 1).string(label).style(labelStyle);
    ws.cell(4 + i, 2, 4 + i, 4, true).string(String(value || '')).style(valueStyle);
  });

  // Table data
  if (a.columns.length > 0) {
    const tableStartRow = 4 + infoRows.length + 2;
    ws.cell(tableStartRow - 1, 1, tableStartRow - 1, Math.max(a.columns.length, 1), true).string('Assignment Data Table').style(labelStyle);

    a.columns.forEach((col, i) => {
      ws.cell(tableStartRow, i + 1).string(col.column_name).style(tableHeaderStyle);
      ws.column(i + 1).setWidth(20);
    });

    a.rows.forEach((row, ri) => {
      const rowNum = tableStartRow + 1 + ri;
      a.columns.forEach((col, ci) => {
        const val = row.cells[col.column_id] || '';
        const cell = ws.cell(rowNum, ci + 1).string(String(val));
        if (ri % 2 === 0) cell.style(evenRowStyle);
      });
    });
  }

  ws.column(1).setWidth(22);
  ws.column(2).setWidth(30);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${a.assignment_code.replace(/\//g, '-')}.xlsx"`);
  wb.write('Assignment.xlsx', res);
});

module.exports = router;
