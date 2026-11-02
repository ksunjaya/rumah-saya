'use strict';
(function(root){
  const el=id=>document.getElementById(id);
  const format=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
  let c,result;
  function values(){return {price:el('salePrice').value.trim()===''?NaN:Number(el('salePrice').value),costs:el('saleCosts').value.trim()===''?NaN:Number(el('saleCosts').value)};}
  function render(config,r){
    c=config;result=r;const valid=r&&!r.errors.length;
    el('salePanel').hidden=!valid;if(!valid)return;
    const s=values(),errors=RuangDocuments.validateSale(s);
    el('saleError').textContent=errors.join(' ');el('saleError').hidden=!errors.length;
    el('exportXlsx').disabled=el('contractPdf').disabled=!!errors.length;
    el('salePrice').setAttribute('aria-invalid',String(!Number.isSafeInteger(s.price)||s.price<0||s.price>1e15));
    el('saleCosts').setAttribute('aria-invalid',String(!Number.isSafeInteger(s.costs)||s.costs<0||s.costs>s.price));
    el('saleMonth').max=result.months;el('saleMonth').value=Math.min(Number(el('saleMonth').value),result.months);
    const m=Number(el('saleMonth').value),row=m?result.rows[m-1]:{borrowerShare:0,creditorShare:1,balance:c.principal,originalPrincipalPaid:0,interestPaidTotal:0};
    el('salePeriod').textContent=m?'After payment '+m+' · '+row.date:'Before your first payment';
    el('borrowerPercent').textContent=(row.borrowerShare*100).toFixed(4)+'%';el('creditorPercent').textContent=(row.creditorShare*100).toFixed(4)+'%';
    el('saleBasis').textContent='Original principal repaid: '+format(row.originalPrincipalPaid)+'. Interest already paid to creditor: '+format(row.interestPaidTotal)+'. Outstanding loan balance: '+format(row.balance)+'.';
    el('saleAmounts').hidden=!!errors.length;
    if(!errors.length){const d=RuangDocuments.distribution(row,s);el('saleNet').textContent=format(d.net);el('saleBorrower').textContent=format(d.borrower);el('saleCreditor').textContent=format(d.creditor);}
  }
  function download(data,type,name){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function generate(kind){
    const s=values();if(!result||result.errors.length||RuangDocuments.validateSale(s).length){el('documentStatus').textContent='Check loan inputs, sale price and costs before exporting.';return;}
    el('documentStatus').textContent='Generating locally…';el('exportXlsx').disabled=el('contractPdf').disabled=true;
    try{
      if(kind==='xlsx')download(await RuangDocuments.xlsx(c,result,s),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','ruang-jadwal-dan-porsi-penjualan.xlsx');
      else {const d=Object.fromEntries(['creditor','creditorDetails','borrower','borrowerDetails','property','place','signDate'].map(k=>[k,el('contract_'+k).value]));download(await RuangDocuments.pdf(c,result,s,d),'application/pdf','ruang-draf-perjanjian-pinjaman.pdf');}
      el('documentStatus').textContent='File generated on this device. All monthly rows are included.';
    }catch(error){el('documentStatus').textContent='Could not create the file. Check that the vendor folder is present, then try again.';console.error(error);}
    finally{render(c,result);}
  }
  el('salePrice').value=Mortgage.defaults.principal;el('saleCosts').value=0;el('saleMonth').value=12;
  try{const saved=JSON.parse(localStorage.getItem('ruang-mortgage-v2')||'null')?.saleSettings;if(saved&&!RuangDocuments.validateSale(saved).length){el('salePrice').value=saved.price;el('saleCosts').value=saved.costs;if(Number.isInteger(saved.month)&&saved.month>=0&&saved.month<=600)el('saleMonth').value=saved.month;}}catch{}
  ['salePrice','saleCosts','saleMonth'].forEach(id=>el(id).addEventListener('input',()=>render(c,result)));
  el('exportXlsx').onclick=()=>generate('xlsx');el('contractPdf').onclick=()=>generate('pdf');
  root.SaleUI={render,values,saved:()=>({...values(),month:Number(el('saleMonth').value)}),reset:()=>{el('salePrice').value=Mortgage.defaults.principal;el('saleCosts').value=0;el('saleMonth').value=12;['creditor','creditorDetails','borrower','borrowerDetails','property','place','signDate'].forEach(k=>el('contract_'+k).value='');}};
  render(config,current);
})(globalThis);
