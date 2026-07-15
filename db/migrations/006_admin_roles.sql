-- Role za admine: 'super' upravlja adminima, 'admin' sve ostalo.
ALTER TABLE admins ADD COLUMN role ENUM('super','admin') NOT NULL DEFAULT 'admin';
-- Postojeći (jedini) nalog postaje superadmin.
UPDATE admins SET role = 'super';
