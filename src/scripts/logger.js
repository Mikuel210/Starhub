import { started, pad, formatCountdown } from "./countdown.js";

// Log function
const logP = document.getElementById("p-log");

function formatTime() {
  const time = new Date(Date.now());
  const hours = pad(time.getHours());
  const minutes = pad(time.getMinutes());
  const seconds = pad(time.getSeconds());
  const ms = pad(time.getMilliseconds(), 3);

  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function log(value) {
  const time = formatTime();
  const { clock, ms } = formatCountdown();

  logP.innerHTML += `[${time}`;
  if (started) logP.innerHTML += ` ${clock}.${ms}`;
  logP.innerHTML += `] ${value}<br/>`;
}

// Exports
export { log };
