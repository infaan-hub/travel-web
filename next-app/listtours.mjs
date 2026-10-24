import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.tour.findMany({select:{id:true,title:true,companyId:true,available:true}}).then(r=>console.log(JSON.stringify(r,null,2))).finally(()=>p.$disconnect());
