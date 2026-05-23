const { Database } = require("./src/node_modules/node-sqlite3-wasm");
const path = require("path");

const db = new Database(path.resolve("./data/ams.db"));

const tables = [
  "section_table_cells",
  "section_table_rows",
  "section_table_columns",
  "section_data_tables",
  "assignment_routing",
  "assignment_table_cells",
  "assignment_table_rows",
  "assignment_table_columns",
  "assignments",
  "clients",
  "notifications",
  "audit_logs",
];

tables.forEach((t) => {
  db.run(`DELETE FROM ${t}`);
  console.log(`Cleared: ${t}`);
});

db.run("DELETE FROM users WHERE role != 'ADMIN'");
console.log("Cleared: non-admin users");

db.run("DELETE FROM sections");
console.log("Cleared: sections");

db.run("DELETE FROM sqlite_sequence");
console.log("Reset: auto-increment counters");

console.log(
  "\n✅ Done! All data cleared. Restart your backend with: npm start",
);
