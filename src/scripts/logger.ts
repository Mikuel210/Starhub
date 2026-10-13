import { state, pad, formatCountdown } from "./countdown.js";

// Log function
const logP = document.getElementById("p-log") as HTMLParagraphElement;

function formatTime() {
  const time = new Date(Date.now());
  const hours = pad(time.getHours());
  const minutes = pad(time.getMinutes());
  const seconds = pad(time.getSeconds());
  const ms = pad(time.getMilliseconds(), 3);

  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function log(value: unknown) {
  const time = formatTime();
  const { clock, ms } = formatCountdown();

  logP.innerHTML += `[${time}`;
  if (state.configured && state.started) logP.innerHTML += ` ${clock}.${ms}`;
  logP.innerHTML += `] ${value}<br/>`;
}

// Exports
export { log };
