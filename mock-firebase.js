// Mock Firebase SDK using LocalStorage for persistence (No Node.js Server Needed)
console.log("Using LOCAL STORAGE BACKEND (Zero Setup)");

const listeners = new Map();
const DB_NAME = "wifi_portal_db";

// Helper to get data from LocalStorage
function getStoredData() {
    const data = localStorage.getItem(DB_NAME);
    if (!data) {
        // Initial Seed Data
        return {
            users: [
                {
                    id: "admin_seed_abrar",
                    name: "abrar",
                    phone: "03243475400",
                    password: "Wellcom3",
                    role: 1,
                    package: "Owner",
                    balance: "0",
                    createdAt: new Date().toISOString()
                }
            ],
            complaints: []
        };
    }
    return JSON.parse(data);
}

// Helper to save data to LocalStorage
function saveStoredData(data) {
    localStorage.setItem(DB_NAME, JSON.stringify(data));
}

let dbCache = getStoredData();

// Helper to notify listeners of changes
async function notify(collectionPath) {
    if (listeners.has(collectionPath)) {
        const callback = listeners.get(collectionPath);
        const docs = await getDocsDirect(collectionPath);
        callback({
            empty: docs.length === 0,
            forEach: (fn) => docs.forEach(fn),
            docs: docs
        });
    }
}

async function getDocsDirect(path) {
    dbCache = getStoredData(); // Refresh cache before read
    const data = dbCache[path] || [];
    return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(item => ({
        id: item.id,
        data: () => ({
            ...item,
            timestamp: item.timestamp ? { toDate: () => new Date(item.timestamp) } : null
        })
    }));
}

export function initializeApp(config) { return { name: "mock-app" }; }
export function getFirestore(app) { return { type: "mock-db" }; }
export function collection(db, path) { return { path: path }; }

export async function addDoc(coll, data) {
    dbCache = getStoredData();
    const id = "db_" + Date.now();
    const newItem = {
        id: id,
        ...data,
        timestamp: new Date().toISOString()
    };
    if (!dbCache[coll.path]) dbCache[coll.path] = [];
    dbCache[coll.path].push(newItem);
    saveStoredData(dbCache);
    notify(coll.path);
    return { id: id };
}

export function serverTimestamp() { return new Date().toISOString(); }

export function query(coll, ...constraints) {
    return { type: 'query', collection: coll, constraints: constraints, path: coll.path };
}

export function where(field, op, value) { return { type: 'where', field, op, value }; }

export async function getDocs(queryRef) {
    const path = queryRef.path || queryRef.collection.path;
    let docs = await getDocsDirect(path);

    if (queryRef.type === 'query' && queryRef.constraints) {
        queryRef.constraints.forEach(c => {
            if (c.type === 'where') {
                docs = docs.filter(doc => {
                    const data = doc.data();
                    const val = data[c.field];
                    if (c.op === "==") return val == c.value;
                    return true;
                });
            }
        });
    }
    return { empty: docs.length === 0, docs: docs, forEach: (fn) => docs.forEach(fn) };
}

export function orderBy(field, dir) { return { type: "orderBy", field, dir }; }

export async function onSnapshot(queryRef, callback) {
    const path = queryRef.path || queryRef.collection.path;
    listeners.set(path, callback);
    const docs = await getDocsDirect(path);
    callback({ empty: docs.length === 0, forEach: (fn) => docs.forEach(fn), docs: docs });
    return () => listeners.delete(path);
}

export function doc(db, collPath, id) {
    if (arguments.length === 3) return { path: collPath, id: id };
    return { path: collPath, id: id };
}

export async function setDoc(docRef, data, options = {}) {
    dbCache = getStoredData();
    const path = docRef.path;
    if (!dbCache[path]) dbCache[path] = [];

    const index = dbCache[path].findIndex(i => i.id === docRef.id);
    const newItem = { id: docRef.id, ...data, timestamp: data.timestamp || new Date().toISOString() };

    if (index !== -1) {
        if (options.merge) { dbCache[path][index] = { ...dbCache[path][index], ...data }; }
        else { dbCache[path][index] = newItem; }
    } else {
        dbCache[path].push(newItem);
    }
    saveStoredData(dbCache);
    notify(path);
}

export async function updateDoc(docRef, data) {
    dbCache = getStoredData();
    const path = docRef.path;
    if (!dbCache[path]) throw new Error("Collection not found " + path);
    const index = dbCache[path].findIndex(i => i.id === docRef.id);
    if (index === -1) throw new Error("Document not found " + docRef.id);
    dbCache[path][index] = { ...dbCache[path][index], ...data };
    saveStoredData(dbCache);
    notify(path);
}

export async function deleteDoc(docRef) {
    dbCache = getStoredData();
    const path = docRef.path;
    if (!dbCache[path]) return;
    dbCache[path] = dbCache[path].filter(i => i.id !== docRef.id);
    saveStoredData(dbCache);
    notify(path);
}
