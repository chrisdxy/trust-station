-- 活动表添加收费金额字段
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2) DEFAULT NULL COMMENT '收费金额（元）' AFTER is_paid;
