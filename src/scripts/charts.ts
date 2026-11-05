import { Chart } from "chart.js/auto";
import type { DataPacket } from "./connection";

const LIMIT = 50;
const ASPECT_RATIO = 1.5;

type Dataset = Record<number, Record<string, number>>;

type ChartData = {
  name: string;
  labels: string[];
};

class TelemetryChart {
  data: ChartData;
  dataset: Dataset;
  chart: Chart;

  constructor(context: HTMLCanvasElement, data: ChartData) {
    this.data = data;
    this.dataset = {};
    let datasets = [];

    for (const label of data.labels) {
      datasets.push({
        label: label,
        data: [],
        borderWidth: 1,
      });
    }

    this.chart = new Chart(context, {
      type: "line",
      data: {
        labels: [],
        datasets: datasets,
      },
      options: {
        animation: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        aspectRatio: ASPECT_RATIO,
      },
    });
  }

  add(datapoint: Record<string, number>) {
    const now = Date.now() - 1_792_000_000_000;
    this.dataset[now] = datapoint;
    const keys = Object.keys(this.dataset);

    if (keys.length > LIMIT) {
      delete this.dataset[parseInt(keys[0])];
    }

    this.render();
  }

  render() {
    this.chart.data.labels = Object.keys(this.dataset);

    for (let i = 0; i < this.chart.data.datasets.length; i++) {
      const dataset = this.chart.data.datasets[i];
      dataset.data = Object.values(this.dataset).map((e) => e[dataset.label!]);
    }

    this.chart.update();
  }
}

// Add charts
const chartData: ChartData[] = [
  { name: "orientation", labels: ["x", "y", "z"] },
  { name: "correction", labels: ["x", "y", "z"] },
  { name: "altitude", labels: ["distance", "altitude", "setpoint"] },
  { name: "throttle", labels: ["throttle"] },
  { name: "acceleration", labels: ["x", "y", "z"] },
  { name: "gyroscope", labels: ["x", "y", "z"] },
  { name: "magnetometer", labels: ["x", "y", "z"] },
  { name: "x-pid", labels: ["p", "i", "d", "r"] },
  { name: "y-pid", labels: ["p", "i", "d", "r"] },
  { name: "altitude-pid", labels: ["p", "i", "d", "r"] },
  { name: "tvc", labels: ["xp", "xm", "yp", "ym"] },
  { name: "leg", labels: ["deg"] },
  { name: "voltage", labels: ["v1", "v2"] },
  { name: "altitude-kf", labels: ["pos", "vel", "p11", "p12", "p22", "q11", "q12", "q22"] },
  { name: "altitude-internals", labels: ["distance", "acceleration"] },
];

let charts: Record<string, TelemetryChart>;

function initialize() {
  charts = {};

  for (const data of chartData) {
    charts[data.name] = new TelemetryChart(
      document.getElementById(`canvas-${data.name}`) as HTMLCanvasElement,
      data,
    );
  }
}

// Keep only the newest sample while the browser is busy
let pendingPacket: DataPacket | undefined;
let renderScheduled = false;

function logPacket(packet: DataPacket) {
  pendingPacket = packet;
  if (renderScheduled) return;
  renderScheduled = true;

  requestAnimationFrame(() => {
    renderScheduled = false;
    const latest = pendingPacket;
    pendingPacket = undefined;
    if (latest) renderPacket(latest);
  });
}

function renderPacket(packet: DataPacket) {
  charts["orientation"].add({
    x: packet.fusionData.orientation_deg[0],
    y: packet.fusionData.orientation_deg[1],
    z: packet.fusionData.orientation_deg[2],
  });

  charts["correction"].add({
    x: packet.controlData.correction_deg[0],
    y: packet.controlData.correction_deg[1],
    z: packet.controlData.correction_deg[2],
  });

  charts["altitude"].add({
    distance: packet.sensorData.distance_cm * 10,
    altitude: packet.fusionData.altitude_mm,
    setpoint: packet.controlData.altitudePid_mm[4],
  });

  charts["throttle"].add({
    throttle: packet.controlData.throttle_01 * 100,
  });

  charts["acceleration"].add({
    x: packet.sensorData.accel_mps2[0],
    y: packet.sensorData.accel_mps2[1],
    z: packet.sensorData.accel_mps2[2],
  });

  charts["gyroscope"].add({
    x: packet.sensorData.gyro_radps[0],
    y: packet.sensorData.gyro_radps[1],
    z: packet.sensorData.gyro_radps[2],
  });

  charts["magnetometer"].add({
    x: packet.sensorData.magnetometer[0],
    y: packet.sensorData.magnetometer[1],
    z: packet.sensorData.magnetometer[2],
  });

  charts["x-pid"].add({
    p: packet.controlData.xPid_deg[0],
    i: packet.controlData.xPid_deg[1],
    d: packet.controlData.xPid_deg[2],
    r: packet.controlData.xPid_deg[3],
  });

  charts["y-pid"].add({
    p: packet.controlData.yPid_deg[0],
    i: packet.controlData.yPid_deg[1],
    d: packet.controlData.yPid_deg[2],
    r: packet.controlData.yPid_deg[3],
  });

  charts["altitude-pid"].add({
    p: packet.controlData.altitudePid_mm[0],
    i: packet.controlData.altitudePid_mm[1],
    d: packet.controlData.altitudePid_mm[2],
    r: packet.controlData.altitudePid_mm[3],
  });

  charts["tvc"].add({
    xp: packet.hardwareData.tvc_deg[0],
    xm: packet.hardwareData.tvc_deg[1],
    yp: packet.hardwareData.tvc_deg[2],
    ym: packet.hardwareData.tvc_deg[3],
  });

  charts["leg"].add({
    deg: packet.hardwareData.leg_deg,
  });

  charts["voltage"].add({
    v1: packet.sensorData.voltage1_v,
    v2: packet.sensorData.voltage2_v,
  });

  charts["altitude-kf"].add({
    pos: packet.fusionData.altitudeKfState[0],
    vel: packet.fusionData.altitudeKfState[1],
    p11: packet.fusionData.altitudeKfState[2],
    p12: packet.fusionData.altitudeKfState[3],
    p22: packet.fusionData.altitudeKfState[4],
    q11: packet.fusionData.altitudeKfState[5],
    q12: packet.fusionData.altitudeKfState[6],
    q22: packet.fusionData.altitudeKfState[7],
  });

  charts["altitude-internals"].add({
    distance: packet.fusionData.correctedDistance_mm,
    acceleration: packet.fusionData.rocketAccelZ_mmps2,
  });
}

initialize();

// Exports
export { logPacket };
