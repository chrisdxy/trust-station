-- 迁移：添加projects表缺失字段
-- 执行前请确保备份数据库

-- 添加 location 和 industry 字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT '' COMMENT '项目地点' AFTER requirements;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry VARCHAR(100) DEFAULT '' COMMENT '所属行业' AFTER location;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS images JSON DEFAULT NULL COMMENT '项目图片列表' AFTER industry;

-- 修改 project_type 字段名（如果需要）
-- ALTER TABLE projects CHANGE COLUMN type project_type VARCHAR(100) DEFAULT '';

-- 添加 images 字段（如果images列存在但不是JSON类型）
-- ALTER TABLE projects MODIFY COLUMN images JSON DEFAULT NULL COMMENT '项目图片列表';
