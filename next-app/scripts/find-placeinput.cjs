const fs = require('fs');
const s = fs.readFileSync('D:/travel-web/next-app/src/features/pages/CompanyTripsPage.tsx','utf8');
const i = s.indexOf('<label className={styles.tripsFieldLabel} htmlFor="trip-place">');
console.log(JSON.stringify(s.slice(i-120, i+360)));