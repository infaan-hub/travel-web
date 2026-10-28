const fs = require('fs');
const p = 'D:/travel-web/next-app/src/features/pages/CompanyTripsPage.tsx';
let s = fs.readFileSync(p,'utf8');

// selectTripPlace: add reverse geocode after first branch? We'll add before its closing }, []).
// Find the selectTripPlace function
const idx = s.indexOf('const selectTripPlace = useCallback');
const end = s.indexOf('}, []);', idx) + '}, []);'.length;
// Insert reverse geocode call after the function definition (before the next newline)
const insert = `

  // resolve origin name
  void place;`;
// Instead, do simpler: append reverse geocode inside function by replacing its closing.
const oldClose = s.slice(idx, end);
const newClose = oldClose.replace(
  '    setFormError(null);\n  }, []);',
  '    setFormError(null);\n    geocodeAPI.reverse(place.latitude, place.longitude).then((res) => { const name = res.data?.display_name; if (name) setOriginName(name); }).catch(() => {});\n  }, []);'
);
s = s.replace(oldClose, newClose);

// pickTripPoint
const idx2 = s.indexOf('const pickTripPoint = useCallback');
const end2 = s.indexOf('}, []);', idx2) + '}, []);'.length;
const oldClose2 = s.slice(idx2, end2);
const newClose2 = oldClose2.replace(
  '    setFormError(null);\n  }, []);',
  '    setFormError(null);\n    const la = Number(latitude); const lo = Number(longitude);\n    geocodeAPI.reverse(la, lo).then((res) => { const name = res.data?.display_name; if (name) { if (!originName) setOriginName(name); else setDestinationName(name); } }).catch(() => {});\n  }, []);'
);
s = s.replace(oldClose2, newClose2);

fs.writeFileSync(p,s);
console.log('done');