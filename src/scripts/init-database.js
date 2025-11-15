const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');

    // Read SQL file
    const sqlFile = path.join(__dirname, '../config/init-db.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await pool.execute(statement);
    }

    console.log('✅ Database initialized successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initDatabase();

