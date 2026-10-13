import { writeCommand } from "./connection.js";
import { log } from "./logger.js";

// Update countdown
type State =
  | { configured: false }
  | { configured: true; started: false; startTime: number; milliseconds: number }
  | {
      configured: true;
      started: true;
      startTime: number; // Set on start and resume
      milliseconds: number; // Set on start and hold
      hold: boolean;
      startup: boolean;
      aborted: boolean;
      landed: boolean;
    };

let state: State = { configured: false };
let startupMillis = -20_000;

function getT() {
  if (!state.configured) return 0;
  if (!state.started || (state.started && state.hold)) return -state.milliseconds;

  const liftoffTime = new Date(state.startTime + state.milliseconds);
  return new Date(Date.now()).getTime() - liftoffTime.getTime();
}

function pad(number: number, length = 2) {
  return String(number).padStart(length, "0");
}

function formatCountdown() {
  const t = getT();
  const abs = Math.abs(t);

  const prefix = t > 0 ? "T+" : "T-";
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs / 60_000) % 60);
  const seconds = Math.floor((abs / 1_000) % 60);

  const clock = `${prefix}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const ms = pad(abs % 1000, 3);
  return { clock, ms };
}

function updateCountdownEvents() {
  const t = getT();

  if (
    state.configured &&
    state.started &&
    !state.hold &&
    !state.startup &&
    !state.aborted &&
    t > startupMillis
  ) {
    console.log(t);
    console.log(startupMillis);
    writeCommand("S");
    log("Startup triggered");
    state.startup = true;
  }

  requestAnimationFrame(updateCountdownEvents);
}

function setState(newState: State) {
  state = newState;
}

function land() {
  if (!state.configured || !state.started) return;
  state.landed = true;
}

requestAnimationFrame(updateCountdownEvents);

// Exports
export { state, startupMillis, getT, pad, formatCountdown, setState, land };
