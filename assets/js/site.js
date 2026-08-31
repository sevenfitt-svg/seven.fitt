const btn=document.querySelector('.mobile-toggle');
const nav=document.querySelector('.main-nav');
if(btn&&nav){
  btn.addEventListener('click',()=>{
    const isOpen=nav.classList.toggle('open');
    btn.setAttribute('aria-expanded',isOpen?'true':'false');
  });
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }));
}

const header=document.querySelector('.site-header');
if(header){
  const syncHeader=()=>header.classList.toggle('scrolled',window.scrollY>18);
  syncHeader();
  window.addEventListener('scroll',syncHeader,{passive:true});
}

const codeForm=document.querySelector('#program-code-form');
if(codeForm){
  codeForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    const code=(document.querySelector('#program-code').value||'').trim()
      .replace(/[^a-zA-Z0-9_-]/g,'');
    if(!code){return;}
    window.location.href='student-programs/'+code+'.html';
  });
}
