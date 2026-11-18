const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 55432, user: 'postgres', password: 'postgres', database: 'infaan_travel' });
pool.connect().then(() => {
  pool.query(\"SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname LIKE 'bookings%' OR conname LIKE '%company%' ORDER BY conname\", (e, r) => {
    if (e) { console.log('Err:', e.message); pool.end(); return; }
    console.log('Bookings constraints:', JSON.stringify(r.rows, null, 2));
    pool.end();
  });
}).catch(e => { console.log('Connect failed:', e.message); pool.end(); });