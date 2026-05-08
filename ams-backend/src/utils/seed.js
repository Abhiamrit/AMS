require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('../models/db');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

async function seed() {
  const db = getDb();
  console.log('🌱 Seeding database...');

  const users = [
    { username: 'admin', password: 'Admin@1234', full_name: 'System Administrator', role: 'ADMIN' },
    { username: 'staff1', password: 'Staff@1234', full_name: 'Rajesh Kumar', role: 'STAFF' },
    { username: 'staff2', password: 'Staff@1234', full_name: 'Priya Sharma', role: 'STAFF' },
    { username: 'mas1',   password: 'Mas@1234',   full_name: 'Anil Verma',    role: 'MAS'   },
  ];

  const existingAdmin = db.prepare('SELECT user_id FROM users WHERE username = ?').get('admin');
  if (existingAdmin) {
    console.log('ℹ️  Seed data already present. Skipping.');
    process.exit(0);
  }

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, created_by)
      VALUES (?, ?, ?, ?, NULL)
    `).run(u.username, hash, u.full_name, u.role);
  }

  // Seed a couple of sections
  const adminId = db.prepare('SELECT user_id FROM users WHERE username = ?').get('admin').user_id;
  const sections = [
    { code: 'SEC-0001', name: 'Metallurgical Division', head: 'Dr. S.K. Mishra' },
    { code: 'SEC-0002', name: 'Civil & Structural Engineering', head: 'Mr. P.K. Das' },
    { code: 'SEC-0003', name: 'Electrical & Instrumentation', head: 'Ms. R. Nair' },
  ];
  for (const s of sections) {
    db.prepare(`
      INSERT INTO sections (section_code, section_name, section_head, created_by)
      VALUES (?, ?, ?, ?)
    `).run(s.code, s.name, s.head, adminId);
  }

  console.log('✅ Seeded users:');
  console.log('   admin   / Admin@1234  (ADMIN)');
  console.log('   staff1  / Staff@1234  (STAFF)');
  console.log('   staff2  / Staff@1234  (STAFF)');
  console.log('   mas1    / Mas@1234    (MAS)');
  console.log('✅ Seeded 3 sections.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
