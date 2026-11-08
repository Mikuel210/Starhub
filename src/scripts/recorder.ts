import type { DataPacket } from "./connection";

const request = window.indexedDB.open("telemetry", 1);
let db: IDBDatabase | undefined;

request.onerror = function (e) {
  console.error(`Can't open database: ${e}`);
};

request.onupgradeneeded = function (e) {
  const db = request.result;

  for (const name of ["packets", "logs"]) {
    if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
    db.createObjectStore(name, { autoIncrement: true });
  }
};

request.onsuccess = function (e) {
  db = request.result;
};

function recordPacket(packet: DataPacket) {
  if (!db) return;

  const transaction = db.transaction("packets", "readwrite");
  const store = transaction.objectStore("packets");

  store.put({ timestamp: Date.now(), ...packet });
}

function recordLog(log: string) {
  if (!db) return;

  const transaction = db.transaction("logs", "readwrite");
  const store = transaction.objectStore("logs");

  store.put({ timestamp: Date.now(), log });
}

const downloadLink = document.getElementById("a-download") as HTMLAnchorElement;
let missionName: string;

function prepareDownload() {
  if (!db) return;

  const transaction = db.transaction(["packets", "logs"], "readonly");
  const packets = transaction.objectStore("packets").getAll();
  const logs = transaction.objectStore("logs").getAll();

  transaction.oncomplete = function () {
    const data = {
      packets: packets.result,
      logs: logs.result,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    downloadLink.className = "";
    downloadLink.href = url;
    downloadLink.download = `${missionName}.json`;
  };
}

function configureMission(name: string) {
  if (!db) return;

  downloadLink.className = "disabled";
  missionName = name;

  const transaction = db.transaction(["packets", "logs"], "readwrite");
  transaction.objectStore("packets").clear();
  transaction.objectStore("logs").clear();
}

// Exports
export { recordPacket, recordLog, prepareDownload, configureMission };
