import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import { AuthStore } from "../auth.js";

if (existsSync(".env")) process.loadEnvFile(".env");

/** Creates or replaces the console operator. Usage: npm run operator -- tu@correo.com */
const email = process.argv[2];
if (!email || !email.includes("@")) { console.error("Uso: npm run operator -- tu@correo.com"); process.exit(1); }
const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("Nueva contraseña (mínimo 8): ", (pw) => {
  rl.close();
  try {
    new AuthStore(process.env.DATA_DIR ?? "./data").setOperator(email, pw.trim());
    console.log(`Operador ${email} guardado en el Droplet.`);
  } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
});
