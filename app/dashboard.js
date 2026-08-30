 "use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";

const labels={en_refugio:"En refugio",hogar_temporal:"Hogar temporal",adoptado:"Adoptado",trasladado:"Trasladado",reubicado:"Reubicado",fallecido:"Fallecido",regreso_propietario:"Regreso con propietario",otro:"Otro"};
const eventLabels={ingreso:"Ingreso",salida:"Salida",nota:"Nota",vacuna:"Vacuna",esterilizacion:"Esterilización",tratamiento:"Tratamiento",desparasitacion:"Desparasitación",medicamento:"Medicamento"};

export default function Dashboard(){
 const supabase=createClient();
 const searchParams=useSearchParams();
 const [animals,setAnimals]=useState([]),[events,setEvents]=useState([]),[selected,setSelected]=useState(null),[photos,setPhotos]=useState([]),[tab,setTab]=useState("dashboard");
 const [showIngreso,setShowIngreso]=useState(false),[showEvent,setShowEvent]=useState(false),[showExit,setShowExit]=useState(false),[showQR,setShowQR]=useState(false),[saving,setSaving]=useState(false),[q,setQ]=useState("");
 const [form,setForm]=useState({name:"",species:"perro",sex:"desconocido",estimated_age:"",intake_date:new Date().toISOString().slice(0,10),intake_reason:"Rescate",found_location:"",health_status:"",sterilized:false,vaccinated:false,notes:""});
 const [eventForm,setEventForm]=useState({event_type:"nota",event_date:new Date().toISOString().slice(0,10),reason:"",description:""});
 const [exitForm,setExitForm]=useState({event_date:new Date().toISOString().slice(0,10),reason:"Adopción",description:""});
 const [photo,setPhoto]=useState(null);

 async function load(){
  const [{data:a},{data:e}]=await Promise.all([
   supabase.from("animals").select("*").order("created_at",{ascending:false}),
   supabase.from("animal_events").select("*, animals(name,record_number)").order("event_date",{ascending:false}).limit(30)
  ]);
  setAnimals(a||[]);setEvents(e||[]);
  if(selected){const fresh=(a||[]).find(x=>x.id===selected.id);if(fresh)setSelected(fresh)}
 }
 useEffect(()=>{load()},[]);
 useEffect(()=>{
  const code=searchParams.get("animal");
  if(code && animals.length){
    const found=animals.find(a=>a.record_number===code);
    if(found){setSelected(found);setTab("animals");loadPhotos(found.id);}
  }
 },[animals,searchParams]);

 const active=animals.filter(a=>a.status==="en_refugio").length;
 const month=new Date().toISOString().slice(0,7);
 const income=events.filter(e=>e.event_type==="ingreso"&&e.event_date?.startsWith(month)).length;
 const exits=events.filter(e=>e.event_type==="salida"&&e.event_date?.startsWith(month)).length;
 const adoptions=animals.filter(a=>a.status==="adoptado").length;
 const filtered=animals.filter(a=>(a.name+" "+a.record_number+" "+a.species).toLowerCase().includes(q.toLowerCase()));
 const animalEvents=selected?events.filter(e=>e.animal_id===selected.id):[];
 async function loadPhotos(animalId){
  if(!animalId){setPhotos([]);return}
  const {data,error}=await supabase.from("animal_photos").select("id,storage_path,is_primary,created_at").eq("animal_id",animalId).order("created_at",{ascending:false});
  if(error){setPhotos([]);return}
  const withUrls=[];
  for(const item of (data||[])){
    const {data:urlData}=await supabase.storage.from("animal-photos").createSignedUrl(item.storage_path,60*60);
    if(urlData?.signedUrl) withUrls.push({...item,url:urlData.signedUrl});
  }
  setPhotos(withUrls);
 }

 async function saveIngreso(e){
  e.preventDefault();setSaving(true);
  const {data:{user}}=await supabase.auth.getUser();
  const record=`AFAD-${String(Date.now()).slice(-7)}`;
  const {data,error}=await supabase.from("animals").insert({...form,record_number:record,created_by:user?.id,updated_by:user?.id}).select().single();
  if(!error&&data){await supabase.from("animal_events").insert({animal_id:data.id,event_type:"ingreso",event_date:form.intake_date,reason:form.intake_reason,description:"Ingreso registrado",performed_by:user?.id});setShowIngreso(false);setForm({...form,name:"",estimated_age:"",found_location:"",health_status:"",notes:""});await load();setSelected(data);setTab("animals")}else alert(error?.message||"No se pudo guardar.");
  setSaving(false);
 }
 async function saveEvent(e){
  e.preventDefault();if(!selected)return;setSaving(true);
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("animal_events").insert({animal_id:selected.id,event_type:eventForm.event_type,event_date:eventForm.event_date,reason:eventForm.reason,description:eventForm.description,performed_by:user?.id});
  if(!error){if(eventForm.event_type==="esterilizacion")await supabase.from("animals").update({sterilized:true,updated_by:user?.id}).eq("id",selected.id);if(eventForm.event_type==="vacuna")await supabase.from("animals").update({vaccinated:true,updated_by:user?.id}).eq("id",selected.id);setShowEvent(false);setEventForm({event_type:"nota",event_date:new Date().toISOString().slice(0,10),reason:"",description:""});await load()}else alert(error.message);
  setSaving(false);
 }
 async function saveExit(e){
  e.preventDefault();if(!selected)return;setSaving(true);
  const {data:{user}}=await supabase.auth.getUser();
  const status={Adopción:"adoptado","Hogar temporal":"hogar_temporal",Traslado:"trasladado",Reubicación:"reubicado",Fallecimiento:"fallecido","Regreso con propietario":"regreso_propietario",Otro:"otro"}[exitForm.reason]||"otro";
  const {error}=await supabase.from("animal_events").insert({animal_id:selected.id,event_type:"salida",event_date:exitForm.event_date,reason:exitForm.reason,description:exitForm.description,performed_by:user?.id});
  if(!error){await supabase.from("animals").update({status,updated_by:user?.id}).eq("id",selected.id);setShowExit(false);await load();setSelected({...selected,status});}else alert(error.message);
  setSaving(false);
 }
 async function uploadPhoto(e){
  const file=e.target.files?.[0];if(!file||!selected)return;
  setPhoto(file);setSaving(true);
  const {data:{user}}=await supabase.auth.getUser();
  const path=`${selected.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const {error}=await supabase.storage.from("animal-photos").upload(path,file,{upsert:false});
  if(!error)await supabase.from("animal_photos").insert({animal_id:selected.id,storage_path:path,is_primary:true,uploaded_by:user?.id});
  if(error)alert(error.message);else {alert("Foto guardada.");await loadPhotos(selected.id)}
  setPhoto(null);setSaving(false);
 }
 async function openAnimal(a){setSelected(a);setTab("animals");await loadPhotos(a.id)}

 return <div className="shell">
  <aside><div className="brand">AFAD<small>Control de animales</small></div>
   <nav><button className={tab==="dashboard"?"active":""} onClick={()=>setTab("dashboard")}>Dashboard</button><button className={tab==="animals"?"active":""} onClick={()=>setTab("animals")}>🐾 Animales</button><button onClick={()=>setShowIngreso(true)}>＋ Ingreso</button><button onClick={()=>{if(selected)setShowExit(true);else alert("Selecciona un animal primero.")}}>− Salida</button><button className={tab==="history"?"active":""} onClick={()=>setTab("history")}>☷ Historial</button></nav>
   <form action="/auth/signout" method="post"><button className="logout">Cerrar sesión</button></form>
  </aside>
  <main className="content">
   {tab==="dashboard"&&<><header><div><h1>Dashboard</h1><p>Resumen del refugio</p></div><button className="primary" onClick={()=>setShowIngreso(true)}>+ Nuevo ingreso</button></header>
    <div className="cards"><Card label="En refugio" value={active}/><Card label="Ingresos este mes" value={income}/><Card label="Salidas este mes" value={exits}/><Card label="Adopciones" value={adoptions}/></div>
    <div className="grid"><section className="panel"><div className="panel-head"><h2>Últimos movimientos</h2></div><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Animal</th><th>Movimiento</th><th>Motivo</th></tr></thead><tbody>{events.slice(0,10).map(e=><tr key={e.id} onClick={()=>{const a=animals.find(x=>x.id===e.animal_id);if(a)openAnimal(a)}}><td>{e.event_date}</td><td><b>{e.animals?.name||"—"}</b></td><td><span className="badge">{eventLabels[e.event_type]}</span></td><td>{e.reason||"—"}</td></tr>)}</tbody></table></div></section>
     <section className="panel"><div className="panel-head"><h2>Buscar animal</h2></div><div className="panel-body"><input className="search" placeholder="Nombre o expediente..." value={q} onChange={e=>setQ(e.target.value)}/>{filtered.slice(0,8).map(a=><button className="animal-row" key={a.id} onClick={()=>openAnimal(a)}><b>{a.name}</b><span>{a.record_number} · {labels[a.status]}</span></button>)}</div></section></div>
   </>}
   {tab==="animals"&&<><header><div><h1>{selected?selected.name:"Animales"}</h1><p>{selected?selected.record_number:"Expedientes de AFAD"}</p></div><button className="primary" onClick={()=>setShowIngreso(true)}>+ Nuevo ingreso</button></header>
    {!selected?<><input className="search" placeholder="Buscar por nombre, expediente o especie..." value={q} onChange={e=>setQ(e.target.value)}/><div className="animal-grid">{filtered.map(a=><button className="animal-card" key={a.id} onClick={()=>openAnimal(a)}><div className="animal-avatar">{a.species==="gato"?"🐱":"🐶"}</div><div><h3>{a.name}</h3><p>{a.species} · {a.sex} · {a.estimated_age||"Edad no registrada"}</p><span className="badge">{labels[a.status]}</span></div></button>)}</div></>:
    <AnimalDetail animal={selected} events={animalEvents} photos={photos} labels={labels} eventLabels={eventLabels} onBack={()=>setSelected(null)} onEvent={()=>setShowEvent(true)} onExit={()=>setShowExit(true)} onQR={()=>setShowQR(true)} onPhoto={uploadPhoto} saving={saving}/>}
   </>}
   {tab==="history"&&<><header><div><h1>Historial</h1><p>Todos los movimientos registrados</p></div></header><section className="panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Animal</th><th>Tipo</th><th>Motivo</th><th>Detalle</th></tr></thead><tbody>{events.map(e=><tr key={e.id}><td>{e.event_date}</td><td>{e.animals?.name}</td><td><span className="badge">{eventLabels[e.event_type]}</span></td><td>{e.reason||"—"}</td><td>{e.description||"—"}</td></tr>)}</tbody></table></div></section></>}
  </main>
  {showIngreso&&<Modal title="Registrar ingreso" close={()=>setShowIngreso(false)}><form className="form two" onSubmit={saveIngreso}>
    <Field label="Nombre"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Especie"><select value={form.species} onChange={e=>setForm({...form,species:e.target.value})}><option value="perro">Perro</option><option value="gato">Gato</option><option value="otro">Otro</option></select></Field>
    <Field label="Sexo"><select value={form.sex} onChange={e=>setForm({...form,sex:e.target.value})}><option value="macho">Macho</option><option value="hembra">Hembra</option><option value="desconocido">Desconocido</option></select></Field><Field label="Edad aproximada"><input value={form.estimated_age} onChange={e=>setForm({...form,estimated_age:e.target.value})}/></Field>
    <Field label="Fecha de ingreso"><input type="date" required value={form.intake_date} onChange={e=>setForm({...form,intake_date:e.target.value})}/></Field><Field label="Motivo"><select value={form.intake_reason} onChange={e=>setForm({...form,intake_reason:e.target.value})}><option>Rescate</option><option>Entrega</option><option>Abandono</option><option>Otro</option></select></Field>
    <Field label="Lugar encontrado"><input value={form.found_location} onChange={e=>setForm({...form,found_location:e.target.value})}/></Field><Field label="Estado de salud"><input value={form.health_status} onChange={e=>setForm({...form,health_status:e.target.value})}/></Field>
    <label className="check"><input type="checkbox" checked={form.sterilized} onChange={e=>setForm({...form,sterilized:e.target.checked})}/> Esterilizado</label><label className="check"><input type="checkbox" checked={form.vaccinated} onChange={e=>setForm({...form,vaccinated:e.target.checked})}/> Vacunado</label>
    <Field label="Observaciones" full><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowIngreso(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving?"Guardando…":"Guardar ingreso"}</button></div>
  </form></Modal>}
  {showEvent&&<Modal title="Registrar actividad" close={()=>setShowEvent(false)}><form className="form" onSubmit={saveEvent}><Field label="Tipo"><select value={eventForm.event_type} onChange={e=>setEventForm({...eventForm,event_type:e.target.value})}><option value="nota">Nota</option><option value="vacuna">Vacuna</option><option value="esterilizacion">Esterilización</option><option value="tratamiento">Tratamiento</option><option value="desparasitacion">Desparasitación</option><option value="medicamento">Medicamento</option></select></Field><Field label="Fecha"><input type="date" value={eventForm.event_date} onChange={e=>setEventForm({...eventForm,event_date:e.target.value})}/></Field><Field label="Concepto"><input value={eventForm.reason} onChange={e=>setEventForm({...eventForm,reason:e.target.value})} placeholder="Ej. vacuna antirrábica"/></Field><Field label="Descripción"><textarea value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/></Field><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowEvent(false)}>Cancelar</button><button className="primary">{saving?"Guardando…":"Guardar"}</button></div></form></Modal>}
  {showExit&&<Modal title={`Registrar salida · ${selected?.name||""}`} close={()=>setShowExit(false)}><form className="form" onSubmit={saveExit}><Field label="Fecha"><input type="date" value={exitForm.event_date} onChange={e=>setExitForm({...exitForm,event_date:e.target.value})}/></Field><Field label="Motivo"><select value={exitForm.reason} onChange={e=>setExitForm({...exitForm,reason:e.target.value})}><option>Adopción</option><option>Hogar temporal</option><option>Traslado</option><option>Reubicación</option><option>Fallecimiento</option><option>Regreso con propietario</option><option>Otro</option></select></Field><Field label="Observaciones"><textarea value={exitForm.description} onChange={e=>setExitForm({...exitForm,description:e.target.value})}/></Field><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowExit(false)}>Cancelar</button><button className="primary">{saving?"Guardando…":"Registrar salida"}</button></div></form></Modal>}

  {showQR&&selected&&<Modal title={`Código QR · ${selected.name}`} close={()=>setShowQR(false)}>
    <div className="qr-modal">
      <QRCodeSVG value={`${window.location.origin}/animal/${selected.record_number}`} size={240} includeMargin />
      <h3>{selected.name}</h3>
      <p>{selected.record_number}</p>
      <small>Escanea este código para abrir el expediente del animal.</small>
      <div className="modal-actions"><button className="secondary" onClick={()=>window.print()}>Imprimir</button><button className="primary" onClick={()=>setShowQR(false)}>Cerrar</button></div>
    </div>
  </Modal>}
 </div>
}
function Card({label,value}){return <div className="card"><span>{label}</span><strong>{value}</strong></div>}
function Field({label,children,full=false}){return <label className={full?"full":""}>{label}{children}</label>}
function Modal({title,close,children}){return <div className="modal"><div className="modal-card"><div className="panel-head"><h2>{title}</h2><button className="close" onClick={close}>×</button></div>{children}</div></div>}
function AnimalDetail({animal,events,photos,labels,eventLabels,onBack,onEvent,onExit,onQR,onPhoto,saving}){
 return <div><button className="back" onClick={onBack}>← Volver a animales</button><div className="detail-head"><div className="big-avatar">{animal.species==="gato"?"🐱":"🐶"}</div><div><h2>{animal.name}</h2><p>{animal.record_number}</p><span className="badge">{labels[animal.status]}</span></div></div>
 <div className="detail-actions"><label className="secondary file-btn">📸 Agregar foto<input type="file" accept="image/*" onChange={onPhoto} hidden/></label><button className="secondary" onClick={onEvent}>＋ Registrar actividad</button><button className="secondary" onClick={onQR}>▣ Código QR</button><button className="primary" onClick={onExit}>Registrar salida</button></div>
 <section className="panel photo-panel"><div className="panel-head"><h2>Fotografías</h2><span>{photos.length} foto{photos.length===1?"":"s"}</span></div><div className="gallery">{photos.length?photos.map(photo=><img key={photo.id} src={photo.url} alt={`Foto de ${animal.name}`} />):<div className="empty">Todavía no hay fotografías de este animal.</div>}</div></section>
 <div className="detail-grid"><section className="panel"><div className="panel-head"><h2>Información</h2></div><div className="info"><Info k="Especie" v={animal.species}/><Info k="Sexo" v={animal.sex}/><Info k="Edad" v={animal.estimated_age||"No registrada"}/><Info k="Ingreso" v={animal.intake_date}/><Info k="Motivo de ingreso" v={animal.intake_reason||"—"}/><Info k="Lugar encontrado" v={animal.found_location||"—"}/><Info k="Salud" v={animal.health_status||"—"}/><Info k="Esterilizado" v={animal.sterilized?"Sí":"No"}/><Info k="Vacunado" v={animal.vaccinated?"Sí":"No"}/><Info k="Observaciones" v={animal.notes||"—"} full/><div className="qr-mini"><QRCodeSVG value={`${typeof window!=="undefined"?window.location.origin:""}/animal/${animal.record_number}`} size={110}/><div><b>Identificación QR</b><small>Escanea para abrir el expediente.</small></div></div></div></section>
 <section className="panel"><div className="panel-head"><h2>Historial médico y de movimientos</h2></div><div className="timeline">{events.length?events.map(e=><div className="event" key={e.id}><div className="dot"/><div><b>{eventLabels[e.event_type]}</b><small>{e.event_date}</small><span>{e.reason||""}</span><p>{e.description||""}</p></div></div>):<div className="empty">No hay eventos.</div>}</div></section></div></div>
}
function Info({k,v,full}){return <div className={full?"info-item full":"info-item"}><small>{k}</small><b>{v}</b></div>}
