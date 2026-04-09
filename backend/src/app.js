const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const auth = require("./middleware/auth");

console.log("app.js chargé");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
async function initParking() {
  // crée 4 étages si absent
  const floors = await pool.query("SELECT id, floor_number FROM floors ORDER BY floor_number ASC");
  if (floors.rows.length === 0) {
    for (let f = 1; f <= 4; f++) {
      await pool.query("INSERT INTO floors (floor_number) VALUES ($1)", [f]);
    }
  }

  // recharge floors (avec ids)
  const floors2 = await pool.query("SELECT id, floor_number FROM floors ORDER BY floor_number ASC");

  // pour chaque étage, créer 25 places si elles n’existent pas
  for (const fl of floors2.rows) {
    const count = await pool.query("SELECT COUNT(*)::int AS c FROM spots WHERE floor_id = $1", [fl.id]);
    if (count.rows[0].c < 25) {
      // on ajoute les places manquantes de 1 à 25
      for (let s = 1; s <= 25; s++) {
        await pool.query(
          `INSERT INTO spots (floor_id, spot_number, status)
           VALUES ($1, $2, 'free')
           ON CONFLICT DO NOTHING`,
          [fl.id, s]
        );
      }
    }
  }

  console.log("✅ Parking initialisé: 4 étages x 25 places");
}

// lance au démarrage
initParking().catch((e) => console.error("initParking error:", e));
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès admin requis" });
  }
  next();
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Backend v2 actif " });
});

