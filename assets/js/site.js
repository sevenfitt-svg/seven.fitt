
const btn=document.querySelector('.mobile-toggle');
const nav=document.querySelector('.main-nav');
if(btn&&nav){btn.addEventListener('click',()=>nav.classList.toggle('open'))}

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
