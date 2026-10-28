const fs = require('fs');
const s = fs.readFileSync('D:/travel-web/next-app/src/features/pages/CompanyTripsPage.tsx','utf8');
const i = s.indexOf('htmlFor="trip-place"');
console.log(JSON.stringify(s.slice(i-150, i+620)));