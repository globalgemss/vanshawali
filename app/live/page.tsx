"use client";
import {useCallback,useEffect,useState} from "react";
import {TreePine,Users,GitBranch,CalendarDays,Wallet,Images,Home,ScrollText,LogOut,Plus,ShieldCheck,KeyRound,RefreshCw,Link2,Trash2,Pencil,ArrowLeft,CheckCircle,Download,Upload,Mail,FolderOpen} from "lucide-react";
import "./live.css";

type AnyRow=Record<string,any>;
type Family={id:string,name:string,role:string};
type Tab="members"|"households"|"relationships"|"events"|"invitations"|"passbook"|"files"|"invites";
const tabs:{id:Tab;name:string;icon:any}[]=[
 {id:"members",name:"सदस्यहरू",icon:Users},{id:"households",name:"घरधुरी",icon:Home},
 {id:"relationships",name:"नातासम्बन्ध",icon:GitBranch},{id:"events",name:"कार्यक्रम",icon:CalendarDays},
 {id:"invitations",name:"निमन्त्रणा",icon:Mail},{id:"passbook",name:"Digital Passbook",icon:Wallet},
 {id:"files",name:"फोटो तथा फाइल",icon:Images},{id:"invites",name:"User Access",icon:ShieldCheck}
];
const empty:Record<Tab,AnyRow>={
 members:{full_name:"",gender:"unknown",birth_date:"",notes:""},
 households:{title:"",ward:"",address:""},
 relationships:{member_id:"",related_member_id:"",relationship_type:"parent"},
 events:{title:"",event_type:"family-gathering",starts_at:"",location:"",description:""},
 invitations:{event_id:"",template:"royal-wedding",message:""},
 passbook:{entry_type:"credit",amount:"",description:""},
 files:{},invites:{role:"viewer"}
};
const money=(n:number)=>"रु. "+(Number(n||0)/100).toLocaleString("en-NP",{minimumFractionDigits:2,maximumFractionDigits:2});
async function api(path:string,method="GET",data?:any){
 const response=await fetch("/api/live/"+path,{method,credentials:"same-origin",headers:data===undefined?undefined:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data)});
 const parsed=await response.json().catch(()=>({error:"Invalid server response"}));
 if(!response.ok)throw new Error(parsed.error||"Request failed");
 return parsed;
}
const inputFields:Partial<Record<Tab,{key:string,label:string,type?:string}[]>>={
 members:[{key:"full_name",label:"पूरा नाम *"},{key:"gender",label:"लिङ्ग"},{key:"birth_date",label:"जन्म मिति/वर्ष"},{key:"notes",label:"थप विवरण"}],
 households:[{key:"title",label:"घरधुरीको नाम *"},{key:"ward",label:"वडा"},{key:"address",label:"ठेगाना"}],
 events:[{key:"title",label:"कार्यक्रमको नाम *"},{key:"event_type",label:"कार्यक्रमको प्रकार"},{key:"starts_at",label:"मिति र समय",type:"datetime-local"},{key:"location",label:"स्थान"},{key:"description",label:"विवरण"}],
 passbook:[{key:"entry_type",label:"कारोबार प्रकार"},{key:"amount",label:"रकम (NPR) *",type:"number"},{key:"description",label:"विवरण *"}]
};
export default function LiveWorkspace(){
 const [session,setSession]=useState<any>(null),[mode,setMode]=useState<"login"|"setup"|"register">("login"),[authForm,setAuthForm]=useState({name:"",email:"",password:"",token:""});
 const [families,setFamilies]=useState<Family[]>([]),[family,setFamily]=useState(""),[familyName,setFamilyName]=useState("");
 const [tab,setTab]=useState<Tab>("members"),[items,setItems]=useState<AnyRow[]>([]),[members,setMembers]=useState<AnyRow[]>([]),[events,setEvents]=useState<AnyRow[]>([]);
 const [form,setForm]=useState<AnyRow>({...empty.members}),[editing,setEditing]=useState(""),[balance,setBalance]=useState(0);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[invite,setInvite]=useState("");
 const writable=families.find(f=>f.id===family)?.role!=="viewer";
 const admin=["owner","admin"].includes(families.find(f=>f.id===family)?.role||"");
 const refreshSession=useCallback(async()=>{setLoading(true);try{const r=await api("session");setSession(r);setFamilies(r.families||[]);setFamily(old=>r.families?.some((f:Family)=>f.id===old)?old:(r.families?.[0]?.id||""));}catch(e:any){setError(e.message)}finally{setLoading(false)}},[]);
 useEffect(()=>{refreshSession()},[refreshSession]);
 const load=useCallback(async(fid:string,section:Tab)=>{
  if(!fid)return;setLoading(true);setError("");
  try{
   const [main,pe,ev]=await Promise.all([api("family/"+fid+"/"+section),api("family/"+fid+"/members"),api("family/"+fid+"/events")]);
   setItems(main.items||[]);setBalance(main.balance_paisa||0);setMembers(pe.items||[]);setEvents(ev.items||[]);
  }catch(e:any){setError(e.message)}finally{setLoading(false)}
 },[]);
 useEffect(()=>{if(family){setForm({...empty[tab]});setEditing("");load(family,tab)}},[family,tab,load]);
 async function authenticate(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{
  if(mode==="login"){await api("login","POST",{email:authForm.email,password:authForm.password});await refreshSession();setNotice("Welcome to Vanshawali 360");}
  else {await api(mode,"POST",authForm);setMode("login");setAuthForm(p=>({...p,password:"",token:""}));setNotice("Account created. Please sign in.");}
 }catch(ex:any){setError(ex.message)}finally{setBusy(false)}}
 async function createFamily(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{await api("families","POST",{name:familyName});setFamilyName("");await refreshSession();setNotice("नयाँ परिवार दर्ता भयो।");}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function save(e:React.FormEvent){e.preventDefault();if(!family)return;setBusy(true);setError("");try{
  const payload={...form};
  if(tab==="passbook"){const v=Number(form.amount);if(!Number.isFinite(v)||v<=0)throw new Error("रकम सही राख्नुहोस्");payload.amount_paisa=Math.round(v*100);delete payload.amount;}
  if(tab==="invitations"){payload.content={message:form.message};delete payload.message;}
  const path="family/"+family+"/"+tab+(editing?"/"+editing:"");
  await api(path,editing?"PATCH":"POST",payload);setNotice(editing?"अभिलेख अद्यावधिक भयो।":"अभिलेख सुरक्षित भयो।");
  setEditing("");setForm({...empty[tab]});await load(family,tab);
 }catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function remove(record:string){if(!family||!confirm("यो अभिलेख हटाउने? यो कार्य उल्ट्याउन नसकिन सक्छ।"))return;setBusy(true);setError("");try{await api("family/"+family+"/"+tab+"/"+record,"DELETE");setNotice("हटाइयो।");await load(family,tab)}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function upload(event:React.ChangeEvent<HTMLInputElement>){const f=event.target.files?.[0];if(!family||!f)return;setBusy(true);setError("");try{
  if(f.size>8*1024*1024)throw new Error("Maximum 8 MB per file");
  const res=await fetch("/api/live/family/"+family+"/files?name="+encodeURIComponent(f.name),{method:"POST",headers:{"Content-Type":f.type},credentials:"same-origin",body:f});
  const data=await res.json();if(!res.ok)throw new Error(data.error||"Upload failed");
  setNotice("फाइल निजी R2 Storage मा सुरक्षित भयो।");await load(family,"files");
 }catch(e:any){setError(e.message)}finally{setBusy(false);event.target.value=""}}
 async function makeInvite(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{
  const r=await api("family/"+family+"/invites","POST",{role:form.role});
  setInvite(r.token);setNotice("निमन्त्रणा Token सिर्जना भयो। ४८ घण्टासम्म मान्य छ।");
 }catch(e:any){setError(e.message)}finally{setBusy(false)}}
 async function logout(){await api("logout","POST");setSession({authenticated:false});setFamilies([]);setFamily("");setNotice("");}
 const update=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
 const select=(t:Tab)=>{setTab(t);setItems([]);setInvite("");setEditing("");setForm({...empty[t]})};
 return <div className="vl-page">
  <header className="vl-header"><div className="vl-mark"><TreePine size={27}/><div><b>Vanshawali <span>360</span></b><small>LIVE FAMILY MANAGEMENT</small></div></div><div className="vl-toplinks"><a href="/"><ArrowLeft size={15}/> Demo Website</a>{session?.authenticated&&<button onClick={logout}><LogOut size={15}/> Logout</button>}</div></header>
  <main className="vl-wrap">
   {error&&<div className="vl-alert vl-error" role="alert">{error}<button onClick={()=>setError("")}>✕</button></div>}
   {notice&&<div className="vl-alert vl-ok" role="status"><CheckCircle size={17}/>{notice}<button onClick={()=>setNotice("")}>✕</button></div>}
   {loading&&!session?<div className="vl-wait"><RefreshCw className="vl-spin"/> जाँच हुँदैछ...</div>:null}
   {session&&!session.authenticated?<section className="vl-auth vl-panel">
    <div className="vl-heading"><span className="vl-eyebrow">SECURE PRIVATE WORKSPACE</span><h1>{mode==="setup"?"पहिलो Admin खाता":mode==="register"?"निमन्त्रित सदस्य दर्ता":"सुरक्षित Login"}</h1><p>तपाईंको वास्तविक पारिवारिक डेटा Cloudflare D1 र Private R2 मा राखिनेछ।</p></div>
    <div className="vl-mode"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Login</button><button className={mode==="setup"?"active":""} onClick={()=>setMode("setup")}>Initial Setup</button><button className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Invite Registration</button></div>
    <form onSubmit={authenticate} className="vl-form">
      {mode!=="login"&&<label>पूरा नाम<input required value={authForm.name} onChange={e=>setAuthForm(p=>({...p,name:e.target.value}))} autoComplete="name"/></label>}
      <label>Email<input type="email" required value={authForm.email} onChange={e=>setAuthForm(p=>({...p,email:e.target.value}))} autoComplete="email"/></label>
      <label>Password<input type="password" minLength={mode==="login"?1:14} required value={authForm.password} onChange={e=>setAuthForm(p=>({...p,password:e.target.value}))} autoComplete={mode==="login"?"current-password":"new-password"}/></label>
      {mode!=="login"&&<label>{mode==="setup"?"Setup Token":"Invitation Token"}<input required value={authForm.token} onChange={e=>setAuthForm(p=>({...p,token:e.target.value}))} autoComplete="off"/></label>}
      <button className="vl-primary" disabled={busy} type="submit"><KeyRound size={17}/>{busy?"प्रक्रियामा...":mode==="login"?"Login":mode==="setup"?"Create Admin Account":"Register Securely"}</button>
    </form>
    <p className="vl-small">Demo Screen को स्थानीय डेटा यहाँ स्वतः Import हुँदैन। निजी डेटा राख्नुअघि अलग परिवार सिर्जना गर्नुहोस्।</p>
   </section>:null}
   {session?.authenticated&&<div className="vl-main">
    <section className="vl-intro vl-panel"><div><span className="vl-eyebrow">LIVE · CLOUDFLARE D1 + R2</span><h1>नमस्कार, {session.user.display_name}</h1><p>परिवारको वास्तविक डेटा, नातासम्बन्ध, आर्थिक अभिलेख र सुरक्षित फाइल व्यवस्थापन।</p></div><span className="vl-secure"><ShieldCheck size={16}/> Private Workspace</span></section>
    <div className="vl-context vl-panel"><div><label>हालको परिवार<select value={family} onChange={e=>setFamily(e.target.value)}><option value="">परिवार छनोट गर्नुहोस्</option>{families.map(f=><option value={f.id} key={f.id}>{f.name} ({f.role})</option>)}</select></label></div><form onSubmit={createFamily}><label>नयाँ परिवार खोल्नुहोस्<input required value={familyName} onChange={e=>setFamilyName(e.target.value)} placeholder="परिवार / वंशावलीको नाम"/></label><button type="submit" disabled={busy||familyName.trim().length<2}><Plus size={17}/> Create</button></form></div>
    {family?<div className="vl-panel vl-work">
     <div className="vl-toolbar">{tabs.filter(t=>t.id!=="invites"||admin).map(t=><button key={t.id} className={t.id===tab?"active":""} onClick={()=>select(t.id)}><t.icon size={17}/>{t.name}</button>)}</div>
     <div className="vl-workbody"><div className="vl-sectiontitle"><h2>{tabs.find(t=>t.id===tab)?.name}</h2><span>{loading?"Loading...":items.length+" records"}</span></div>
     {tab==="passbook"&&<div className="vl-balance"><small>हालको Balance</small><strong>{money(balance)}</strong></div>}
     {tab==="files"?<div className="vl-upload"><FolderOpen size={25}/><div><b>निजी फाइल राख्नुहोस्</b><p>JPEG, PNG, WebP वा PDF · अधिकतम 8 MB</p></div>{writable&&<label className="vl-primary"><Upload size={16}/> Upload<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={upload} disabled={busy}/></label>}</div>:null}
     {tab==="invites"&&admin?<form onSubmit={makeInvite} className="vl-new"><label>User Role<select value={form.role||"viewer"} onChange={e=>update("role",e.target.value)}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></label><button className="vl-primary" disabled={busy}><Link2 size={15}/> Generate Invite</button>{invite&&<div className="vl-token"><b>एकपटक मात्र देखाइने Invite Token</b><code>{invite}</code><button type="button" onClick={()=>navigator.clipboard.writeText(invite)}>Copy Token</button><small>सदस्यले Invite Registration मा यो Token राखेर खाता बनाउन सक्छन्। Token 48 घण्टा मान्य हुन्छ।</small></div>}</form>:null}
     {tab!=="files"&&tab!=="invites"&&writable?<form className="vl-new" onSubmit={save}>
      <h3>{editing?"अभिलेख संशोधन":"नयाँ "+tabs.find(t=>t.id===tab)?.name+" थप्नुहोस्"}</h3>
      {(inputFields[tab]||[]).map(field=><label key={field.key}>{field.label}
       {field.key==="gender"?<select value={form.gender||"unknown"} onChange={e=>update("gender",e.target.value)}><option value="unknown">अज्ञात</option><option value="male">पुरुष</option><option value="female">महिला</option><option value="other">अन्य</option></select>:
       field.key==="entry_type"?<select value={form.entry_type} onChange={e=>update("entry_type",e.target.value)}><option value="credit">आम्दानी (+)</option><option value="debit">खर्च (−)</option></select>:
       <input type={field.type||"text"} step={field.type==="number"?"0.01":undefined} value={form[field.key]||""} onChange={e=>update(field.key,e.target.value)}/>}
      </label>)}
      {tab==="relationships"&&<><label>सदस्य<select value={form.member_id} onChange={e=>update("member_id",e.target.value)}><option value="">सदस्य छान्नुहोस्</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label><label>सम्बन्धित सदस्य<select value={form.related_member_id} onChange={e=>update("related_member_id",e.target.value)}><option value="">सदस्य छान्नुहोस्</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label><label>नाता<select value={form.relationship_type} onChange={e=>update("relationship_type",e.target.value)}><option value="parent">Parent → Child</option><option value="spouse">Spouse</option><option value="sibling">Sibling</option><option value="other">Other</option></select></label></>}
      {tab==="invitations"&&<><label>कार्यक्रम<select value={form.event_id||""} onChange={e=>update("event_id",e.target.value)}><option value="">कार्यक्रम छान्नुहोस्</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></label><label>Card Template<select value={form.template||"royal-wedding"} onChange={e=>update("template",e.target.value)}><option value="royal-wedding">Royal Wedding</option><option value="bratabandha">Bratabandha</option><option value="kul-puja">Kul Puja</option><option value="condolence">Condolence</option></select></label><label>कार्ड सन्देश<input value={form.message||""} onChange={e=>update("message",e.target.value)}/></label></>}
      <button className="vl-primary" type="submit" disabled={busy}><Plus size={16}/>{editing?"Update":"Save to D1"}</button>{editing&&<button type="button" onClick={()=>{setEditing("");setForm({...empty[tab]})}}>Cancel</button>}
     </form>:null}
     <div className="vl-records">{items.length===0?<p className="vl-empty">अहिले अभिलेख छैन। पहिलो विवरण थपेर सुरु गर्नुहोस्।</p>:items.map((item,i)=><article className="vl-record" key={item.id||i}>
      <div><b>{tab==="members"?item.full_name:tab==="households"?item.title:tab==="events"?item.title:tab==="invitations"?(events.find(e=>e.id===item.event_id)?.title||item.template):tab==="relationships"?(members.find(m=>m.id===item.member_id)?.full_name||"Member")+" → "+(members.find(m=>m.id===item.related_member_id)?.full_name||"Member"):tab==="passbook"?item.description:item.original_filename}</b>
      <small>{tab==="passbook"?((item.entry_type==="credit"?"+":"−")+money(item.amount_paisa)):tab==="files"?(Math.round(item.size_bytes/1024)+" KB"):tab==="members"?(item.birth_date||item.gender):tab==="events"?(item.starts_at||item.location||""):tab==="relationships"?item.relationship_type:tab==="households"?(item.address||""):item.created_at}</small></div>
      <div className="vl-actions">{tab==="files"&&<a title="Download" href={"/api/live/family/"+family+"/files/"+item.id+"/download"}><Download size={16}/></a>}{tab==="members"&&writable&&<button title="Edit" onClick={()=>{setEditing(item.id);setForm({full_name:item.full_name,gender:item.gender||"unknown",birth_date:item.birth_date||"",notes:item.notes||""})}}><Pencil size={16}/></button>}{writable&&["members","relationships","files"].includes(tab)&&<button title="Delete" onClick={()=>remove(item.id)}><Trash2 size={16}/></button>}</div>
     </article>)}</div>
     </div>
    </div>:<div className="vl-panel vl-empty">अहिले कुनै परिवार छैन। माथि नयाँ परिवार बनाएर सुरु गर्नुहोस्।</div>}
   </div>}
  </main>
 </div>
}
