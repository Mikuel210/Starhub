import { log } from "./logger.js";

// Packet type
type DataPacket = {
  state: number;
  sensorData: {
    accel_mps2: number[];
    gyro_radps: number[];
    magnetometer: number[];
    distance_cm: number;
    lidarAvailable: boolean;
    voltage1_v: number;
    voltage2_v: number;
  };
  fusionData: {
    orientation_deg: number[];
    altitude_mm: number;
    underVoltage: boolean;
  };
};

// Manage connection
const serviceUuid = "3343f2ee-4910-492a-b29b-181e051a631b";
const commandUuid = "313ce956-bbe0-47bf-8e32-b2c5e3a364ec";
const telemetryUuid = "cf0ce5fe-6f1a-41b4-88b6-1304a50a2776";

let connected = false;
let bleServer: BluetoothRemoteGATTServer;
let commandCharacteristic: BluetoothRemoteGATTCharacteristic;
let telemetryCharacteristic: BluetoothRemoteGATTCharacteristic;
let lastPacket: DataPacket | undefined;

// Connect and disconnect
function connect() {
  if (!navigator.bluetooth) {
    alert("Bluetooth is unsupported in your browser");
    return;
  }

  navigator.bluetooth
    .requestDevice({
      filters: [{ name: "Starkit" }],
      optionalServices: [serviceUuid],
    })
    .then((device) => {
      console.log("Device selected: " + device);
      device.addEventListener("gattserverdisconnected", onDisconnected);

      if (!device.gatt) throw new Error("No GATT server on selected device");
      return device.gatt.connect();
    })
    .then((gattServer) => {
      console.log("Connected to GATT Server");
      bleServer = gattServer;

      return getServiceWithRetry(gattServer, serviceUuid);
    })
    .then((service) => {
      if (!service) return;
      console.log("Service discovered: " + service.uuid);

      return Promise.all([
        service.getCharacteristic(commandUuid),
        service.getCharacteristic(telemetryUuid),
      ]);
    })
    .then((characteristics) => {
      if (!characteristics) return;
      const [command, telemetry] = characteristics;

      console.log("Command characteristic discovered:", command.uuid);
      console.log("Telemetry characteristic discovered:", telemetry.uuid);

      commandCharacteristic = command;
      telemetryCharacteristic = telemetry;

      telemetryCharacteristic.addEventListener(
        "characteristicvaluechanged",
        onCharacteristicChange,
      );

      telemetryCharacteristic.startNotifications();

      connected = true;
      log("Device connected");
      return telemetryCharacteristic.readValue();
    })
    .then((value) => {
      const decodedValue = new TextDecoder().decode(value);
      console.log("Read value: " + value);
      console.log("Decoded value: " + decodedValue);
    })
    .catch((error) => {
      console.log("Error: " + error);
    });
}

function disconnect() {
  if (!bleServer || !bleServer.connected) {
    console.log("Disconnect failed: Bluetooth is already disconnected");
    return;
  }

  if (!telemetryCharacteristic) {
    console.log("Disconnect failed: No telemetry characteristic found");
    return;
  }

  telemetryCharacteristic
    .stopNotifications()
    .then(() => {
      console.log("Notifications stopped");
      return bleServer.disconnect();
    })
    .catch((error) => {
      console.log("Error disconnecting: " + error);
    });
}

async function getServiceWithRetry(
  gattServer: BluetoothRemoteGATTServer,
  uuid: string,
  attempts = 10,
  delayMs = 1000,
): Promise<BluetoothRemoteGATTService> {
  try {
    return await gattServer.getPrimaryService(uuid);
  } catch (error) {
    if (attempts <= 1) throw error;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return await getServiceWithRetry(gattServer, uuid, attempts - 1, delayMs);
  }
}

// Event handlers
function onDisconnected(e: Event) {
  connected = false;

  console.log("Device disconnected");
  log("Device disconnected");
}

function onCharacteristicChange(e: Event) {
  const target: any = e.target;
  const value = new TextDecoder().decode(target.value);
  lastPacket = JSON.parse(value);

  console.log("Packet received: " + lastPacket);
}

function writeCommand(value: string) {
  if (!bleServer || !bleServer.connected) {
    console.log("Write failed: Bluetooth is not connected");
    return;
  }

  if (!commandCharacteristic) {
    console.log("Write failed: Command characteristic not found");
    return;
  }

  const data = new TextEncoder().encode(value);

  commandCharacteristic.writeValue(data).catch((error) => {
    console.error("Error writing to characteristic: " + error);
  });
}

// Exports
export { connected, lastPacket, writeCommand, connect, disconnect };
