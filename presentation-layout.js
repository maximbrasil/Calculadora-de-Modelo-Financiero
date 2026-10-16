/* Full explanations in native modal dialogs, with keyboard focus containment. */
(()=>{
  let dialog, returnFocus, movedContent, originalParent;
  function ensureDialog(){
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.className='presentation-dialog';
    dialog.setAttribute('aria-labelledby','presentationDialogTitle');
    dialog.innerHTML='<header><h2 id="presentationDialogTitle"></h2><button class="dialog-close" type="button">×</button></header><div class="dialog-body"></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{
      if(movedContent&&originalParent?.isConnected)originalParent.appendChild(movedContent);
      movedContent=originalParent=null;
      dialog.querySelector('.dialog-body').replaceChildren();
      document.body.classList.remove('presentation-dialog-open');
      if(returnFocus?.isConnected)returnFocus.focus();
      returnFocus=null;
    });
    return dialog;
  }
  document.addEventListener('click',event=>{
    const summary=event.target.closest('.role-details > summary, .contact-disclosure > summary');
    const insight=event.target.closest('[data-insight-detail]');
    if(!summary&&!insight)return;
    const modal=ensureDialog();
    if(typeof modal.showModal!=='function')return; // Native details remain usable in old browsers.
    event.preventDefault();
    returnFocus=summary||insight;
    const body=modal.querySelector('.dialog-body');
    let title;
    if(insight){
      const card=insight.closest('.insight');
      title=card.querySelector('.insight-title').textContent;
      body.replaceChildren(card.querySelector('.insight-full').content.cloneNode(true));
    }else if(summary.parentElement.classList.contains('role-details')){
      title=summary.closest('.role-panel').querySelector('h3').textContent;
      body.replaceChildren(summary.parentElement.querySelector('.role-details-body').cloneNode(true));
    }else{
      title=summary.textContent.trim();
      originalParent=summary.parentElement;
      movedContent=originalParent.querySelector('.f7-next-step');
      body.replaceChildren(movedContent);
    }
    modal.querySelector('h2').textContent=title;
    modal.querySelector('.dialog-close').setAttribute('aria-label',Localization.t('closeDialog'));
    modal.showModal();
    document.body.classList.add('presentation-dialog-open');
    modal.querySelector('.dialog-close').focus();
  });
})();
