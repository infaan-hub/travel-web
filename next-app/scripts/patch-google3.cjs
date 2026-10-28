const fs = require('fs');
const p = 'D:/travel-web/next-app/src/app/api/auth/google/callback/route.ts';
let s = fs.readFileSync(p,'utf8');
s = s.replace('   } catch {\n     return loginErrorRedirect(request, "google_sign_in_failed");\n   }',
              '   } catch (error) {\n     console.error("google callback failed", error);\n     return loginErrorRedirect(request, "google_sign_in_failed");\n   }');
fs.writeFileSync(p,s);
console.log('done');