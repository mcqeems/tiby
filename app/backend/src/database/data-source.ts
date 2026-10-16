import "reflect-metadata";
import { DataSource } from "typeorm";
import { entities } from "./entities.js";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password_rahasia@localhost:5432/tiby";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV === "development" ? ["error", "warn"] : false,
  entities,
  migrations: ["dist/database/migrations/*.js"],
  subscribers: [],
});
