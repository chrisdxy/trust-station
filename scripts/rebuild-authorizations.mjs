import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'sh-cdb-q2ni6fog.sql.tencentcdb.com',
  port: 20211,
  user: 'root',
  password: 'Dd123456@',
  database: 'trust_station'
};

async function rebuildAuthorizationsTable() {
  const conn = await mysql.createConnection(dbConfig);
  
  try {
    console.log('开始重建 authorizations 表...');
    
    // 1. 删除旧表
    console.log('1. 删除旧表...');
    await conn.execute('DROP TABLE IF EXISTS authorizations');
    console.log('   旧表已删除');
    
    // 2. 创建新表
    console.log('2. 创建新表...');
    await conn.execute(`
      CREATE TABLE authorizations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(50) NOT NULL COMMENT '授权人ID',
        grantee_id VARCHAR(50) NOT NULL COMMENT '被授权人ID',
        grantee_email VARCHAR(255) COMMENT '被授权人邮箱',
        grantee_name VARCHAR(100) COMMENT '被授权人姓名',
        relationship_id INT COMMENT '关系ID',
        scope VARCHAR(50) DEFAULT 'view' COMMENT '授权范围',
        description TEXT COMMENT '授权说明',
        expiry_date DATE COMMENT '过期日期',
        authorized_record_id INT COMMENT '授权的记录ID',
        status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_grantee (grantee_id),
        INDEX idx_record (authorized_record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   新表已创建');
    
    // 3. 验证新结构
    console.log('\n3. 验证新表结构:');
    const [rows] = await conn.execute('DESCRIBE authorizations');
    console.table(rows);
    
    console.log('\n✅ authorizations 表重建成功！');
    
  } catch (error) {
    console.error('❌ 重建失败:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

rebuildAuthorizationsTable().catch(console.error);
