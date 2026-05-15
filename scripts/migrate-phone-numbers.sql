-- 名片多手机号支持
ALTER TABLE public_profiles ADD COLUMN phone_numbers JSON AFTER fields;
