-- 项目沟通区消息表
CREATE TABLE IF NOT EXISTS project_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL COMMENT '项目ID',
  sender_id VARCHAR(100) NOT NULL COMMENT '发送者用户ID',
  content TEXT NOT NULL COMMENT '消息内容',
  is_from_creator TINYINT(1) DEFAULT 0 COMMENT '是否创建者回复',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_project (project_id),
  INDEX idx_sender (sender_id),
  INDEX idx_project_sender (project_id, sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目沟通区消息';
