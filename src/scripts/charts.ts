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
  { name: "altitude", labels: ["distance", "altitude"] },
  { name: "throttle", labels: ["throttle"] },
  { name: "acceleration", labels: ["x", "y", "z"] },
  { name: "gyroscope", labels: ["x", "y", "z"] },
  { name: "magnetometer", labels: ["x", "y", "z"] },
  { name: "x-pid", labels: ["p", "i", "d"] },
  { name: "y-pid", labels: ["p", "i", "d"] },
  { name: "z-pid", labels: ["p", "i", "d"] },
  { name: "throttle-pid", labels: ["p", "i", "d"] },
  { name: "tvc", labels: ["xp", "xm", "yp", "ym"] },
  { name: "voltage", labels: ["xp", "xm", "yp", "ym"] },
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

function logPacket(packet: DataPacket) {
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

  // TODO: PIDs

  /*
  charts["tvc"].add({
    xp: packet.controlData.tvc_deg[0],
    xm: packet.controlData.tvc_deg[1],
    yp: packet.controlData.tvc_deg[2],
    ym: packet.controlData.tvc_deg[3],
  });
  */

  charts["voltage"].add({
    v1: packet.sensorData.voltage1_v,
    v2: packet.sensorData.voltage2_v,
  });

  // TODO: KF
}

initialize();

// Exports
export { logPacket };
