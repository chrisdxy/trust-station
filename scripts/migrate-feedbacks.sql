-- 投诉与建议表
CREATE TABLE IF NOT EXISTS feedbacks (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL COMMENT '提交用户ID',
  user_name VARCHAR(100) DEFAULT '' COMMENT '提交用户姓名',
  type ENUM('complaint', 'suggestion') NOT NULL COMMENT '类型：投诉/建议',
  content TEXT NOT NULL COMMENT '内容',
  status ENUM('pending', 'read', 'resolved') DEFAULT 'pending' COMMENT '状态',
  admin_reply TEXT DEFAULT NULL COMMENT '管理员回复',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投诉与建议';
