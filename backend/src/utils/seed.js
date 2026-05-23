require("dotenv").config();
const bcrypt = require("bcryptjs");
const { getDb } = require("../models/db");

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

async function seed() {
  const db = getDb();
  console.log("🌱 Seeding database...");

  // ── Check if already seeded ──────────────────────────────────────────
  const existingAdmin = db
    .prepare("SELECT user_id FROM users WHERE username = ?")
    .get("admin");
  if (existingAdmin) {
    console.log("ℹ️  Seed data already present. Skipping.");
    process.exit(0);
  }

  // ── STEP 1: Create Admin first (no section) ───────────────────────────
  const adminHash = await bcrypt.hash("Admin@1234", SALT_ROUNDS);
  const adminResult = db
    .prepare(
      `
    INSERT INTO users (username, password_hash, full_name, role, section_id, is_section_head, created_by)
    VALUES (?, ?, ?, 'ADMIN', NULL, 0, NULL)
  `,
    )
    .run("admin", adminHash, "System Administrator");
  const adminId = adminResult.lastInsertRowid;
  console.log("✅ Admin created.");

  // ── STEP 2: Create MAS Officer (no section) ───────────────────────────
  const masHash = await bcrypt.hash("Mas@1234", SALT_ROUNDS);
  db.prepare(
    `
    INSERT INTO users (username, password_hash, full_name, role, section_id, is_section_head, created_by)
    VALUES (?, ?, ?, 'MAS', NULL, 0, ?)
  `,
  ).run("mas1", masHash, "Anil Verma", adminId);
  console.log("✅ MAS Officer created.");

  // ── STEP 3: Create the 3 sections ─────────────────────────────────────
  const sections = [
    {
      code: "SEC-0001",
      name: "Metallurgical Division",
      head: "Dr. S.K. Mishra",
    },
    {
      code: "SEC-0002",
      name: "Civil & Structural Engineering",
      head: "Mr. P.K. Das",
    },
    {
      code: "SEC-0003",
      name: "Electrical & Instrumentation",
      head: "Ms. R. Nair",
    },
  ];

  const sectionIds = {};
  for (const s of sections) {
    const result = db
      .prepare(
        `
      INSERT INTO sections (section_code, section_name, section_head, created_by)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(s.code, s.name, s.head, adminId);
    sectionIds[s.name] = result.lastInsertRowid;
    console.log(
      `✅ Section created: ${s.name} (ID: ${result.lastInsertRowid})`,
    );
  }

  const metId = sectionIds["Metallurgical Division"];
  const civilId = sectionIds["Civil & Structural Engineering"];
  const elecId = sectionIds["Electrical & Instrumentation"];

  // ── STEP 4: Create Section Heads (STAFF + is_section_head = 1) ────────
  const staffHash = await bcrypt.hash("Staff@1234", SALT_ROUNDS);

  const headData = [
    { username: "head_met", fullName: "Dr. S.K. Mishra", sectionId: metId },
    { username: "head_civil", fullName: "Mr. P.K. Das", sectionId: civilId },
    { username: "head_elec", fullName: "Ms. R. Nair", sectionId: elecId },
  ];

  for (const h of headData) {
    db.prepare(
      `
      INSERT INTO users (username, password_hash, full_name, role, section_id, is_section_head, created_by)
      VALUES (?, ?, ?, 'STAFF', ?, 1, ?)
    `,
    ).run(h.username, staffHash, h.fullName, h.sectionId, adminId);
    console.log(
      `✅ Section Head created: ${h.fullName} → username: ${h.username}`,
    );
  }

  // ── STEP 5: Create regular Staff users (assigned to sections) ─────────
  const staffData = [
    { username: "staff1", fullName: "Rajesh Kumar", sectionId: metId },
    { username: "staff2", fullName: "Priya Sharma", sectionId: civilId },
  ];

  for (const s of staffData) {
    db.prepare(
      `
      INSERT INTO users (username, password_hash, full_name, role, section_id, is_section_head, created_by)
      VALUES (?, ?, ?, 'STAFF', ?, 0, ?)
    `,
    ).run(s.username, staffHash, s.fullName, s.sectionId, adminId);
    console.log(
      `✅ Staff created: ${s.fullName} → section: ${Object.keys(sectionIds).find((k) => sectionIds[k] === s.sectionId)}`,
    );
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Seeding complete. Credentials:");
  console.log("");
  console.log("  ADMIN");
  console.log("  admin        / Admin@1234");
  console.log("");
  console.log("  MAS OFFICER");
  console.log("  mas1         / Mas@1234");
  console.log("");
  console.log("  SECTION HEADS (STAFF + is_section_head)");
  console.log("  head_met     / Staff@1234  → Metallurgical Division");
  console.log("  head_civil   / Staff@1234  → Civil & Structural Engineering");
  console.log("  head_elec    / Staff@1234  → Electrical & Instrumentation");
  console.log("");
  console.log("  STAFF MEMBERS");
  console.log("  staff1       / Staff@1234  → Metallurgical Division");
  console.log("  staff2       / Staff@1234  → Civil & Structural Engineering");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
