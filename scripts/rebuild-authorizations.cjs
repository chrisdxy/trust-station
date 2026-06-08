const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'sh-cdb-q2ni6fog.sql.tencentcdb.com',
  port: 20211,
  user: 'root',
  password: 'Dd123456@',
  database: 'trust_station',
  connectTimeout: 20000,
  charset: 'utf8mb4_unicode_ci'
};

async function rebuildAuthorizationsTable() {
  console.log('正在连接数据库...');
  const conn = await mysql.createConnection(dbConfig);
  
  try {
    console.log('✓ 数据库连接成功');
    console.log('');
    
    // 1. 删除旧表
    console.log('[1/3] 删除旧表...');
    await conn.execute('DROP TABLE IF EXISTS authorizations');
    console.log('      ✓ 旧表已删除');
    
    // 2. 创建新表
    console.log('[2/3] 创建新表...');
    await conn.execute(`
      CREATE TABLE authorizations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(50) NOT NULL,
        grantee_id VARCHAR(50) NOT NULL,
        grantee_email VARCHAR(255),
        grantee_name VARCHAR(100),
        relationship_id INT,
        scope VARCHAR(50) DEFAULT 'view',
        description TEXT,
        expiry_date DATE,
        authorized_record_id INT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_grantee (grantee_id),
        INDEX idx_record (authorized_record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('      ✓ 新表已创建');
    
    // 3. 验证新结构
    console.log('[3/3] 验证新表结构:');
    const [rows] = await conn.execute('DESCRIBE authorizations');
    console.table(rows);
    
    console.log('');
    console.log('✅ authorizations 表重建成功！');
    console.log('');
    console.log('新表结构说明:');
    console.log('  - user_id: 授权人ID');
    console.log('  - grantee_id: 被授权人ID');
    console.log('  - grantee_email: 被授权人邮箱');
    console.log('  - grantee_name: 被授权人姓名');
    console.log('  - relationship_id: 关系ID');
    console.log('  - scope: 授权范围 (默认: view)');
    console.log('  - description: 授权说明');
    console.log('  - expiry_date: 过期日期');
    console.log('  - authorized_record_id: 授权的记录ID');
    console.log('  - status: 状态 (默认: active)');
    
  } catch (error) {
    console.error('');
    console.error('❌ 错误:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    throw error;
  } finally {
    await conn.end();
    console.log('');
    console.log('数据库连接已关闭');
  }
}

console.log('');
console.log('========================================');
console.log('  重建 authorizations 表');
console.log('========================================');
console.log('');

rebuildAuthorizationsTable().catch(err => {
  console.error('执行失败:', err.message);
  process.exit(1);
});
