// Countdown configuration
const configButton = document.getElementById("button-countdown-config");
const missionH2 = document.getElementById("h2-mission");
const countdownH2 = document.getElementById("h2-countdown");

configButton.addEventListener("click", () => {
    const missionName = prompt("Mission Name");
    const minutesString = prompt("Countdown Minutes");
    const minutes = parseInt(minutesString);

    if (isNaN(minutes))
    {
        alert("Invalid minutes");
        return;
    }

    const currentTime = new Date(Date.now()).getTime();
    liftoffTime = new Date(currentTime + minutes * 60_000);
    updateCountdown();

    missionH2.innerHTML = missionName;
});

// Update countdown
var liftoffTime;

function updateCountdown() {
    if (liftoffTime === undefined) return;

    let prefix;
    let t;

    if (Date.now() > liftoffTime) {
        prefix = "T+";
        t = Date.now() - liftoffTime;
    } else {
        prefix = "T-";
        t = liftoffTime - Date.now();
    }

    countdownH2.innerHTML = prefix + new Date(t).toTimeString().split(' ')[0];
    requestAnimationFrame(updateCountdown);
}
