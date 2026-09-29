"use strict";
(() => {
  const frame=document.getElementById("electricityFrame");
  const salaryFrame=document.getElementById("salaryFrame");
  if(salaryFrame){
    salaryFrame.addEventListener("load",()=>{
      try{
        const doc=salaryFrame.contentDocument;
        if(!doc)return;
        const resize=()=>{salaryFrame.style.height=Math.max(900,doc.documentElement.scrollHeight,doc.body.scrollHeight)+8+"px"};
        resize();
        if("ResizeObserver" in window){
          const observer=new ResizeObserver(resize);
          observer.observe(doc.documentElement);
          observer.observe(doc.body);
        }
      }catch(_error){/* El enlace externo sigue disponible si el navegador bloquea el ajuste de altura. */}
    });
  }
  let bills=[], pendingRoute=null;
  const $=(s)=>document.querySelector(s);
  const norm=(value)=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").trim();
  const billMonth=(r)=>String(r.checkOut||r.checkIn||"").slice(0,7);
  const route=(view)=>document.querySelector('#sideNav a[href="#'+view+'"]')?.click();
  function openBill(id,month){
    route("electricidad");
    pendingRoute={type:"monte-carlo-electricity-open",id,month};
    frame?.contentWindow?.postMessage(pendingRoute,location.origin);
  }
  function refresh(){
    if(typeof renderTasks==="function")renderTasks($("#month").value);
    if($("#globalSearchDialog")?.open)search();
  }
  if(frame){
    window.addEventListener("message",(event)=>{
      if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
      const data=event.data;
      if(data?.type==="monte-carlo-electricity-height"){
        const height=Number(data.height);
        if(Number.isFinite(height)&&height>=300&&height<=12000)frame.style.height=height+"px";
      }
      if(data?.type==="monte-carlo-electricity-records"&&Array.isArray(data.records)){
        bills=data.records.filter((r)=>r&&typeof r.id==="string"&&typeof r.clientName==="string");
        refresh();
      }
    });
    frame.addEventListener("load",()=>{
      frame.contentWindow?.postMessage({type:"monte-carlo-electricity-request"},location.origin);
      if(pendingRoute)frame.contentWindow?.postMessage(pendingRoute,location.origin);
    });
  }
  const dialog=$("#globalSearchDialog"),input=$("#globalSearchInput"),results=$("#globalSearchResults");
  function search(){
    const query=norm(input.value);results.replaceChildren();
    if(query.length<2){
      const p=document.createElement("p");p.className="global-search-empty";p.textContent="Escribí al menos dos caracteres para buscar.";results.append(p);return;
    }
    const people=state.employees.map((r)=>({title:r.name,detail:r.company,words:r.name+" "+r.company,open:()=>openPersonProfile(r.id)}));
    const days=[
      ...state.entries.map((r)=>{const name=state.employees.find((p)=>p.id===r.employeeId)?.name||"Colaborador";return {
        title:name+" · "+displayDate(r.date),detail:TRACKING[r.trackingState]||"Registro",
        words:[name,r.date,displayDate(r.date),TRACKING[r.trackingState]].join(" "),open:()=>openCalendarDay(r.date)
      }}),
      ...state.holidays.map((r)=>({title:r.name,detail:displayDate(r.date),
        words:[r.name,r.date,displayDate(r.date)].join(" "),open:()=>openCalendarDay(r.date)}))
    ];
    const electricity=bills.map((r)=>({title:(r.clientName||"Cliente")+" · Unidad "+(r.unitNumber||"—"),
      detail:(r.workflow==="draft"?"Borrador":r.status==="paid"?"Pagado":r.status==="sent"?"Enviado":"Pendiente")+" · "+(r.checkOut||r.checkIn||"")+" · $"+Number(r.totalUSD||0).toFixed(2),
      words:[r.clientName,r.unitNumber,r.checkIn,r.checkOut,r.status,r.workflow].join(" "),
      open:()=>openBill(r.id,billMonth(r))}));
    let total=0;
    for(const [label,items] of [["Colaboradores",people],["Días y feriados",days],["Electricidad",electricity]]){
      const matches=items.filter((r)=>norm(r.words).includes(query)).slice(0,12);
      if(!matches.length)continue;
      const group=document.createElement("p");group.className="global-search-group";group.textContent=label;results.append(group);
      for(const record of matches){
        total++;
        const button=document.createElement("button"),content=document.createElement("span"),title=document.createElement("strong"),detail=document.createElement("small"),arrow=document.createElement("span");
        button.type="button";button.className="global-search-result";
        title.textContent=record.title;detail.textContent=record.detail;arrow.className="arrow";arrow.textContent="→";
        content.append(title,detail);button.append(content,arrow);
        button.onclick=()=>{dialog.close();record.open()};results.append(button);
      }
    }
    if(!total){const p=document.createElement("p");p.className="global-search-empty";p.textContent="No hay resultados con esa búsqueda.";results.append(p)}
  }
  $("#globalSearchOpen").onclick=()=>{dialog.showModal();input.value="";search();input.focus()};
  $("#globalSearchClose").onclick=()=>dialog.close();
  dialog.addEventListener("click",(event)=>{if(event.target===dialog)dialog.close()});
  input.addEventListener("input",search);
  document.addEventListener("keydown",(event)=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();$("#globalSearchOpen").click()}
  });
  let installPrompt=null;
  const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);
  const android=/Android/i.test(navigator.userAgent);
  function installationUI(){
    const visible=!standalone()&&(Boolean(installPrompt)||ios||android);
    $("#installCallout").hidden=!visible;$("#installAppMenu").hidden=!visible;
  }
  window.addEventListener("beforeinstallprompt",(event)=>{event.preventDefault();installPrompt=event;installationUI()});
  window.addEventListener("appinstalled",()=>{installPrompt=null;installationUI()});
  async function install(){
    if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;installationUI();return}
    if(ios)alert("En Safari tocá Compartir y elegí «Agregar a pantalla de inicio». Después abrí el ícono Monte Carlo.");
    else if(android)alert("En Chrome tocá el menú ⋮ y elegí «Instalar aplicación» o «Agregar a pantalla principal».");
  }
  $("#installAppButton").onclick=install;$("#installAppMenu").onclick=install;installationUI();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
  refresh();
})();
