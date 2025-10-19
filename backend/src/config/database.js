const mysql = require('mysql2/promise');

// 为Serverless环境优化的连接配置
const poolConfig = {
  host: process.env.DB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER || '3weSfx6NGnayDMr.root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'test',
  waitForConnections: true,
  connectionLimit: 1, // Serverless环境使用单连接
  maxIdle: 1,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000, // 10秒连接超时
  // SSL disabled for testing
  // ssl: {
  //   rejectUnauthorized: false
  // }
};

console.log('Database config:', {
  host: poolConfig.host,
  port: poolConfig.port,
  user: poolConfig.user,
  database: poolConfig.database,
  hasPassword: !!poolConfig.password
});

const pool = mysql.createPool(poolConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection };

