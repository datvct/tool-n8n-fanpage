export const tikTokBufferChannels = [
  { value: "epcb_iot_lab", label: "EPCB IoT Lab" },
  { value: "epcb_iot_sensor", label: "EPCB IoT Sensor" },
] as const;

export type TikTokBufferChannel = (typeof tikTokBufferChannels)[number];

export function isTikTokBufferChannel(value: string) {
  return tikTokBufferChannels.some((channel) => channel.value === value);
}