/* =========================
   REGISTER
========================= */
app.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, phone, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    // Vérifier si email existe déjà
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email`,
      [first_name, last_name, phone, email, hashedPassword]
    );

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur REGISTER:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* =========================
   LOGIN
========================= */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    const result = await pool.query(
      "SELECT id, first_name, last_name, email, password_hash, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email ou mot de passe invalide" });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ message: "Email ou mot de passe invalide" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Erreur LOGIN:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* =========================
   ROUTE PROTÉGÉE
========================= */
app.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM users WHERE id = $1",
      [req.user.id]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Erreur /me:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// Ajouter un véhicule (protégé)
app.post("/vehicles", auth, async (req, res) => {
  try {
    const { model, color, plate } = req.body;
    if (!model || !color || !plate) {
      return res.status(400).json({ message: "Champs manquants (model, color, plate)" });
    }

    const result = await pool.query(
      `INSERT INTO vehicles (user_id, model, color, plate)
       VALUES ($1, $2, $3, $4)
       RETURNING id, model, color, plate`,
      [req.user.id, model, color, plate]
    );

    res.status(201).json({ message: "Véhicule ajouté", vehicle: result.rows[0] });
  } catch (error) {
    console.error("Erreur VEHICLES POST:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Mes véhicules (protégé)
app.get("/vehicles", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, model, color, plate, created_at
       FROM vehicles
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur VEHICLES GET:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Supprimer un véhicule (protégé)
app.delete("/vehicles/:id", auth, async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);

    const result = await pool.query(
      `DELETE FROM vehicles
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [vehicleId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }

    res.json({ message: "Véhicule supprimé" });
  } catch (error) {
    console.error("Erreur VEHICLES DELETE:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// util: prix (5$/h)
function estimatePrice(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const minutes = (end - start) / 60000;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = minutes / 60;
  return Math.round(hours * 5 * 100) / 100; // 5$/h
}

// RESERVE (protégé) - attribue une place libre automatiquement
app.post("/reserve", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { vehicle_id, start_time, end_time } = req.body;

    if (!vehicle_id || !start_time || !end_time) {
      return res.status(400).json({ message: "vehicle_id, start_time, end_time requis" });
    }

    const price = estimatePrice(start_time, end_time);
    if (price === null) {
      return res.status(400).json({ message: "Horaire invalide (end_time doit être après start_time)" });
    }

    // Vérifier que le véhicule appartient à l'utilisateur
    const v = await client.query(
      "SELECT id FROM vehicles WHERE id = $1 AND user_id = $2",
      [vehicle_id, req.user.id]
    );
    if (v.rows.length === 0) {
      return res.status(403).json({ message: "Véhicule introuvable ou non autorisé" });
    }

    await client.query("BEGIN");

    // Prendre une place libre en verrouillant (évite double attribution)
    const spotRes = await client.query(
      `SELECT id, spot_number
       FROM spots
       WHERE status = 'free'
       ORDER BY id
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
    );

    if (spotRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Aucune place libre disponible" });
    }

    const spotId = spotRes.rows[0].id;
    const spotNumber = spotRes.rows[0].spot_number;

    // Marquer occupée
    await client.query("UPDATE spots SET status='occupied' WHERE id=$1", [spotId]);

    // Créer réservation
    const r = await client.query(
      `INSERT INTO reservations (vehicle_id, spot_id, start_time, end_time, price_estimated, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, vehicle_id, spot_id, start_time, end_time, price_estimated, status`,
      [vehicle_id, spotId, start_time, end_time, price]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Réservation créée",
      reservation: r.rows[0],
      assigned_spot: spotNumber
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Erreur RESERVE:", error);
    res.status(500).json({ message: "Erreur serveur" });
  } finally {
    client.release();
  }
});

// TERMINER RESERVATION (libérer la place)
// COMPLETE (sortie + terminer réservation + libérer place)
app.post("/reservation/:id/complete", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const reservationId = Number(req.params.id);

    await client.query("BEGIN");

    const reservation = await client.query(
      `SELECT id, spot_id
       FROM reservations
       WHERE id = $1 AND status = 'active'`,
      [reservationId]
    );

    if (reservation.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Réservation introuvable ou déjà terminée" });
    }

    const spotId = reservation.rows[0].spot_id;

    // log sortie
    await client.query(
      `INSERT INTO logs (spot_id, reservation_id, action)
       VALUES ($1, $2, 'exit')`,
      [spotId, reservationId]
    );

    // terminer réservation
    await client.query(
      `UPDATE reservations SET status='completed' WHERE id=$1`,
      [reservationId]
    );

    // libérer place
    await client.query(
      `UPDATE spots SET status='free' WHERE id=$1`,
      [spotId]
    );

    await client.query("COMMIT");

    res.json({ message: "Sortie enregistrée, réservation terminée, place libérée ✅" });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Erreur COMPLETE:", error);
    res.status(500).json({ message: "Erreur serveur" });
  } finally {
    client.release();
  }
});

// ENTRY (simuler entrée voiture)
app.post("/reservation/:id/entry", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const reservationId = Number(req.params.id);

    await client.query("BEGIN");

    const r = await client.query(
      `SELECT id, spot_id, status
       FROM reservations
       WHERE id = $1`,
      [reservationId]
    );

    if (r.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Réservation introuvable" });
    }
    if (r.rows[0].status !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Réservation non active" });
    }

    await client.query(
      `INSERT INTO logs (spot_id, reservation_id, action)
       VALUES ($1, $2, 'entry')`,
      [r.rows[0].spot_id, reservationId]
    );

    await client.query("COMMIT");
    res.json({ message: "Entrée enregistrée ✅" });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Erreur ENTRY:", e);
    res.status(500).json({ message: "Erreur serveur" });
  } finally {
    client.release();
  }
});

// STATS (admin simple)
app.get("/stats", auth, requireAdmin, async (req, res) => {
  
  try {
    const total = await pool.query(`SELECT COUNT(*)::int AS total FROM spots`);
    const free = await pool.query(`SELECT COUNT(*)::int AS free FROM spots WHERE status='free'`);
    const occupied = await pool.query(`SELECT COUNT(*)::int AS occupied FROM spots WHERE status='occupied'`);

    const entriesToday = await pool.query(
      `SELECT COUNT(*)::int AS entries_today
       FROM logs
       WHERE action='entry' AND action_time::date = CURRENT_DATE`
    );

    const exitsToday = await pool.query(
      `SELECT COUNT(*)::int AS exits_today
       FROM logs
       WHERE action='exit' AND action_time::date = CURRENT_DATE`
    );

    const occupancyRate = total.rows[0].total === 0
      ? 0
      : Math.round((occupied.rows[0].occupied / total.rows[0].total) * 100);

    res.json({
      total_spots: total.rows[0].total,
      free_spots: free.rows[0].free,
      occupied_spots: occupied.rows[0].occupied,
      occupancy_rate_percent: occupancyRate,
      entries_today: entriesToday.rows[0].entries_today,
      exits_today: exitsToday.rows[0].exits_today
    });
  } catch (e) {
    console.error("Erreur STATS:", e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// Voir seulement les places OCCUPÉES
app.get("/spots/occupied", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.spot_number, s.status, f.floor_number
       FROM spots s
       JOIN floors f ON f.id = s.floor_id
       WHERE s.status = 'occupied'
       ORDER BY f.floor_number, s.spot_number`
    );
    res.json(result.rows);
  } catch (e) {
    console.error("Erreur /spots/occupied:", e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Voir seulement les places LIBRES
app.get("/spots", auth, requireAdmin, async (req, res) => {
  
  try {
    const result = await pool.query(
      `SELECT s.id, s.spot_number, s.status, f.floor_number
       FROM spots s
       JOIN floors f ON f.id = s.floor_id
       ORDER BY f.floor_number, s.spot_number`
    );
    res.json(result.rows);
  } catch (e) {
    console.error("Erreur /spots:", e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/reservations", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.start_time, r.end_time, r.price_estimated, r.status,
              s.spot_number, f.floor_number,
              v.model, v.color, v.plate
       FROM reservations r
       JOIN vehicles v ON v.id = r.vehicle_id
       JOIN spots s ON s.id = r.spot_id
       JOIN floors f ON f.id = s.floor_id
       WHERE v.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error("Erreur /reservations:", e);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


module.exports = app;
