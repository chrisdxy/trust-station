-- 活动表
CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '发布者ID',
  title VARCHAR(255) NOT NULL COMMENT '活动标题',
  description TEXT COMMENT '活动描述（富文本）',
  activity_type VARCHAR(50) DEFAULT NULL COMMENT '活动类型',
  location VARCHAR(500) DEFAULT NULL COMMENT '活动地点',
  start_time DATETIME DEFAULT NULL COMMENT '开始时间',
  end_time DATETIME DEFAULT NULL COMMENT '结束时间',
  max_participants INT DEFAULT NULL COMMENT '人数上限',
  current_participants INT DEFAULT 0 COMMENT '当前报名人数',
  organizer_id VARCHAR(36) DEFAULT NULL COMMENT '指定组织者ID',
  cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图',
  status ENUM('upcoming','ongoing','completed','cancelled') DEFAULT 'upcoming' COMMENT '活动状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  INDEX idx_organizer_id (organizer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动表';

-- 活动报名表
CREATE TABLE IF NOT EXISTS activity_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL COMMENT '活动ID',
  user_id VARCHAR(36) NOT NULL COMMENT '报名用户ID',
  status ENUM('registered','cancelled') DEFAULT 'registered' COMMENT '报名状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_activity_user (activity_id, user_id),
  INDEX idx_activity_id (activity_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动报名表';
