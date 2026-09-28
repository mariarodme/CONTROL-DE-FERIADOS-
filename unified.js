(function(){
  const frame=document.getElementById("electricityFrame");
  if(!frame)return;
  window.addEventListener("message",function(event){
    if(event.origin!==window.location.origin||event.source!==frame.contentWindow)return;
    const data=event.data;
    if(!data||data.type!=="monte-carlo-electricity-height")return;
    const height=Number(data.height);
    if(Number.isFinite(height)&&height>=300&&height<=12000)frame.style.height=height+"px";
  });
})();
