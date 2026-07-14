-- Galerije za svadbe: gosti uploaduju slike/video preko QR linka,
-- fajlovi žive na Hetzner Object Storage, evidencija ovdje.

CREATE TABLE IF NOT EXISTS galleries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,          -- npr. 'amila-emir' (ide na QR)
    title VARCHAR(200) NOT NULL,                -- 'Amila & Emir'
    event_date DATE DEFAULT NULL,
    invitation_id INT DEFAULT NULL,             -- opcionalna veza na pozivnicu
    is_public BOOLEAN DEFAULT FALSE,            -- TRUE = gosti vide galeriju
    couple_password VARCHAR(255) NOT NULL,      -- bcrypt hash, pristup za mladence
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gallery_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gallery_id INT NOT NULL,
    object_key VARCHAR(500) NOT NULL,           -- putanja originala u bucketu
    thumb_key VARCHAR(500) DEFAULT NULL,        -- putanja thumbnaila (klijentski)
    file_name VARCHAR(300) NOT NULL,            -- originalno ime fajla
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    media_type ENUM('image', 'video') NOT NULL,
    uploader_name VARCHAR(200) DEFAULT NULL,    -- opcionalno ime gosta
    status ENUM('uploading', 'ready') NOT NULL DEFAULT 'uploading',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
    INDEX idx_gallery_status (gallery_id, status)
);

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
