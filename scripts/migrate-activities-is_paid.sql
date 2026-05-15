-- 活动表添加收费字段
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS is_paid TINYINT(1) DEFAULT 0 COMMENT '是否收费活动';
