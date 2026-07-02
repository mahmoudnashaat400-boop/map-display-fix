export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number, alt: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const groundDistance = R * c;
  
  return Math.sqrt(Math.pow(groundDistance, 2) + Math.pow(alt, 2));
}

export function calculateFSPL(distanceKm: number, frequencyMhz: number): number {
  return 32.44 + 20 * Math.log10(frequencyMhz) + 20 * Math.log10(distanceKm);
}

export function calculateDoppler(frequencyMhz: number, radialVelocityKmS: number): number {
  const c = 299792.458; // speed of light in km/s
  return - (frequencyMhz * 1e6) * (radialVelocityKmS / c);
}

export function calculateElevation(lat1: number, lon1: number, lat2: number, lon2: number, altKm: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  const el = Math.asin((Math.cos(centralAngle) - R/(R+altKm)) / Math.sin(centralAngle)) * 180 / Math.PI;
  return isNaN(el) ? 0 : el;
}

export function calculateAzimuth(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const az = Math.atan2(y, x) * 180 / Math.PI;
  
  return (az + 360) % 360;
}
