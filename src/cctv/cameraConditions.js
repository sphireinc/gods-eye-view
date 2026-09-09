export const CAMERA_CONDITIONS = Object.freeze(['CLEAR', 'CLOUDY', 'FOGGY', 'SNOWY', 'RAIN_OBSCURED', 'NIGHT', 'GLARE', 'MIXED', 'UNKNOWN']);
export function deriveCameraCondition({ weather = null, cameraTag = null, solarElevationDeg = null, frameAt = null, now = Date.now(), maxAgeMs = 60 * 60 * 1000 } = {}) {
  const sourceIds = []; const evidence = []; const observedAt = Date.parse(frameAt || weather?.observedAt || '');
  if (cameraTag && CAMERA_CONDITIONS.includes(String(cameraTag).toUpperCase())) { evidence.push(String(cameraTag).toUpperCase()); sourceIds.push('camera-metadata'); }
  if (weather) { sourceIds.push(weather.sourceId || 'weather'); if (Number(weather.visibilityM) < 1000) evidence.push('FOGGY'); if (Number(weather.precipitation) > 0 && Number(weather.temperatureC) <= 1) evidence.push('SNOWY'); else if (Number(weather.precipitation) > 0) evidence.push('RAIN_OBSCURED'); if (Number(weather.cloudPct) >= 70) evidence.push('CLOUDY'); }
  if (Number.isFinite(solarElevationDeg) && solarElevationDeg < -6) { evidence.push('NIGHT'); sourceIds.push('solar-position'); }
  const unique = [...new Set(evidence)]; const stale = !Number.isFinite(observedAt) || now - observedAt > maxAgeMs; const condition = unique.length === 0 ? 'UNKNOWN' : unique.length === 1 ? unique[0] : 'MIXED';
  return { condition, state: stale ? 'LAST_OBSERVED' : 'CURRENT', observedAt: Number.isFinite(observedAt) ? new Date(observedAt).toISOString() : null, sourceIds: [...new Set(sourceIds)], confidenceBand: condition === 'UNKNOWN' ? 'LOW' : unique.length > 1 ? 'LOW' : 'MEDIUM', method: 'metadata-and-public-weather-rules', evidence: unique, caveat: 'Broad contextual estimate; not operational weather guidance.' };
}
