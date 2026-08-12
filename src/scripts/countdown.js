// Countdown configuration
const configButton = document.getElementById("button-countdown-config");
const missionH2 = document.getElementById("h2-mission");
const countdownH2 = document.getElementById("h2-countdown");
const millisecondsP = document.getElementById("p-milliseconds")

configButton.addEventListener("click", () => {
    const missionName = prompt("Mission Name");
    const minutesString = prompt("Countdown Minutes");
    minutes = parseInt(minutesString);

    if (isNaN(minutes))
    {
        alert("Invalid minutes");
        return;
    }

    configured = true;
    startTime = Date.now();
    requestAnimationFrame(updateCountdown);
    requestAnimationFrame(updateButtons);

    missionH2.innerHTML = missionName;
});

// Update countdown
var configured = false;
let started = false;
let hold = false;

var startTime;        // Set on start and resume
var liftoffTime;      // Calculated by updateCountdown
var minutes = 0;      // Set on start and hold
var seconds = 0;      // Set on hold
var milliseconds = 0; // Set on hold

function getT() {
    liftoffTime = new Date(startTime + minutes * 60_000 + seconds * 1_000 + milliseconds);

    if (Date.now() > liftoffTime)
        return new Date(Date.now() - liftoffTime);
    else
        return new Date(liftoffTime - Date.now());
}

function updateCountdown() {
    if (!configured) {
        countdownH2.innerHTML = "T-00:00:00";
        millisecondsP.innerHTML = "000";

        return;
    }

    let t = getT();

    // Set countdown for not started or hold
    if (!started || (started && hold))
    {
        t = new Date(0)
        t.setMinutes(minutes);
        t.setSeconds(seconds);
        t.setMilliseconds(milliseconds);
    }

    // Update countdown text
    let prefix = Date.now() > liftoffTime ? "T+" : "T-";
    countdownH2.innerHTML = prefix + t.toTimeString().split(' ')[0];
    millisecondsP.innerHTML = String(t.getMilliseconds()).padStart(3, '0');

    requestAnimationFrame(updateCountdown);
}

// Start and hold buttons
const startAbortButton = document.getElementById("button-start-abort");
const holdResumeButton = document.getElementById("button-hold-resume");

startAbortButton.addEventListener("click", () => {
    if (!configured) return;

    if (!started) {
        started = true;
        startTime = Date.now();
    } else {
        started = false;
        hold = false;
        configured = false;

        minutes = 0;
        seconds = 0;
        milliseconds = 0;

        missionH2.innerHTML = "Mission Name";
    }

    updateButtons();
});

holdResumeButton.addEventListener("click", () => {
    if (!configured) return;
    const t = getT();

    if (hold) {
        hold = false;
        startTime = Date.now();
    } else {
        hold = true;
        minutes = t.getMinutes();
        seconds = t.getSeconds();
        milliseconds = t.getMilliseconds();
    }

    updateButtons();
});

function updateButtons() {
    if (!configured) {
        startAbortButton.innerHTML = "START";
        startAbortButton.style.backgroundColor = "silver";
        startAbortButton.disabled = true;

        holdResumeButton.innerHTML = "HOLD";
        holdResumeButton.style.backgroundColor = "silver";
        holdResumeButton.disabled = true;

        configButton.disabled = false;

        return;
    } else {
        startAbortButton.disabled = false;
        holdResumeButton.disabled = false;
        configButton.disabled = true;
    }

    if (started) {
        startAbortButton.innerHTML = "ABORT";
        startAbortButton.style.backgroundColor = "indianred";

        if (hold) {
            holdResumeButton.innerHTML = "RESUME";
            holdResumeButton.style.backgroundColor = "skyblue";
        } else {
            holdResumeButton.innerHTML = "HOLD";
            holdResumeButton.style.backgroundColor = "gold";
        }
    } else {
        startAbortButton.innerHTML = "START";
        startAbortButton.style.backgroundColor = "limegreen";

        holdResumeButton.innerHTML = "HOLD";
        holdResumeButton.style.backgroundColor = "silver";
        holdResumeButton.disabled = true;
    }
}

updateButtons();
