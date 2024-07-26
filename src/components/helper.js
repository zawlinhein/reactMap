const pointInCircle = (point, center, radius) => {
  const latDiff = point.lat - center.lat;
  const lngDiff = point.lng - center.lng;
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) <= radius / 111000;
};

const pointInPolygon = (point, polygon) => {
  let crossings = 0;
  const x = point.lng,
    y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) crossings++;
  }

  return crossings % 2 !== 0;
};

const pointInRectangle = (point, bounds) => {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  );
};
export { pointInCircle, pointInPolygon, pointInRectangle };
