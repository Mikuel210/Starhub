import { connected, writeCommand, getState } from "./connection.js";
import { log } from "./logger.js";

// Countdown configuration
const configButton = document.getElementById("button-countdown-config");
const missionH2 = document.getElementById("h2-mission");
const countdownH2 = document.getElementById("h2-countdown");
const millisecondsP = document.getElementById("p-milliseconds");

configButton.addEventListener("click", () => {
  const missionName = prompt("Mission Name");
  const minutesString = prompt("Countdown Minutes");
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
  configured = true;
  startTime = Date.now();

  requestAnimationFrame(updateCountdown);
  missionH2.innerHTML = missionName;

  log(`Mission configured: ${missionName}`);
});

// Update countdown
var configured = false;
let started = false;
let hold = false;
let startup = false;
let aborted = false;
let landed = false;

let startupMillis = -20_000;
var startTime; // Set on start and resume
var milliseconds; // Set on start and hold

function getT() {
  if (!configured) return 0;

  if (!started || (started && hold)) return -milliseconds;

  const liftoffTime = new Date(startTime + milliseconds);
  return new Date(Date.now()).getTime() - liftoffTime.getTime();
}

function pad(number, length = 2) {
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
  if (startup || aborted || !started || t < startupMillis) return;

  writeCommand("S");
  log("Startup triggered");
  startup = true;
}

// Start, hold and stop buttons
const startAbortButton = document.getElementById("button-start-abort");
const holdResumeButton = document.getElementById("button-hold-resume");
const stopButton = document.getElementById("button-stop");

startAbortButton.addEventListener("click", () => {
  if (!configured || aborted || landed) return;

  if (!started) {
    started = true;
    startTime = Date.now();
    log("Countdown started");
  } else {
    aborted = true;
    writeCommand("A");
    log("Abort triggered");
  }
});

holdResumeButton.addEventListener("click", () => {
  if (!configured || aborted || landed) return;

  if (hold) {
    startTime = Date.now();
    hold = false;

    log("Countdown resumed");
  } else {
    milliseconds = -getT();
    hold = true;

    log("Hold triggered");
  }
});

stopButton.addEventListener("click", () => {
  if (!(started && (aborted || landed || !startup))) return;
  log("Countdown stopped");

  started = false;
  hold = false;
  configured = false;
  startup = false;
  aborted = false;
  landed = false;

  milliseconds = 0;
  missionH2.innerHTML = "Mission Name";
});

function updateButtons() {
  // Start / Abort
  if (!configured || !connected || (!started && getState() != 0)) {
    startAbortButton.innerHTML = "START";
    startAbortButton.style.backgroundColor = "silver";
    startAbortButton.style.color = "";
    startAbortButton.disabled = true;
  } else if (started && !(aborted || landed)) {
    startAbortButton.innerHTML = "ABORT";
    startAbortButton.style.backgroundColor = "indianred";
    startAbortButton.style.color = "white";
    startAbortButton.disabled = false;
  } else if (started && (aborted || landed)) {
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
  const canHold = getT() < startupMillis && !aborted && !landed;

  if (!configured || !canHold) {
    holdResumeButton.innerHTML = "HOLD";
    holdResumeButton.style.backgroundColor = "silver";
    holdResumeButton.disabled = true;
  } else if (started && hold) {
    holdResumeButton.innerHTML = "RESUME";
    holdResumeButton.style.backgroundColor = "skyblue";
    holdResumeButton.disabled = false;
  } else if (started && !hold) {
    holdResumeButton.innerHTML = "HOLD";
    holdResumeButton.style.backgroundColor = "gold";
    holdResumeButton.disabled = false;
  } else {
    holdResumeButton.innerHTML = "HOLD";
    holdResumeButton.style.backgroundColor = "silver";
    holdResumeButton.disabled = true;
  }

  // Stop
  if (started && (aborted || landed || !startup)) {
    stopButton.style.backgroundColor = "silver";
    stopButton.disabled = false;
  } else {
    stopButton.style.backgroundColor = "silver";
    stopButton.disabled = true;
  }

  // Configure
  if (!started) {
    configButton.disabled = false;
  } else {
    configButton.disabled = true;
  }

  requestAnimationFrame(updateButtons);
}

function land() {
  landed = true;
}

requestAnimationFrame(updateButtons);

// Exports
export { configured, started, hold, pad, formatCountdown, land };
