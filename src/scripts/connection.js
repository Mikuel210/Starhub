import { started } from "./countdown.js"

// Manage connection
const deviceName = "ESP32";
const serviceUuid = "3343f2ee-4910-492a-b29b-181e051a631b";
const testUuid = "313ce956-bbe0-47bf-8e32-b2c5e3a364ec";

let connected = false;
let bleServer;
let serviceFound;
let characteristicFound;

const connectButton = document.getElementById("button-connect");
const disconnectButton = document.getElementById("button-disconnect");
const stateSpan = document.getElementById("span-state");

connectButton.addEventListener("click", connect);
disconnectButton.addEventListener("click", disconnect);

function connect() {
    if (!navigator.bluetooth) {
        alert("Bluetooth is unsupported in your browser");
        return;
    }

    navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [serviceUuid]
    })
    .then(device => {
        console.log("Device selected: " + device);
        device.addEventListener('gattserverdisconnected', onDisconnected);

        return device.gatt.connect();
    })
    .then(gattServer =>{
        console.log("Connected to GATT Server");
        bleServer = gattServer;

        return getServiceWithRetry(gattServer, serviceUuid);
    })
    .then(service => {
        console.log("Service discovered: " + service.uuid);
        serviceFound = service;

        return service.getCharacteristic(testUuid);
    })
    .then(characteristic => {
        console.log("Characteristic discovered:", characteristic.uuid);
        characteristicFound = characteristic;
        characteristic.addEventListener('characteristicvaluechanged', onCharacteristicChange);
        characteristic.startNotifications();

        connected = true;
        requestAnimationFrame(updateState);

        return characteristic.readValue();
    })
    .then(value => {
        console.log("Read value: " + value);
        const decodedValue = new TextDecoder().decode(value);
        console.log("Decoded value: " + decodedValue);
    })
    .catch(error => {
        console.log("Error: " + error);
    })
}

function disconnect() {
    if (!bleServer || !bleServer.connected) {
        console.log("Disconnect failed: Bluetooth is already disconnected");
        return;
    }

    if (!characteristicFound) {
        console.log("Disconnect failed: No characteristic found")
        return;
    }

    characteristicFound.stopNotifications().then(() => {
        console.log("Notifications stopped");
        return bleServer.disconnect();
    })
    .then(() => {
        console.log("Device disconnected");
        connected = false;
    })
    .catch(error => {
        console.log("Error disconnecting: " + error);
    });
}

function getServiceWithRetry(gattServer, uuid, attempts = 10, delayMs = 1000) {
    return gattServer.getPrimaryService(uuid).catch(error => {
        if (attempts <= 1) throw error;

        return new Promise(resolve => setTimeout(resolve, delayMs))
            .then(() => getServiceWithRetry(gattServer, uuid, attempts - 1, delayMs));
    });
}

// Event handlers
function onDisconnected(e) {
    console.log("Device disconnected");
    connected = false;
}

function onCharacteristicChange(e) {
    const value = new TextDecoder().decode(e.target.value);
    console.log("Characteristic value changed: " + value);
}

function write(value) {
    if (!bleServer || !bleServer.connected) {
        console.log("Write failed: Bluetooth is not connected");
        return;
    }

    bleServiceFound.getCharacteristic(testUuid).then(characteristic => {
        console.log("Characteristic found: " + characteristic.uuid);
        const data = new Uint8Array([value]);
        return characteristic.writeValue(data);
    })
    .catch(error => {
        console.error("Error writing to characteristic: " + error);
    });
}

// Update state and buttons
function updateState() {
    if (connected) {
        stateSpan.innerHTML = "CONNECTED";
        stateSpan.style.backgroundColor = "forestgreen"

        requestAnimationFrame(updateState);
    } else {
        stateSpan.innerHTML = "DISCONNECTED";
        stateSpan.style.backgroundColor = "indianred"
    }
}

function updateButtons() {
    connectButton.disabled = started;
    disconnectButton.disabled = started;

    requestAnimationFrame(updateButtons);
}

requestAnimationFrame(updateState);
requestAnimationFrame(updateButtons);

// Exports
export { connected }
