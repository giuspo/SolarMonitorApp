const { getPosition } = require('suncalc');
const lat = 44.94639411946835;
const lon = 7.6397264063164245;

const dates = [
  new Date('2026-10-04T08:00:00Z'),
  new Date('2026-10-04T10:00:00Z'),
  new Date('2026-10-04T12:00:00Z'),
  new Date('2026-10-04T14:00:00Z'),
  new Date('2026-10-04T16:00:00Z'),
];

for(let d of dates) {
  const sunPos = getPosition(d, lat, lon);
  let sun_elevation = sunPos.altitude * (180 / Math.PI);
  console.log(d.toISOString(), sun_elevation, Math.round(sun_elevation));
}
