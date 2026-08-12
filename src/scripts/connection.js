const connectButton = document.getElementById("button-connect");
const disconnectButton = document.getElementById("button-disconnect");
let connected = false;

connectButton.addEventListener("click", () => {
    alert("Connect");
});

disconnectButton.addEventListener("click", () => {
    alert("Disconnect");
});
