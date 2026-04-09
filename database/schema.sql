-- Supprimer la base si elle existe déjà (optionnel, attention)
-- DROP DATABASE IF EXISTS parkflow_db;

-- Créer la base
CREATE DATABASE parkflow_db;

-- Se connecter à la base
\c parkflow_db;

-- Table users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table vehicles
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(100),
    color VARCHAR(50),
    subscription_type VARCHAR(20) DEFAULT 'none',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table floors (étages)
CREATE TABLE floors (
    id SERIAL PRIMARY KEY,
    floor_number INTEGER NOT NULL,
    total_spaces INTEGER NOT NULL
);

-- Table parking_spots (places)
CREATE TABLE parking_spots (
    id SERIAL PRIMARY KEY,
    spot_number VARCHAR(10) NOT NULL,
    floor_id INTEGER REFERENCES floors(id),
    zone VARCHAR(10),
    spot_type VARCHAR(20) DEFAULT 'standard',
    status VARCHAR(20) DEFAULT 'free'
);

-- Table reservations
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    vehicle_id INTEGER REFERENCES vehicles(id),
    parking_spot_id INTEGER REFERENCES parking_spots(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table parking_sessions
CREATE TABLE parking_sessions (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id),
    parking_spot_id INTEGER REFERENCES parking_spots(id),
    entry_time TIMESTAMP DEFAULT NOW(),
    exit_time TIMESTAMP,
    amount DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending'
);

-- Table pricing (corrigée)
CREATE TABLE pricing (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price_per_hour DECIMAL(10,2),
    applies_from TIMESTAMP,
    applies_to TIMESTAMP
);

-- Insertion des étages (4 étages, 25 places chacun)
INSERT INTO floors (floor_number, total_spaces) VALUES
(1, 25),
(2, 25),
(3, 25),
(4, 25);

-- Insertion des places pour chaque étage (PL/pgSQL)
DO $$
DECLARE
    f RECORD;
    i INTEGER;
    zone_letter CHAR(1);
    spot_num TEXT;
BEGIN
    FOR f IN SELECT id, floor_number FROM floors LOOP
        zone_letter := CHR(64 + f.floor_number); -- A, B, C, D
        FOR i IN 1..25 LOOP
            spot_num := zone_letter || '-' || LPAD(i::TEXT, 2, '0');
            INSERT INTO parking_spots (spot_number, floor_id, zone, spot_type, status)
            VALUES (spot_num, f.id, 'Zone ' || zone_letter, 'standard', 'free');
        END LOOP;
    END LOOP;
END $$;

-- Insertion d'un tarif par défaut
INSERT INTO pricing (name, price_per_hour, applies_from, applies_to)
VALUES ('Tarif standard', 5.00, '2024-01-01', '2030-12-31');