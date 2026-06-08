ALTER TABLE communities ADD COLUMN sort_order INT DEFAULT 0 AFTER status;
ALTER TABLE communities ADD COLUMN is_pinned TINYINT(1) DEFAULT 0 AFTER sort_order;

ALTER TABLE activities ADD COLUMN sort_order INT DEFAULT 0 AFTER status;
ALTER TABLE activities ADD COLUMN is_pinned TINYINT(1) DEFAULT 0 AFTER sort_order;

ALTER TABLE projects ADD COLUMN sort_order INT DEFAULT 0 AFTER status;
ALTER TABLE projects ADD COLUMN is_pinned TINYINT(1) DEFAULT 0 AFTER sort_order;
