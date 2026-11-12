// Private Vanshawali API (D1 + R2). Requests require same-origin and family membership.
type DB = any; type R2 = any;
type Env = { VANSHAWALI_DB?: DB; VANSHAWALI_FILES?: R2 };
const now=()=>Math.floor(Date.now()/1000);
const uuid=()=>crypto.randomUUID();
const bytes=(a:Uint8Array)=>Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
const sha=async(s:string)=>bytes(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))));
const random=()=>bytes(crypto.getRandomValues(new Uint8Array(32)));
const text=(v:any,n=200)=>typeof v==="string"?v.trim().slice(0,n):"";
const output=(v:any,status=200,headers:Record<string,string>={})=>Response.json(v,{status,headers:{"Cache-Control":"no-store",...headers}});
const err=(msg:string,status=400)=>output({error:msg},status);
const rows=async(db:DB,q:string,...params:any[])=> (await db.prepare(q).bind(...params).all()).results;
async function passwordHash(pass:string,salt:string){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pass),"PBKDF2",false,["deriveBits"]);
 return bytes(new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:120000,hash:"SHA-256"},key,256)));
}
function same(a:string,b:string){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0;}
async function read(req:Request){try{return await req.json()}catch{return null}}
function cookie(req:Request){return (req.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("v360_session="))?.slice(13)||""}
function sessionCookie(value:string,expiry:number){return "v360_session="+value+"; HttpOnly; Secure; SameSite=Strict; Path=/api/live; Max-Age="+expiry;}
async function getUser(db:DB,req:Request){
 const t=cookie(req);
 if(!/^[0-9a-f]{64}$/.test(t))return null;
 return db.prepare("SELECT u.id,u.email,u.display_name FROM auth_sessions s JOIN auth_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?").bind(await sha(t),now()).first();
}
async function role(db:DB,userId:string,familyId:string){
 const r=await db.prepare("SELECT fu.role FROM family_users fu JOIN families f ON f.id=fu.family_id WHERE fu.family_id=? AND fu.auth_subject=? AND f.status='active'").bind(familyId,userId).first();
 return r?.role||null;
}
const canEdit=(r:string)=>["owner","admin","editor"].includes(r);
const canAdmin=(r:string)=>["owner","admin"].includes(r);
function size(url:URL){const n=Number(url.searchParams.get("limit")||50);return Number.isFinite(n)?Math.max(1,Math.min(100,Math.floor(n))):50}
export async function liveApi(req:Request,env:Env):Promise<Response>{
 const db=env.VANSHAWALI_DB;
 if(!db)return err("Database not connected",503);
 const u=new URL(req.url),parts=u.pathname.split("/").filter(Boolean).slice(2),op=parts[0],method=req.method;
 if(!["GET","POST","PATCH","DELETE"].includes(method))return err("Method not allowed",405);
 if(method!=="GET"&&req.headers.get("origin")!==u.origin)return err("Invalid origin",403);
 try{
  if(op==="session"&&method==="GET"){
   const user=await getUser(db,req);
   if(!user)return output({authenticated:false});
   const families=await rows(db,"SELECT f.id,f.name,fu.role FROM families f JOIN family_users fu ON f.id=fu.family_id WHERE fu.auth_subject=? AND f.status='active' ORDER BY f.created_at DESC",user.id);
   return output({authenticated:true,user,families});
  }
  if(op==="setup"&&method==="POST"){
   const b=await read(req),token=text(b?.token,200),email=text(b?.email,254).toLowerCase(),name=text(b?.name,100),pass=b?.password;
   if(!name||!email.includes("@")||typeof pass!=="string"||pass.length<14||pass.length>256)return err("Name, email and password (14+ characters) required");
   const count=await db.prepare("SELECT COUNT(*) AS total FROM auth_users").first();
   if(count.total>0)return err("Initial setup already completed",403);
   const tokenHash=await sha(token),issuedAt=now();
   const available=await db.prepare("SELECT token_hash FROM setup_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>?").bind(tokenHash,issuedAt).first();
   if(!available)return err("Invalid or expired setup token",403);
   // Do all expensive crypto BEFORE consuming the one-time token. D1 batch is atomic.
   const salt=random(),hash=await passwordHash(pass,salt),userId=uuid();
   await db.batch([
    db.prepare("INSERT INTO auth_users(id,email,display_name,password_salt,password_hash) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM setup_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>?) AND NOT EXISTS (SELECT 1 FROM auth_users)").bind(userId,email,name,salt,hash,tokenHash,issuedAt),
    db.prepare("UPDATE setup_tokens SET used_at=? WHERE token_hash=? AND used_at IS NULL AND EXISTS (SELECT 1 FROM auth_users WHERE id=?)").bind(issuedAt,tokenHash,userId)
   ]);
   const created=await db.prepare("SELECT id FROM auth_users WHERE id=?").bind(userId).first();
   if(!created)return err("Setup token already used",409);
   return output({success:true},201);
  }
  if(op==="register"&&method==="POST"){
   const b=await read(req),email=text(b?.email,254).toLowerCase(),name=text(b?.name,100),pass=b?.password,token=text(b?.token,200);
   if(!name||!email.includes("@")||typeof pass!=="string"||pass.length<14||pass.length>256)return err("Name, email, invite token and password (14+ characters) required");
   const h=await sha(token);
   const invite=await db.prepare("SELECT family_id,role FROM family_invites WHERE token_hash=? AND accepted_at IS NULL AND expires_at>?").bind(h,now()).first();
   if(!invite)return err("Invalid or expired invitation",403);
   const salt=random(),newUser=uuid(),hash=await passwordHash(pass,salt);
   await db.batch([
    db.prepare("INSERT INTO auth_users(id,email,display_name,password_salt,password_hash) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM family_invites WHERE token_hash=? AND accepted_at IS NULL AND expires_at>?)").bind(newUser,email,name,salt,hash,h,now()),
    db.prepare("INSERT INTO family_users(id,family_id,auth_subject,role) SELECT ?,family_id,?,role FROM family_invites WHERE token_hash=? AND accepted_at IS NULL AND EXISTS (SELECT 1 FROM auth_users WHERE id=?)").bind(uuid(),newUser,h,newUser),
    db.prepare("UPDATE family_invites SET accepted_at=?,accepted_by=? WHERE token_hash=? AND accepted_at IS NULL AND EXISTS (SELECT 1 FROM auth_users WHERE id=?)").bind(now(),newUser,h,newUser)
   ]);
   const created=await db.prepare("SELECT id FROM auth_users WHERE id=?").bind(newUser).first();
   if(!created)return err("Invitation already used",409);
   return output({success:true},201);
  }
  if(op==="login"&&method==="POST"){
   const b=await read(req),email=text(b?.email,254).toLowerCase(),pass=b?.password;
   if(!email||typeof pass!=="string"||pass.length>256)return err("Invalid login",401);
   const key=await sha(email+"|"+(req.headers.get("CF-Connecting-IP")||"unknown"));
   const previous=await db.prepare("SELECT * FROM login_attempts WHERE key=?").bind(key).first(),t=now();
   if(previous?.blocked_until>t)return err("Too many attempts",429);
   const user=await db.prepare("SELECT * FROM auth_users WHERE email=?").bind(email).first();
   const hash=await passwordHash(pass,user?.password_salt||"unknown-user");
   if(!user||!same(hash,user.password_hash)){
    const valid=previous&&t-previous.window_started<900;
    const n=valid?previous.attempts+1:1;
    await db.prepare("INSERT INTO login_attempts(key,attempts,window_started,blocked_until) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts,window_started=excluded.window_started,blocked_until=excluded.blocked_until").bind(key,n,valid?previous.window_started:t,n>=8?t+900:0).run();
    return err("Invalid email or password",401);
   }
   await db.prepare("DELETE FROM login_attempts WHERE key=?").bind(key).run();
   const tkn=random();
   await db.prepare("INSERT INTO auth_sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)").bind(await sha(tkn),user.id,t,t+604800).run();
   return output({success:true},200,{"Set-Cookie":sessionCookie(tkn,604800)});
  }
  if(op==="logout"&&method==="POST"){
   const old=cookie(req);
   if(old)await db.prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await sha(old)).run();
   return output({success:true},200,{"Set-Cookie":sessionCookie("",0)});
  }
  const user=await getUser(db,req);
  if(!user)return err("Login required",401);
  if(op==="families"){
   if(method==="GET")return output({items:await rows(db,"SELECT f.id,f.name,fu.role FROM families f JOIN family_users fu ON f.id=fu.family_id WHERE fu.auth_subject=? ORDER BY f.created_at DESC",user.id)});
   if(method==="POST"){
    const b=await read(req),name=text(b?.name,120);if(name.length<2)return err("Family name required");
    const fid=uuid();
    await db.prepare("INSERT INTO families(id,name,slug) VALUES(?,?,?)").bind(fid,name,"family-"+fid.slice(0,12)).run();
    await db.prepare("INSERT INTO family_users(id,family_id,auth_subject,role) VALUES(?,?,?,?)").bind(uuid(),fid,user.id,"owner").run();
    return output({id:fid,name},201);
   }
  }
  if(op==="accept-invite"&&method==="POST"){
   const b=await read(req),h=await sha(text(b?.token,128));
   const inv=await db.prepare("UPDATE family_invites SET accepted_at=?,accepted_by=? WHERE token_hash=? AND accepted_at IS NULL AND expires_at>? RETURNING family_id,role").bind(now(),user.id,h,now()).first();
   if(!inv)return err("Invite invalid or expired",403);
   await db.prepare("INSERT OR IGNORE INTO family_users(id,family_id,auth_subject,role) VALUES(?,?,?,?)").bind(uuid(),inv.family_id,user.id,inv.role).run();
   return output({success:true},200);
  }
  if(op!=="family"||!parts[1])return err("Not found",404);
  const family=parts[1],resource=parts[2],record=parts[3],access=await role(db,user.id,family);
  if(!access)return err("Family access denied",403);
  const writable=canEdit(access);
  if(resource==="members"){
   if(method==="GET")return output({items:await rows(db,"SELECT * FROM members WHERE family_id=? ORDER BY created_at DESC LIMIT ?",family,size(u))});
   if(!writable)return err("Read only",403);
   if(method==="POST"){
    const b=await read(req),name=text(b?.full_name,150);if(!name)return err("Full name required");
    const mid=uuid(),gender=["male","female","other","unknown"].includes(b?.gender)?b.gender:"unknown";
    await db.prepare("INSERT INTO members(id,family_id,full_name,gender,birth_date,notes) VALUES(?,?,?,?,?,?)").bind(mid,family,name,gender,text(b?.birth_date,30)||null,text(b?.notes,1500)||null).run();
    return output({id:mid},201);
   }
   if(record&&method==="PATCH"){
    const b=await read(req);if(!text(b?.full_name,150))return err("Full name required");
    const result=await db.prepare("UPDATE members SET full_name=?,gender=?,birth_date=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE family_id=? AND id=? RETURNING id").bind(text(b.full_name,150),["male","female","other","unknown"].includes(b?.gender)?b.gender:"unknown",text(b?.birth_date,30)||null,text(b?.notes,1500)||null,family,record).first();
    return result?output({success:true}):err("Member not found",404);
   }
   if(record&&method==="DELETE"){await db.prepare("DELETE FROM members WHERE family_id=? AND id=?").bind(family,record).run();return output({success:true});}
  }
  if(resource==="households"){
   if(method==="GET")return output({items:await rows(db,"SELECT * FROM households WHERE family_id=? ORDER BY created_at DESC LIMIT ?",family,size(u))});
   if(method==="POST"&&writable){const b=await read(req),title=text(b?.title,120);if(!title)return err("Name required");const hid=uuid();await db.prepare("INSERT INTO households(id,family_id,title,ward,address) VALUES(?,?,?,?,?)").bind(hid,family,title,text(b?.ward,50)||null,text(b?.address,200)||null).run();return output({id:hid},201);}
  }
  if(resource==="relationships"){
   if(method==="GET")return output({items:await rows(db,"SELECT * FROM relationships WHERE family_id=? ORDER BY created_at DESC LIMIT ?",family,size(u))});
   if(method==="POST"&&writable){
    const b=await read(req),kind=b?.relationship_type;if(!["parent","spouse","sibling","other"].includes(kind)||!b?.member_id||!b?.related_member_id||b.member_id===b.related_member_id)return err("Invalid relationship");
    const rid=uuid();await db.prepare("INSERT INTO relationships(id,family_id,member_id,related_member_id,relationship_type) VALUES(?,?,?,?,?)").bind(rid,family,b.member_id,b.related_member_id,kind).run();
    return output({id:rid},201);
   }
   if(record&&method==="DELETE"&&writable){await db.prepare("DELETE FROM relationships WHERE family_id=? AND id=?").bind(family,record).run();return output({success:true});}
  }
  if(resource==="events"){
   if(method==="GET")return output({items:await rows(db,"SELECT * FROM events WHERE family_id=? ORDER BY created_at DESC LIMIT ?",family,size(u))});
   if(method==="POST"&&writable){
    const b=await read(req),title=text(b?.title,150),kind=text(b?.event_type,60);if(!title||!kind)return err("Title and type required");
    const eid=uuid();await db.prepare("INSERT INTO events(id,family_id,title,event_type,starts_at,location,description) VALUES(?,?,?,?,?,?,?)").bind(eid,family,title,kind,text(b?.starts_at,40)||null,text(b?.location,200)||null,text(b?.description,1000)||null).run();
    return output({id:eid},201);
   }
  }
  if(resource==="invitations"){
   if(method==="GET")return output({items:await rows(db,"SELECT * FROM invitations WHERE family_id=? ORDER BY created_at DESC LIMIT ?",family,size(u))});
   if(method==="POST"&&writable){
    const b=await read(req);if(!b?.event_id||!text(b?.template,50))return err("Event and template required");
    const exists=await db.prepare("SELECT id FROM events WHERE family_id=? AND id=?").bind(family,b.event_id).first();if(!exists)return err("Event not found",404);
    const iid=uuid();await db.prepare("INSERT INTO invitations(id,family_id,event_id,template,content_json) VALUES(?,?,?,?,?)").bind(iid,family,b.event_id,text(b.template,50),JSON.stringify(b?.content||{}).slice(0,10000)).run();
    return output({id:iid},201);
   }
  }
  if(resource==="passbook"){
   if(method==="GET"){
    const items=await rows(db,"SELECT * FROM passbook_entries WHERE family_id=? ORDER BY occurred_at DESC LIMIT ?",family,size(u));
    const total=await db.prepare("SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount_paisa ELSE -amount_paisa END),0) AS balance_paisa FROM passbook_entries WHERE family_id=?").bind(family).first();
    return output({items,balance_paisa:total?.balance_paisa||0});
   }
   if(method==="POST"&&writable){
    const b=await read(req),amount=Number(b?.amount_paisa);
    if(!Number.isSafeInteger(amount)||amount<=0||!["credit","debit"].includes(b?.entry_type)||!text(b?.description,300))return err("Invalid passbook entry");
    const pid=uuid();await db.prepare("INSERT INTO passbook_entries(id,family_id,member_id,amount_paisa,entry_type,description) VALUES(?,?,?,?,?,?)").bind(pid,family,null,amount,b.entry_type,text(b.description,300)).run();return output({id:pid},201);
   }
  }
  if(resource==="files"){
   const bucket=env.VANSHAWALI_FILES;if(!bucket)return err("R2 not connected",503);
   if(method==="GET"&&!record)return output({items:await rows(db,"SELECT id,original_filename,content_type,size_bytes,created_at FROM media_files WHERE family_id=? ORDER BY created_at DESC LIMIT ?",family,size(u))});
   if(method==="POST"&&writable){
    const mime=(req.headers.get("content-type")||"").split(";")[0].toLowerCase(),ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"} as any)[mime];
    if(!ext)return err("Only JPEG, PNG, WebP and PDF",415);
    if(Number(req.headers.get("content-length")||0)>8388608)return err("8 MB maximum",413);
    const data=await req.arrayBuffer();if(!data.byteLength||data.byteLength>8388608)return err("8 MB maximum",413);
    const fid=uuid(),key="families/"+family+"/"+fid+"."+ext,name=text(u.searchParams.get("name"),180)||"upload";
    await bucket.put(key,data,{httpMetadata:{contentType:mime}});
    try{await db.prepare("INSERT INTO media_files(id,family_id,object_key,original_filename,content_type,size_bytes,visibility) VALUES(?,?,?,?,?,?,?)").bind(fid,family,key,name,mime,data.byteLength,"private").run();}
    catch(e){await bucket.delete(key);throw e;}
    return output({id:fid,name},201);
   }
   if(record&&parts[4]==="download"&&method==="GET"){
    const row=await db.prepare("SELECT * FROM media_files WHERE family_id=? AND id=?").bind(family,record).first();if(!row)return err("File not found",404);
    const file=await bucket.get(row.object_key);if(!file)return err("File missing",404);
    return new Response(file.body,{headers:{"Content-Type":row.content_type,"Content-Disposition":"attachment; filename*=UTF-8''"+encodeURIComponent(row.original_filename),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
   }
   if(record&&method==="DELETE"&&writable){
    const row=await db.prepare("SELECT object_key FROM media_files WHERE family_id=? AND id=?").bind(family,record).first();if(!row)return err("File not found",404);
    await bucket.delete(row.object_key);await db.prepare("DELETE FROM media_files WHERE family_id=? AND id=?").bind(family,record).run();return output({success:true});
   }
  }
  if(resource==="invites"&&method==="POST"&&canAdmin(access)){
   const b=await read(req),inviteRole=text(b?.role,20);if(!["admin","editor","viewer"].includes(inviteRole))return err("Invalid role");
   const token=random();await db.prepare("INSERT INTO family_invites(token_hash,family_id,role,expires_at,created_by) VALUES(?,?,?,?,?)").bind(await sha(token),family,inviteRole,now()+172800,user.id).run();
   return output({token,role:inviteRole,valid_hours:48},201);
  }
  return err("Not available or insufficient permission",403);
 }catch(e:any){
  console.error("Private endpoint error",e?.name||"unknown");
  if(String(e?.message||"").includes("UNIQUE constraint"))return err("Already exists",409);
  if(String(e?.message||"").includes("FOREIGN KEY constraint"))return err("Related record missing or in use",409);
  return err("Operation failed",500);
 }
}
