export function attachCameraWeather(camera, weather, { now = Date.now(), maxAgeMs = 60 * 60 * 1000 } = {}) {
  if (!camera?.id) throw new TypeError('camera id is required');
  if (!weather) return { cameraId: String(camera.id), state: 'UNAVAILABLE', observation: null, caveat: 'No weather observation was available for this camera location.' };
  const observedAt = Date.parse(weather.observedAt || weather.time || '');
  if (!Number.isFinite(observedAt)) return { cameraId: String(camera.id), state: 'UNKNOWN', observation: null, caveat: 'Weather timestamp was not valid.' };
  const ageMs = Math.max(0, now - observedAt);
  return { cameraId: String(camera.id), state: ageMs > maxAgeMs ? 'STALE' : 'CURRENT', ageMs, observation: { temperatureC: weather.temperatureC ?? null, precipitation: weather.precipitation ?? null, windMps: weather.windMps ?? null, visibilityM: weather.visibilityM ?? null, observedAt: new Date(observedAt).toISOString(), sourceId: weather.sourceId || 'weather-source' }, caveat: 'Weather is a nearby public observation or forecast and does not describe camera image conditions with certainty.' };
}
