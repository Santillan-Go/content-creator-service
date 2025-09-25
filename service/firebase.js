import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Read and parse the JSON file
// const serviceAccount = JSON.parse(
//   await readFile(join(__dirname, "./credentials/serviceAccountKey.json"))
// );

console.log(
  "FIREBASE_SERVICE_ACCOUNT:",
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY
);
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

export { db };
