import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();
const BASE='http://127.0.0.1:3000';
async function req(path,opts={}){const r=await fetch(BASE+path,opts);const t=await r.text();let b=null;try{b=t?JSON.parse(t):null;}catch{b=t;}return {status:r.status,body:b,headers:r.headers};}
const stamp=Date.now();
const ADMIN={username:`dbg2_admin_${stamp}`,email:`dbg2_admin_${stamp}@example.com`,password:'DbgAdmin123!'};
const CUST={username:`dbg2_cust_${stamp}`,email:`dbg2_cust_${stamp}@example.com`,password:'DbgCust123!'};
class CookieJar{cookies=new Map();store(r){const sc=r.headers.getSetCookie?.()??[];for(const h of sc){const [pair,...attrs]=h.split(';');const sep=pair.indexOf('=');if(sep<=0)continue;const name=pair.slice(0,sep).trim();const val=pair.slice(sep+1).trim();const expired=attrs.some(a=>/^\s*max-age=0\s*$/i.test(a));if(expired||val==='')this.cookies.delete(name);else this.cookies.set(name,val);}}set(n,v){this.cookies.set(n,v);}header(){return [...this.cookies.entries()].map(([n,v])=>`${n}=${v}`).join('; ');}}
async function rwc(path,jar,options={}){const r=await fetch(BASE+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.method&&options.method!=='GET'?{Origin:BASE}:{}),...(jar.header()?{Cookie:jar.header()}:{}) ,...(options.headers??{})}});const t=await r.text();let b=null;try{b=t?JSON.parse(t):null;}catch{b=t;}const res={status:r.status,body:b,headers:r.headers};jar.store(res);return res;}
async function main(){
  await req('/api/admin/register/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...ADMIN,setup_token:process.env.ADMIN_SETUP_TOKEN})});
  const adminLogin=await req('/api/token/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:ADMIN.username,password:ADMIN.password})});
  const adminToken=adminLogin.body.access;
  const reg=await req('/api/register/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(CUST)});
  const custId=reg.body.id;
  const jar=await (async()=>{const j=new CookieJar();const r=await rwc('/api/token/',j,{...{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(CUST)}});if(r.status!==200)throw new Error('login '+r.status);return j;})();
  // create companies via prisma ACTIVE
  const companyA=await prisma.company.create({data:{name:`Dbg2 Co A ${stamp}`,slug:`dbg2-co-a-${stamp}`,status:'ACTIVE',isPublic:true}});
  const companyB=await prisma.company.create({data:{name:`Dbg2 Co B ${stamp}`,slug:`dbg2-co-b-${stamp}`,status:'ACTIVE',isPublic:true}});
  console.log('companies',companyA.id,companyB.id);
  // assign memberships via admin API
  const ma=await req(`/api/admin/companies/${companyA.id}/members/`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${adminToken}`},body:JSON.stringify({user_id:custId,role:'OWNER'})});
  const mb=await req(`/api/admin/companies/${companyB.id}/members/`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${adminToken}`},body:JSON.stringify({user_id:custId,role:'STAFF'})});
  console.log('memberships',ma.status,mb.status);
  // switch
  const sw=await rwc('/api/company/switch/',jar,{method:'POST',body:JSON.stringify({company_id:companyA.id})});
  console.log('switch',sw.status,sw.body);
  const ctx=await rwc('/api/company/context/',jar);
  console.log('context',ctx.status,ctx.body?.role,ctx.body?.company?.id);
  // cleanup
  await prisma.companyMembership.deleteMany({where:{companyId:{in:[companyA.id,companyB.id]} }});
  await prisma.company.deleteMany({where:{id:{in:[companyA.id,companyB.id]} }});
  await prisma.user.deleteMany({where:{id:custId}});
  // admin
  const adminUser=await prisma.user.findUnique({where:{username:ADMIN.username}});
  if(adminUser) await prisma.user.delete({where:{id:adminUser.id}});
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
