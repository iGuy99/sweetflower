-- Seed: Zara 7. Rođendan pozivnica
-- Pokrenuti: mysql -u <user> -p <dbname> < db/migrations/002_seed_zara.sql

INSERT INTO invitations (
  slug,
  bride_name,
  groom_name,
  wedding_date,
  wedding_venue,
  component_name,
  admin_username,
  admin_password,
  show_phone,
  show_guest_count,
  show_allergies,
  show_song_request,
  show_message,
  is_active
) VALUES (
  'ZaraRodjendan',
  'Zara',
  '',
  '2026-04-29',
  'B&G Caffe & Restaurant Breza',
  'ZaraRodjendan',
  'zara',
  '$2a$10$placeholder',
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  TRUE
);
