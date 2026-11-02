'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('./engine.js'),D=require('./documents.js'),Zip=require('./vendor/jszip.min.js'),PDF=require('./vendor/pdf-lib.min.js');
const near=(a,b,t=.01)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
async function main(){
  const c={...M.defaults},r=M.calculate(c),s={price:1200000000,costs:50000000};
  r.rows.forEach(row=>{near(row.borrowerShare+row.creditorShare,1);near(row.originalPrincipalPaid/c.principal,row.borrowerShare);near(row.payment,row.interestPaid+row.originalPrincipalPayment);const d=D.distribution(row,s);near(d.borrower+d.creditor,s.price-s.costs);near(d.borrower,row.borrowerShare*(s.price-s.costs),.501);});
  near(r.rows.at(-1).borrowerShare,1);near(r.rows.at(-1).creditorShare,0);
  const example=D.distribution({borrowerShare:.2,creditorShare:.8},s);near(example.borrower,230000000);near(example.creditor,920000000);
  const noPay=M.calculate({...c,salary:0,allocation:0});assert.equal(noPay.rows[0].interestPaid,0);assert.equal(noPay.rows[0].borrowerShare,0);assert.ok(noPay.rows[0].unpaidInterest>0);assert.equal(noPay.rows.at(-1).borrowerShare,0);
  const catchup=M.calculate({...c,salary:0,allocation:0,prepayments:[{month:2,amount:10000000}]});
  near(catchup.rows[1].interestPaid,catchup.rows[0].unpaidInterest+catchup.rows[1].interest);assert.ok(catchup.rows[1].originalPrincipalPayment<10000000-catchup.rows[1].interest);
  for(const bad of [{price:0,costs:1},{price:NaN,costs:0},{price:1,costs:-1}])assert.ok(D.validateSale(bad).length);
  near(D.distribution({borrowerShare:.5},{price:0,costs:0}).borrower,0);
  const odd=D.distribution({borrowerShare:.5},{price:101,costs:0});assert.equal(odd.borrower,51);assert.equal(odd.creditor,50);
  const clauses=D.clauses(c,r,s,{borrower:'Nama uji',creditor:'Keluarga uji'}).flat().join(' ');
  assert.match(clauses,/penyelesaian penuh seluruh pinjaman/);assert.match(clauses,/tidak lagi ditagih/);assert.match(clauses,/bukan bukti kepemilikan/);
  const book=await D.xlsx(c,r,s);const zip=await Zip.loadAsync(book);
  assert.ok(zip.file('xl/worksheets/sheet2.xml'));const xml=await zip.file('xl/worksheets/sheet2.xml').async('string');
  assert.equal((xml.match(/<row /g)||[]).length,r.months+1);assert.ok(xml.includes('Porsi debitur'));assert.match(xml,/<c r="O2" s="2"><v>/);
  const bytes=await D.pdf(c,r,s,{borrower:'Nama uji',creditor:'Keluarga uji',property:'Rumah contoh'});
  const pdf=await PDF.PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>3);
  // Worst-case duration: all 600 rows must export even without payoff.
  const longPdf=await D.pdf({...c,salary:0,allocation:0},noPay,s,{});
  const longDoc=await PDF.PDFDocument.load(longPdf);assert.ok(longDoc.getPageCount()>20);
  if(process.argv.includes('--samples')){
    const out=path.resolve(__dirname,'../outputs');fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'ruang-contoh-jadwal.xlsx'),book);fs.writeFileSync(path.join(out,'ruang-contoh-draf-perjanjian.pdf'),await D.pdf(c,r,s,{}));fs.writeFileSync(path.join(out,'ruang-contoh-jadwal.csv'),D.csv(c,r,s));fs.writeFileSync(path.join(out,'ruang-stress-600-months.pdf'),longPdf);
  }
  console.log(`PASS sale formulas, interest ledger, 0/100% shares, costs validation, full-settlement clause, XLSX rows/types and PDF generation (${pdf.getPageCount()} pages; stress ${longDoc.getPageCount()} pages).`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
