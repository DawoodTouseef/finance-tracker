import { SQLDatabase } from "encore.dev/storage/sqldb";

export const financeDB = new SQLDatabase("finance", {
  migrations: "./migrations",
});
