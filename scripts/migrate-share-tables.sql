-- 分享链接表
CREATE TABLE IF NOT EXISTS share_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  target_type ENUM('project', 'activity', 'community', 'card') NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  share_code VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(255),
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_share_code (share_code),
  INDEX idx_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 分享点击记录表
CREATE TABLE IF NOT EXISTS share_clicks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  share_code VARCHAR(32) NOT NULL,
  visitor_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer VARCHAR(500),
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_share_code (share_code),
  INDEX idx_clicked_at (clicked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
