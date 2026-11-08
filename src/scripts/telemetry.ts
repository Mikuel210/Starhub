import type { DataPacket } from "./connection";
export const PACKET_BYTE_LENGTH = 206;

export function decodePacket(value: DataView): DataPacket {
  if (value.byteLength !== PACKET_BYTE_LENGTH) {
    throw new Error(
      `Invalid telemetry length: expected ${PACKET_BYTE_LENGTH}, received ${value.byteLength}`,
    );
  }

  const state = value.getUint8(0);
  const flags = value.getUint8(1);
  let offset = 2;

  function float(): number {
    const result = value.getFloat32(offset, true);
    offset += 4;

    return result;
  }

  function floats(count: number): number[] {
    return Array.from({ length: count }, () => float());
  }

  function int32(): number {
    const result = value.getInt32(offset, true);
    offset += 4;

    return result;
  }

  return {
    state,
    sensorData: {
      accel_mps2: floats(3),
      gyro_radps: floats(3),
      magnetometer: floats(3),
      distance_cm: float(),
      lidarAvailable: (flags & 0x01) !== 0,
      voltage1_v: float(),
      voltage2_v: float(),
    },
    hardwareData: {
      tvc_deg: floats(4),
      leg_deg: float(),
      throttle_us: int32(),
    },
    fusionData: {
      orientation_deg: floats(3),
      altitude_mm: float(),
      underVoltage: (flags & 0x02) !== 0,
      correctedDistance_mm: float(),
      rocketAccelZ_mmps2: float(),
      altitudeKfState: floats(8),
    },
    controlData: {
      correction_deg: floats(3),
      throttle_01: float(),
      xPid_deg: floats(5),
      yPid_deg: floats(5),
      altitudePid_mm: floats(5),
    },
  };
}
