const { getDb } = require('../models/db');

function getCurrentFinancialYear() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

function generateAssignmentCode() {
  const db = getDb();
  const fy = getCurrentFinancialYear();
  const row = db.prepare('SELECT last_seq FROM financial_year_sequences WHERE fy = ?').get(fy);
  let seq;
  if (!row) {
    db.prepare('INSERT INTO financial_year_sequences (fy, last_seq) VALUES (?, 1)').run(fy);
    seq = 1;
  } else {
    seq = row.last_seq + 1;
    db.prepare('UPDATE financial_year_sequences SET last_seq = ? WHERE fy = ?').run(seq, fy);
  }
  return `MECON/AMS/${fy}/${String(seq).padStart(4, '0')}`;
}

function generateClientCode() {
  const db = getDb();
  const year = String(new Date().getFullYear());
  const row = db.prepare('SELECT last_seq FROM client_sequences WHERE year = ?').get(year);
  let seq;
  if (!row) {
    db.prepare('INSERT INTO client_sequences (year, last_seq) VALUES (?, 1)').run(year);
    seq = 1;
  } else {
    seq = row.last_seq + 1;
    db.prepare('UPDATE client_sequences SET last_seq = ? WHERE year = ?').run(seq, year);
  }
  return `CLT-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = { generateAssignmentCode, generateClientCode, getCurrentFinancialYear };
