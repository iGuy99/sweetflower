CREATE TABLE IF NOT EXISTS invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    bride_name VARCHAR(100) NOT NULL,
    groom_name VARCHAR(100) NOT NULL,
    wedding_date DATE,
    wedding_venue VARCHAR(255),
    component_name VARCHAR(100) NOT NULL,
    admin_username VARCHAR(100) NOT NULL,
    admin_password VARCHAR(255) NOT NULL,
    show_phone BOOLEAN DEFAULT TRUE,
    show_guest_count BOOLEAN DEFAULT TRUE,
    show_allergies BOOLEAN DEFAULT TRUE,
    show_song_request BOOLEAN DEFAULT TRUE,
    show_message BOOLEAN DEFAULT TRUE,
    custom_fields JSON DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rsvp_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invitation_id INT NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    attending BOOLEAN NOT NULL,
    guest_count INT DEFAULT 1,
    gluten_free BOOLEAN DEFAULT FALSE,
    lactose_free BOOLEAN DEFAULT FALSE,
    vegetarian BOOLEAN DEFAULT FALSE,
    vegan BOOLEAN DEFAULT FALSE,
    nut_allergy BOOLEAN DEFAULT FALSE,
    seafood_allergy BOOLEAN DEFAULT FALSE,
    other_allergies TEXT DEFAULT NULL,
    song_request VARCHAR(255) DEFAULT NULL,
    message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);
