import Database from "better-sqlite3";
import { applySchema } from "@/lib/db/schema/apply";

const database = new Database(process.env.DATABASE_PATH ?? "./data/matcha.db");
database.pragma("foreign_keys = ON");
applySchema(database);
console.log("user_version", database.pragma("user_version", { simple: true }));
