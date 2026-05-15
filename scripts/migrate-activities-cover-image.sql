-- 活动表添加/确认封面图和收费字段
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图' AFTER organizer_id,
  ADD COLUMN IF NOT EXISTS is_paid TINYINT(1) DEFAULT 0 COMMENT '是否收费活动' AFTER cover_image;
