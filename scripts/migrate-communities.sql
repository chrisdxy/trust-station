-- 迁移：添加共同体表新增字段
-- 执行前请确保备份数据库

-- 1. 添加 `is_public` 字段（是否公开）
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS is_public TINYINT(1) DEFAULT 1 COMMENT '是否公开（1=公开，0=私密）',
  ADD COLUMN IF NOT EXISTS is_paid TINYINT(1) DEFAULT 0 COMMENT '是否收费（1=收费，0=免费）',
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100) DEFAULT NULL COMMENT '所属行业',
  ADD COLUMN IF NOT EXISTS images JSON DEFAULT NULL COMMENT '共同体图片列表',
  ADD COLUMN IF NOT EXISTS qr_code VARCHAR(500) DEFAULT NULL COMMENT '共同体二维码';

-- 2. 如果字段已存在但不是正确的类型，可以手动修改：
-- ALTER TABLE communities MODIFY COLUMN is_public TINYINT(1) DEFAULT 1;
-- ALTER TABLE communities MODIFY COLUMN is_paid TINYINT(1) DEFAULT 0;
-- ALTER TABLE communities MODIFY COLUMN industry VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE communities MODIFY COLUMN images JSON DEFAULT NULL;
-- ALTER TABLE communities MODIFY COLUMN qr_code VARCHAR(500) DEFAULT NULL;

-- 3. 为 `community_members` 表添加索引（如果需要）
-- ALTER TABLE community_members ADD INDEX IF NOT EXISTS idx_community_id (community_id);
-- ALTER TABLE community_members ADD INDEX IF NOT EXISTS idx_user_id (user_id);

-- 完成
SELECT 'Migration completed: communities table updated' as status;
