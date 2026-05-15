-- 为 projects 表添加封面图片字段
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图' AFTER description;
