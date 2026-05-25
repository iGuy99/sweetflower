-- Seed: Amar 1. Rođendan pozivnica
-- Pokrenuti: mysql -u <user> -p <dbname> < db/migrations/003_seed_amar.sql

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
  'AmarRodjendan',
  'Amar',
  '',
  '2026-05-31',
  'Dedina Luka',
  'AmarRodjendan',
  'Amar',
  '$2b$10$RhlAXGE8Nett5eYnLT2CXOyodf6/YUK6d08rfYBErWsfhY946Hp1C',
  FALSE,
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  TRUE
);
