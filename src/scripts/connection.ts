import { state, land } from "./countdown.js";
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
let lastPacket: DataPacket;

// Connect and disconnect
const connectButton = document.getElementById(
  "button-connect",
) as HTMLButtonElement;

const disconnectButton = document.getElementById(
  "button-disconnect",
) as HTMLButtonElement;

const stateSpan = document.getElementById("span-state") as HTMLSpanElement;

connectButton.addEventListener("click", connect);
disconnectButton.addEventListener("click", disconnect);

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

      if (!device.gatt) return;
      return device.gatt.connect();
    })
    .then((gattServer) => {
      if (!gattServer) return;
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
    .then(([command, telemetry]) => {
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

function getServiceWithRetry(
  gattServer: BluetoothRemoteGATTServer,
  uuid: string,
  attempts = 10,
  delayMs = 1000,
): Promise<BluetoothRemoteGATTService> {
  return gattServer.getPrimaryService(uuid).catch((error) => {
    if (attempts <= 1) throw error;

    return new Promise((resolve) => setTimeout(resolve, delayMs)).then(() =>
      getServiceWithRetry(gattServer, uuid, attempts - 1, delayMs),
    );
  });
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

// Update state and buttons
let previousState = 0;

function updateState() {
  if (connected && lastPacket !== undefined) {
    switch (lastPacket.state) {
      case 0:
        stateSpan.innerHTML = "IDLE";
        stateSpan.style.color = "black";
        stateSpan.style.backgroundColor = "skyblue";
        break;

      case 1:
        stateSpan.innerHTML = "STARTUP";
        stateSpan.style.color = "black";
        stateSpan.style.backgroundColor = "mediumturquoise";
        break;

      case 2:
        stateSpan.innerHTML = "FLIGHT";
        stateSpan.style.color = "white";
        stateSpan.style.backgroundColor = "mediumvioletred";
        break;

      case 3:
        stateSpan.innerHTML = "ABORT";
        stateSpan.style.color = "white";
        stateSpan.style.backgroundColor = "crimson";
        break;

      case 4:
        stateSpan.innerHTML = "LANDED";
        stateSpan.style.color = "white";
        stateSpan.style.backgroundColor = "forestgreen";
        break;

      default:
        break;
    }

    if (lastPacket.state != previousState) {
      log(`State changed: ${stateSpan.innerHTML}`);
      previousState = lastPacket.state;

      if (lastPacket.state == 4) {
        land();
      }
    }
  } else {
    stateSpan.innerHTML = "DISCONNECTED";
    stateSpan.style.color = "white";
    stateSpan.style.backgroundColor = "indianred";
  }

  requestAnimationFrame(updateState);
}

function updateButtons() {
  connectButton.disabled = state.configured && state.started;
  disconnectButton.disabled = state.configured && state.started;

  requestAnimationFrame(updateButtons);
}

function getState() {
  return previousState;
}

requestAnimationFrame(updateState);
requestAnimationFrame(updateButtons);

// Exports
export { connected, lastPacket, writeCommand, getState };
