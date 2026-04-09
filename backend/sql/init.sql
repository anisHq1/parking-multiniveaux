-- USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  plate TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FLOORS
CREATE TABLE IF NOT EXISTS floors (
  id SERIAL PRIMARY KEY,
  floor_number INT NOT NULL UNIQUE
);

-- SPOTS
CREATE TABLE IF NOT EXISTS spots (
  id SERIAL PRIMARY KEY,
  floor_id INT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  spot_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied')),
  UNIQUE(floor_id, spot_number)
);

-- RESERVATIONS
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  spot_id INT NOT NULL REFERENCES spots(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  price_estimated NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LOGS
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  spot_id INT NOT NULL REFERENCES spots(id),
  reservation_id INT REFERENCES reservations(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('entry','exit')),
  action_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed floors (1..4)
INSERT INTO floors (floor_number)
SELECT gs FROM generate_series(1,4) gs
ON CONFLICT (floor_number) DO NOTHING;

-- Seed spots: 25 par étage
INSERT INTO spots (floor_id, spot_number, status)
SELECT f.id, s.spot_number, 'free'
FROM floors f
CROSS JOIN (SELECT generate_series(1,25) AS spot_number) s
ON CONFLICT (floor_id, spot_number) DO NOTHING;