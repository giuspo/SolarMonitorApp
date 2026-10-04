const SunCalc = require('suncalc');
const lat = 44.94639411946835;
const lon = 7.6397264063164245;
const dateObj = new Date();
const sunPos = SunCalc.getPosition(dateObj, lat, lon);
let sun_elevation = sunPos.altitude * (180 / Math.PI);
console.log(sun_elevation);
