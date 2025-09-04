const { ApolloServer } = require("apollo-server");
const { readFileSync } = require("fs");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
});

// Resolvers
const resolvers = {
  Query: {
    ping: () => "Pong", // Test endpoint
  },
  Mutation: {
    signup: async (_, { email, password }) => {
      try {
        // check existing user
        const { rows: existing } = await pool.query(
          "SELECT id FROM users WHERE email = $1",
          [email]
        );
        if (existing.length > 0) throw new Error("Email already registered");

        // hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // insert new user
        const { rows } = await pool.query(
          "INSERT INTO users(email, password_hash, is_premium) VALUES($1, $2, $3) RETURNING id, email, is_premium",
          [email, passwordHash, false]
        );

        const user = mapUser(rows[0]);

        // sign JWT
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET ||
            "30dfb2a4a8840222dc34b4041f1eebdd07d57b9e5f3f14baed1108340c10b02d10e752b5a9f6dd457bbe1383f779eca4295b2f0974b596d1bd3f4956c9eda8ef",
          { expiresIn: "7d" }
        );

        return { token, user };
      } catch (error) {
        throw new Error(`Signup failed: ${error.message}`);
      }
    },

    login: async (_, { email, password }) => {
      try {
        // find user
        const { rows } = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );
        if (!rows[0]) throw new Error("User not found");

        // verify password
        const valid = await bcrypt.compare(password, rows[0].password_hash);
        if (!valid) throw new Error("Invalid password");

        const user = mapUser(rows[0]);

        // sign JWT
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET ||
            "30dfb2a4a8840222dc34b4041f1eebdd07d57b9e5f3f14baed1108340c10b02d10e752b5a9f6dd457bbe1383f779eca4295b2f0974b596d1bd3f4956c9eda8ef",
          { expiresIn: "7d" }
        );

        return { token, user };
      } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ pool }),
});

// Enable CORS for frontend (change origin to your frontend URL)
server
  .listen({
    port: process.env.PORT || 4000,
    cors: {
      origin: [
        "http://localhost:3000", // local dev frontend
        "https://explorafit.vercel.app", // deployed frontend
      ],
      credentials: true,
    },
  })
  .then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
