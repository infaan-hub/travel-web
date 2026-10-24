import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
Promise.all([p.tour.count(),p.attraction.count(),p.travelTip.count(),p.user.count(),p.company.count()]).then(r=>console.log('tours',r[0],'attractions',r[1],'tips',r[2],'users',r[3],'companies',r[4])).finally(()=>p.$disconnect());
