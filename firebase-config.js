// MOCK CONFIGURATION (For Offline Demo)
import { initializeApp, getFirestore } from "./mock-firebase.js";

const firebaseConfig = {
  apiKey: "demo",
  projectId: "demo"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
