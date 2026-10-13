import { connected, writeCommand, getState } from "./connection.js";
import { log } from "./logger.js";

// Countdown configuration
const configButton = document.getElementById(
  "button-countdown-config",
) as HTMLButtonElement;
const missionH2 = document.getElementById("h2-mission") as HTMLHeadingElement;
const countdownH2 = document.getElementById(
  "h2-countdown",
) as HTMLHeadingElement;
const millisecondsP = document.getElementById(
  "p-milliseconds",
) as HTMLParagraphElement;

configButton.addEventListener("click", () => {
  const missionName = prompt("Mission Name");

  if (!missionName) {
    alert("No mission name provided");
    return;
  }

  const minutesString = prompt("Countdown Minutes");

  if (!minutesString) {
    alert("No minutes provided");
    return;
  }

  const minutes = parseFloat(minutesString);

  if (isNaN(minutes)) {
    alert("Invalid minutes");
    return;
  }

  if (minutes < 0.5) {
    alert("Minutes must be greater than 0.5");
    return;
  }

  milliseconds = Math.floor(minutes * 60_000);
  state = { configured: true, started: false };
  startTime = Date.now();

  requestAnimationFrame(updateCountdown);
  missionH2.innerHTML = missionName;

  log(`Mission configured: ${missionName}`);
});

// Update countdown
type State =
  | { configured: false }
  | { configured: true; started: false }
  | {
      configured: true;
      started: true;
      hold: boolean;
      startup: boolean;
      aborted: boolean;
      landed: boolean;
    };

var state: State = { configured: false };
let startupMillis = -20_000;
var startTime: number; // Set on start and resume
var milliseconds: number; // Set on start and hold

function getT() {
  if (!state.configured) return 0;
  if (!state.started || (state.started && state.hold)) return -milliseconds;

  const liftoffTime = new Date(startTime + milliseconds);
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

function updateCountdown() {
  const { clock, ms } = formatCountdown();
  countdownH2.innerHTML = clock;
  millisecondsP.innerHTML = ms;

  updateCountdownEvents();
  requestAnimationFrame(updateCountdown);
}

function updateCountdownEvents() {
  const t = getT();

  if (
    state.configured &&
    state.started &&
    !state.startup &&
    !state.aborted &&
    t < startupMillis
  ) {
    writeCommand("S");
    log("Startup triggered");
    state.startup = true;
  }
}

// Start, hold and stop buttons
const startAbortButton = document.getElementById(
  "button-start-abort",
) as HTMLButtonElement;
const holdResumeButton = document.getElementById(
  "button-hold-resume",
) as HTMLButtonElement;

const stopButton = document.getElementById("button-stop") as HTMLButtonElement;

startAbortButton.addEventListener("click", () => {
  if (
    !state.configured ||
    (state.configured && state.started && (state.aborted || state.landed))
  ) {
    return;
  }

  if (!state.started) {
    state = {
      configured: true,
      started: true,
      hold: false,
      startup: false,
      aborted: false,
      landed: false,
    };

    startTime = Date.now();
    log("Countdown started");
  } else {
    state.aborted = true;
    writeCommand("A");
    log("Abort triggered");
  }
});

holdResumeButton.addEventListener("click", () => {
  if (
    !state.configured ||
    !state.started ||
    (state.configured && state.started && (state.aborted || state.landed))
  ) {
    return;
  }

  if (state.hold) {
    startTime = Date.now();
    state.hold = false;
    log("Countdown resumed");
  } else {
    milliseconds = -getT();
    state.hold = true;
    log("Hold triggered");
  }
});

stopButton.addEventListener("click", () => {
  if (!(
    state.configured &&
    state.started &&
    (state.aborted || state.landed || !state.startup)
  )) {
    return;
  }

  state = { configured: false };
  missionH2.innerHTML = "Mission Name";
  milliseconds = 0;
  log("Countdown stopped");
});

function updateButtons() {
  // Start / Abort
  if (!state.configured || !connected || (!state.started && getState() != 0)) {
    startAbortButton.innerHTML = "START";
    startAbortButton.style.backgroundColor = "silver";
    startAbortButton.style.color = "";
    startAbortButton.disabled = true;
  } else if (state.started && !(state.aborted || state.landed)) {
    startAbortButton.innerHTML = "ABORT";
    startAbortButton.style.backgroundColor = "indianred";
    startAbortButton.style.color = "white";
    startAbortButton.disabled = false;
  } else if (state.started && (state.aborted || state.landed)) {
    startAbortButton.innerHTML = "ABORT";
    startAbortButton.style.backgroundColor = "silver";
    startAbortButton.style.color = "";
    startAbortButton.disabled = true;
  } else {
    startAbortButton.innerHTML = "START";
    startAbortButton.style.backgroundColor = "forestgreen";
    startAbortButton.style.color = "white";
    startAbortButton.disabled = false;
  }

  // Hold / Resume
  const canHold =
    getT() < startupMillis &&
    state.configured &&
    state.started &&
    !state.aborted &&
    !state.landed;

  if (!state.configured || !canHold) {
    holdResumeButton.innerHTML = "HOLD";
    holdResumeButton.style.backgroundColor = "silver";
    holdResumeButton.disabled = true;
  } else if (state.started && state.hold) {
    holdResumeButton.innerHTML = "RESUME";
    holdResumeButton.style.backgroundColor = "skyblue";
    holdResumeButton.disabled = false;
  } else if (state.started && !state.hold) {
    holdResumeButton.innerHTML = "HOLD";
    holdResumeButton.style.backgroundColor = "gold";
    holdResumeButton.disabled = false;
  } else {
    holdResumeButton.innerHTML = "HOLD";
    holdResumeButton.style.backgroundColor = "silver";
    holdResumeButton.disabled = true;
  }

  // Stop
  if (
    state.configured &&
    state.started &&
    (state.aborted || state.landed || !state.startup)
  ) {
    stopButton.style.backgroundColor = "silver";
    stopButton.disabled = false;
  } else {
    stopButton.style.backgroundColor = "silver";
    stopButton.disabled = true;
  }

  // Configure
  if (!state.configured || !state.started) {
    configButton.disabled = false;
  } else {
    configButton.disabled = true;
  }

  requestAnimationFrame(updateButtons);
}

function land() {
  if (!state.configured || !state.started) return;
  state.landed = true;
}

requestAnimationFrame(updateButtons);

// Exports
export { state, pad, formatCountdown, land };
