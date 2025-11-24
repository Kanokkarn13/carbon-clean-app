/**
 * Backfill points for existing walking and cycling activities.
 * Usage: node scripts/backfillPoints.js
 */
const db = require('../config/db');
const { evaluateActivityPoints } = require('../utils/points');

const TABLES = [
  {
    name: 'walk_history',
    type: 'Walking',
    columns: ['id', 'distance_km', 'step_total', 'duration_sec', 'points'],
  },
  {
    name: 'bic_history',
    type: 'Cycling',
    columns: ['id', 'distance_km', 'duration_sec', 'points'],
  },
];

const BATCH = 500;

async function backfillTable(table) {
  console.log(`\n▶️  Backfilling ${table.name}...`);
  let offset = 0;
  let updates = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await db.query(
      `SELECT ${table.columns.join(', ')} FROM ${table.name} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [BATCH, offset],
    );
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const points = evaluateActivityPoints({
        type: table.type,
        distance_km: row.distance_km,
        step_total: row.step_total,
        duration_sec: row.duration_sec,
      });
      const current = Number(row.points) || 0;
      if (points !== current) {
        await db.query(`UPDATE ${table.name} SET points = ? WHERE id = ?`, [points, row.id]);
        updates += 1;
      }
    }
    offset += rows.length;
    console.log(`  processed ${offset} rows...`);
  }
  console.log(`✅ ${table.name}: updated ${updates} rows`);
}

async function main() {
  try {
    for (const table of TABLES) {
      await backfillTable(table);
    }
    console.log('\n🎉 Backfill completed');
  } catch (err) {
    console.error('❌ Backfill error:', err);
  } finally {
    process.exit(0);
  }
}

main();
