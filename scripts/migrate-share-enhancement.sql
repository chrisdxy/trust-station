-- =====================================================
-- 分享功能增强：支持带身份信息的分享和上下线关系追踪
-- =====================================================

-- 1. 为 share_links 表添加分享者信息字段（如果不存在）
-- 注意：如果表已存在且有 user_id 字段，可能需要添加 invite_code 列
-- ALTER TABLE share_links ADD COLUMN invite_code VARCHAR(20) AFTER user_id;

-- 2. 为 share_clicks 表添加分享者信息字段
ALTER TABLE share_clicks ADD COLUMN inviter_id VARCHAR(255) AFTER visitor_id;
ALTER TABLE share_clicks ADD COLUMN relationship_established TINYINT(1) DEFAULT 0 AFTER inviter_id;

-- 3. 创建上下线关系表（如果不存在）
-- relationships 表用于存储用户之间的关系
-- 注意：如果你已有 relationships 表，需要检查是否有 type 和 source 字段

-- =====================================================
-- 示例：relationships 表结构
-- CREATE TABLE IF NOT EXISTS relationships (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id VARCHAR(255) NOT NULL COMMENT '用户ID',
--   partner_id VARCHAR(255) NOT NULL COMMENT '关联用户ID',
--   type ENUM('friend', 'follow', 'invite', 'follower', 'blocked') DEFAULT 'friend' COMMENT '关系类型',
--   status ENUM('active', 'pending', 'rejected') DEFAULT 'active' COMMENT '关系状态',
--   source VARCHAR(50) DEFAULT NULL COMMENT '来源：share_link, invite_code, manual',
--   share_code VARCHAR(32) DEFAULT NULL COMMENT '关联的分享码',
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   INDEX idx_user_partner (user_id, partner_id),
--   INDEX idx_type (type),
--   INDEX idx_share_code (share_code)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户关系表';
-- =====================================================
