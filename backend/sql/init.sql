-- =====================================================
-- ParkFlow — Schéma PostgreSQL complet
-- Exécuter : psql -U postgres -d parking_db -f init.sql
-- =====================================================

-- Extension UUID (optionnel)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Table users ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  prenom        VARCHAR(100) NOT NULL,
  nom           VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  telephone     VARCHAR(25),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'user'
                  CHECK (role IN ('admin','user')),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── Table vehicles ───────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
  license_plate     VARCHAR(20) UNIQUE NOT NULL,
  brand             VARCHAR(100) NOT NULL,
  model             VARCHAR(100) NOT NULL,
  color             VARCHAR(60)  NOT NULL,
  subscription_type VARCHAR(20) NOT NULL DEFAULT 'none'
                      CHECK (subscription_type IN ('none','mensuel','annuel')),
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ── Table parking_spots ──────────────────────────────
CREATE TABLE IF NOT EXISTS parking_spots (
  id          SERIAL PRIMARY KEY,
  floor       INTEGER NOT NULL CHECK (floor BETWEEN 1 AND 4),
  spot_number INTEGER NOT NULL CHECK (spot_number BETWEEN 1 AND 25),
  zone        VARCHAR(5) NOT NULL,
  spot_type   VARCHAR(20) NOT NULL DEFAULT 'standard'
                CHECK (spot_type IN ('standard','vip','handicap','electrique')),
  status      VARCHAR(20) NOT NULL DEFAULT 'libre'
                CHECK (status IN ('libre','occupee','reservee','maintenance')),
  UNIQUE (floor, spot_number)
);

-- ── Table sessions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id               SERIAL PRIMARY KEY,
  vehicle_id       INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  spot_id          INTEGER REFERENCES parking_spots(id),
  entry_time       TIMESTAMP NOT NULL DEFAULT NOW(),
  exit_time        TIMESTAMP,
  planned_duration INTEGER   NOT NULL DEFAULT 2,   -- heures prévues
  amount           NUMERIC(10,2),
  status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','completed','cancelled')),
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (payment_status IN ('pending','paid','cancelled'))
);

-- ── Table reservations ───────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id         SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  spot_id    INTEGER REFERENCES parking_spots(id),
  start_time TIMESTAMP NOT NULL,
  end_time   TIMESTAMP NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','cancelled','completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SEED : Générer les 100 places (4 étages × 25)
-- =====================================================
DO $$
DECLARE
  f INT; s INT;
  z VARCHAR(5); t VARCHAR(20);
BEGIN
  FOR f IN 1..4 LOOP
    FOR s IN 1..25 LOOP
      -- Zone : A=1-5, B=6-10, C=11-15, D=16-20, E=21-25
      z := CASE
        WHEN s <= 5  THEN 'A'
        WHEN s <= 10 THEN 'B'
        WHEN s <= 15 THEN 'C'
        WHEN s <= 20 THEN 'D'
        ELSE 'E'
      END;
      -- Type spécial pour quelques places
      t := CASE
        WHEN s % 7  = 0 THEN 'vip'
        WHEN s % 5  = 0 THEN 'handicap'
        WHEN s % 11 = 0 THEN 'electrique'
        ELSE 'standard'
      END;
      INSERT INTO parking_spots (floor, spot_number, zone, spot_type, status)
      VALUES (f, s, z, t, 'libre')
      ON CONFLICT (floor, spot_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- SEED : Admin par défaut  (mot de passe : admin123)
-- Hash bcrypt généré avec saltRounds=10
-- =====================================================
INSERT INTO users (prenom, nom, email, telephone, password_hash, role)
VALUES (
  'Admin', 'ParkFlow',
  'admin@parkflow.com',
  '514-000-0000',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWC',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- Index pour performances
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sessions_vehicle  ON sessions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sessions_spot     ON sessions(spot_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status   ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate    ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_user     ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_spots_floor       ON parking_spots(floor);
CREATE INDEX IF NOT EXISTS idx_spots_status      ON parking_spots(status);
