const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 55432, user: 'postgres', password: 'postgres', database: 'infaan_travel' });
pool.connect().then(() => {
  console.log('Connected to DB');
  pool.query('ALTER TABLE "bookings" DROP CONSTRAINT "bookings_company_id_fkey"', (e1, r1) => {
    if (e1) { console.log('Err1:', e1.message); pool.end(); return; }
    pool.query('ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE', (e2, r2) => {
      if (e2) { console.log('Err2:', e2.message); pool.end(); return; }
      pool.query('ALTER TABLE "bookings" DROP CONSTRAINT "bookings_tour_id_fkey"', (e3, r3) => {
        if (e3) { console.log('Err3:', e3.message); pool.end(); return; }
        pool.query('ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tour_id_fkey" FOREIGN KEY ("tourId") REFERENCES "tours" ("id") ON DELETE CASCADE ON UPDATE CASCADE', (e4, r4) => {
          if (e4) { console.log('Err4:', e4.message); pool.end(); return; }
          console.log('SUCCESS: All Booking FK constraints updated to Cascade');
          pool.end();
        });
      });
    });
  });
}).catch(e => {
  console.log('Connect failed:', e.message);
  pool.end();
});