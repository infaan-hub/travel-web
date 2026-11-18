const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 55432, user: 'postgres', password: 'postgres', database: 'infaan_travel' });
pool.connect().then(() => {
  pool.query(\"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'bookings_company_id_fkey'\", (e, r) => {
    if (e) { console.log('Err:', e.message); pool.end(); return; }
    console.log('Constraint definition:', r.rows[0] ? r.rows[0].pg_get_constraintdef : 'not found');
    pool.end();
  });
}).catch(e => { console.log('Connect failed:', e.message); pool.end(); });