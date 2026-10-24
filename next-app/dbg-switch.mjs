const BASE='http://127.0.0.1:3000';
async function req(path,opts={}){const r=await fetch(BASE+path,opts);const t=await r.text();let b=null;try{b=t?JSON.parse(t):null;}catch{b=t;}return {status:r.status,body:b,headers:r.headers};}
const stamp=Date.now();
const ADMIN={username:`dbg_admin_${stamp}`,email:`dbg_admin_${stamp}@example.com`,password:'DbgAdmin123!'};
const CUST={username:`dbg_cust_${stamp}`,email:`dbg_cust_${stamp}@example.com`,password:'DbgCust123!'};
async function main(){
  // register admin
  await req('/api/admin/register/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...ADMIN,setup_token:process.env.ADMIN_SETUP_TOKEN})});
  const adminLogin=await req('/api/token/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:ADMIN.username,password:ADMIN.password})});
  const adminToken=adminLogin.body.access;
  console.log('admin token', !!adminToken);
  // register customer
  const reg=await req('/api/register/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(CUST)});
  console.log('register customer', reg.status, reg.body?.id);
  const custId=reg.body.id;
  const custLogin=await req('/api/token/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:CUST.username,password:CUST.password})});
  const custToken=custLogin.body.access;
  console.log('cust token', !!custToken);
  // create company via prisma? Use admin endpoint? Check if admin companies create exists. Instead use prisma via node? We'll call /api/admin/companies maybe.
  const comp=await req('/api/admin/companies/',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${adminToken}`},body:JSON.stringify({name:`Dbg Co ${stamp}`,slug:`dbg-co-${stamp}`,status:'ACTIVE',isPublic:true})});
  console.log('create company', comp.status, comp.body);
  const companyId=comp.body?.id;
  // assign membership
  const mem=await req(`/api/admin/companies/${companyId}/members/`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${adminToken}`},body:JSON.stringify({user_id:custId,role:'OWNER'})});
  console.log('assign membership', mem.status, mem.body);
  // switch via bearer
  const sw=await req('/api/company/switch/',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${custToken}`},body:JSON.stringify({company_id:companyId})});
  console.log('switch bearer', sw.status, sw.body);
  // context
  const ctx=await req('/api/company/context/',{headers:{Authorization:`Bearer ${custToken}`}});
  console.log('context bearer', ctx.status, ctx.body);
}
main().catch(e=>{console.error(e);process.exit(1);});
