/**
 * Database Migration Script
 * Applies schema migrations to the SQLite database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/stores.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

class DatabaseMigrator {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initMigrationsTable();
  }

  initMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  getAppliedMigrations() {
    const stmt = this.db.prepare('SELECT migration_name FROM schema_migrations ORDER BY id');
    return stmt.all().map(row => row.migration_name);
  }

  getPendingMigrations() {
    const appliedMigrations = this.getAppliedMigrations();
    const allMigrations = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return allMigrations.filter(migration => !appliedMigrations.includes(migration));
  }

  applyMigration(migrationFile) {
    const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log(`\n📦 Applying migration: ${migrationFile}`);

    try {
      // Execute migration in a transaction
      const applyMigration = this.db.transaction(() => {
        // Split SQL by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          try {
            this.db.exec(statement);
          } catch (error) {
            // Skip "duplicate column" errors (column already exists)
            if (error.message.includes('duplicate column name')) {
              console.log(`   ⚠️  Column already exists, skipping: ${error.message}`);
            } else {
              throw error;
            }
          }
        }

        // Record migration as applied
        this.db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run(migrationFile);
      });

      applyMigration();
      console.log(`   ✅ Migration applied successfully`);
      return true;
    } catch (error) {
      console.error(`   ❌ Migration failed: ${error.message}`);
      throw error;
    }
  }

  migrate() {
    const pendingMigrations = this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('\n✅ No pending migrations. Database is up to date.');
      return;
    }

    console.log(`\n🔄 Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach(m => console.log(`   - ${m}`));

    for (const migration of pendingMigrations) {
      this.applyMigration(migration);
    }

    console.log(`\n✅ All migrations applied successfully!\n`);
  }

  rollback(migrationName) {
    console.log(`\n⚠️  Rollback not implemented yet. Migration: ${migrationName}`);
    console.log('Please manually revert the changes if needed.\n');
  }

  status() {
    const applied = this.getAppliedMigrations();
    const pending = this.getPendingMigrations();

    console.log('\n📊 Migration Status:');
    console.log('='.repeat(50));

    if (applied.length > 0) {
      console.log(`\n✅ Applied Migrations (${applied.length}):`);
      applied.forEach(m => console.log(`   - ${m}`));
    }

    if (pending.length > 0) {
      console.log(`\n⏳ Pending Migrations (${pending.length}):`);
      pending.forEach(m => console.log(`   - ${m}`));
    }

    if (applied.length === 0 && pending.length === 0) {
      console.log('\n   No migrations found.');
    }

    console.log('');
  }

  close() {
    this.db.close();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'migrate';
  const migrator = new DatabaseMigrator(DB_PATH);

  try {
    switch (command) {
      case 'migrate':
        migrator.migrate();
        break;
      case 'status':
        migrator.status();
        break;
      case 'rollback':
        const migrationName = process.argv[3];
        if (!migrationName) {
          console.error('❌ Please specify migration name to rollback');
          process.exit(1);
        }
        migrator.rollback(migrationName);
        break;
      default:
        console.log('Usage: node migrate.js [migrate|status|rollback]');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  } finally {
    migrator.close();
  }
}

export { DatabaseMigrator };
