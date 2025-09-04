const { ApolloServer } = require("apollo-server");
const { readFileSync } = require("fs");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { GraphQLJSONObject } = require("graphql-type-json");

// NeonDB connection
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_7k5FKtMwqXJe@ep-small-pond-a921tepl-pooler.gwc.azure.neon.tech/explorafit-database?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

// GraphQL schema
const typeDefs = readFileSync("./schema.graphql", "utf8");

// Helper: map DB user → GraphQL user
const mapUser = (row) => ({
  id: row.id,
  email: row.email,
  isPremium: row.is_premium,
  credits: row.credits,
});

// Helper: map DB route → GraphQL route
const mapRoute = (row) => ({
  id: row.id,
  name: row.name,
  difficulty: row.difficulty,
  distance: row.distance,
  city: row.city,
  created_at: row.created_at.toISOString(),
});

// Resolvers
const resolvers = {
  JSONB: GraphQLJSONObject, // 👈 custom scalar

  Query: {
    ping: () => "Pong",
    getUserRoutes: async (_, __, context) => {
      const { userId } = context;
      if (!userId) throw new Error("Unauthorized");

      try {
        const { rows } = await pool.query(
          `SELECT id, name, difficulty, distance, city, created_at 
           FROM routes 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );
        return rows.map(mapRoute);
      } catch (error) {
        throw new Error(`Failed to fetch routes: ${error.message}`);
      }
    },
  },

  Mutation: {
    signup: async (_, { email, password }) => {
      try {
        const { rows: existing } = await pool.query(
          "SELECT id FROM users WHERE email = $1",
          [email]
        );
        if (existing.length > 0) throw new Error("Email already registered");

        const passwordHash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
          `INSERT INTO users(email, password_hash, is_premium, credits) 
           VALUES($1, $2, $3, $4) 
           RETURNING id, email, is_premium, credits`,
          [email, passwordHash, false, 3]
        );

        const user = mapUser(rows[0]);
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || "supersecretfallback",
          { expiresIn: "7d" }
        );

        return { token, user };
      } catch (error) {
        throw new Error(`Signup failed: ${error.message}`);
      }
    },

    login: async (_, { email, password }) => {
      try {
        const { rows } = await pool.query(
          `SELECT id, email, is_premium, credits, password_hash 
           FROM users 
           WHERE email = $1`,
          [email]
        );
        if (!rows[0]) throw new Error("User not found");

        const valid = await bcrypt.compare(password, rows[0].password_hash);
        if (!valid) throw new Error("Invalid password");

        const user = mapUser(rows[0]);
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || "supersecretfallback",
          { expiresIn: "7d" }
        );

        return { token, user };
      } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
      }
    },

    createRoute: async (_, args, context) => {
      const { userId } = context;
      if (!userId) throw new Error("Unauthorized");

      try {
        // Fetch user credits
        const {
          rows: [userRow],
        } = await pool.query(
          "SELECT is_premium, credits FROM users WHERE id = $1",
          [userId]
        );
        if (!userRow) throw new Error("User not found");

        if (!userRow.is_premium && userRow.credits <= 0)
          throw new Error("Insufficient credits");

        // Deduct credit if not premium
        let newCredits = userRow.credits;
        if (!userRow.is_premium) {
          newCredits -= 1;
          await pool.query("UPDATE users SET credits = $1 WHERE id = $2", [
            newCredits,
            userId,
          ]);
        }

        // Insert route
        const {
          rows: [routeRow],
        } = await pool.query(
          `INSERT INTO routes(user_id, name, difficulty, description, landmarks, distance, city, polyline) 
           VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING id, name, difficulty, distance, city, created_at`,
          [
            userId,
            args.name,
            args.difficulty,
            args.description,
            args.landmarks,
            args.distance,
            args.city,
            args.polyline,
          ]
        );

        const route = mapRoute(routeRow);

        // Get updated user
        const {
          rows: [updatedUserRow],
        } = await pool.query(
          "SELECT id, email, is_premium, credits FROM users WHERE id = $1",
          [userId]
        );
        const updatedUser = mapUser(updatedUserRow);

        return { route, user: updatedUser };
      } catch (error) {
        throw new Error(`Create route failed: ${error.message}`);
      }
    },
  },
};

// Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: false, // 👈 prevent DoS risk
  context: ({ req }) => {
    const token = req.headers.authorization || "";
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "supersecretfallback"
        );
        userId = decoded.userId;
      } catch {
        console.log("Invalid token");
      }
    }
    return { pool, userId };
  },
});

// Enable CORS for frontend
server
  .listen({
    port: process.env.PORT || 4000,
    cors: {
      origin: ["http://localhost:3000", "https://explorafit.vercel.app"],
      credentials: true,
    },
  })
  .then(({ url }) => console.log(`🚀 Server ready at ${url}`));
