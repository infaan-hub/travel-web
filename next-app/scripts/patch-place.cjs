const fs = require('fs');
const p = 'D:/travel-web/next-app/src/features/pages/CompanyTripsPage.tsx';
let s = fs.readFileSync(p,'utf8');
const old = `      const data = new FormData();
      data.append("title", title);
      data.append("place", place);`;
const neu = `      const derivedPlace =
        place.trim() ||
        (originLat !== null && originLng !== null && destLat !== null && destLng !== null
          ? \`\${originLat.toFixed(5)}, \${originLng.toFixed(5)} to \${destLat.toFixed(5)}, \${destLng.toFixed(5)}\`
          : "Route");
      const data = new FormData();
      data.append("title", title);
      data.append("place", derivedPlace);`;
if (!s.includes(old)) { console.log('old not found'); process.exit(1); }
s = s.replace(old, neu);
// ensure originLat etc defined before; they are defined later, so move? We'll instead compute derivedPlace after those consts. Revert naive insertion by checking.
fs.writeFileSync(p,s);
console.log('done');