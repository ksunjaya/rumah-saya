/* All document generation is local. Vendored JSZip and pdf-lib are MIT licensed. */
(function(root) {
  'use strict';
  const money = n => 'Rp' + new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(n);
  const pct = n => (n*100).toFixed(4).replace('.',',')+'%';
  const date = s => new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s+'-01T00:00:00Z'));
  const xml = s => String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  function validateSale(s) {
    const errors=[];
    if(!Number.isSafeInteger(s.price)||s.price<0||s.price>1e15)errors.push('Enter a whole-rupiah sale price from Rp0 to Rp1,000 trillion.');
    if(!Number.isSafeInteger(s.costs)||s.costs<0||s.costs>s.price)errors.push('Selling costs must be whole rupiah between Rp0 and the gross sale price.');
    return errors;
  }
  function distribution(row,s) {
    const errors=validateSale(s);if(errors.length)throw new Error(errors.join(' '));
    const net=s.price-s.costs;
    const borrower=Math.round(net*row.borrowerShare);
    return {net,borrower,creditor:net-borrower};
  }
  const columns = [
    ['month','Bulan ke',0],['date','Periode',0],['payment','Total pembayaran (Rp)',1],
    ['regular','Pembayaran rutin (Rp)',1],['bonus','Bonus (Rp)',1],['prepayment','Tambahan sekali (Rp)',1],
    ['interest','Bunga timbul (Rp)',1],['interestPaid','Bunga dibayar (Rp)',1],['interestPaidTotal','Akumulasi bunga dibayar (Rp)',1],
    ['unpaidInterest','Bunga belum dibayar (Rp)',1],['principal','Penurunan saldo bersih (Rp)',1],
    ['originalPrincipalPayment','Pokok awal dibayar bulan ini (Rp)',1],['originalPrincipalPaid','Akumulasi pokok awal dibayar (Rp)',1],
    ['balance','Sisa saldo (Rp)',1],['borrowerShare','Porsi debitur',2],['creditorShare','Porsi kreditur',2],
    ['saleNet','Hasil jual bersih asumsi (Rp)',1],['saleBorrower','Bagian debitur asumsi (Rp)',1],['saleCreditor','Bagian kreditur asumsi (Rp)',1],
    ['salary','Gaji neto (Rp)',1],['budget','Alokasi gaji (Rp)',1],['opening','Saldo awal bulan (Rp)',1],['contractual','Angsuran acuan dibatasi saldo (Rp)',1],
    ['extra','Kelebihan pembayaran rutin atas acuan (Rp)',1],['realPayment','Pembayaran nilai kini (Rp)',1],['realBalance','Saldo nilai kini (Rp)',1],
    ['shortfall','Selisih anggaran terhadap acuan (Rp)',1],['belowMinimum','Selisih pembayaran terhadap acuan dalam tenor (Rp)',1]
  ];
  function schedule(c,r,s) { return r.rows.map(row=>{
    const d=distribution(row,s);return {...row,saleNet:d.net,saleBorrower:d.borrower,saleCreditor:d.creditor};
  }); }
  function csv(c,r,s) {
    const rows=schedule(c,r,s);
    const quote=v=>'"'+String(v).replace(/"/g,'""')+'"';
    return '\uFEFF'+[
      ['Ruang - proyeksi bulanan; bukan bukti pembayaran'],['Pokok awal Rp',c.principal],['Strategi',c.strategy],
      ['Bulan pertama',c.startDate],['Bunga tahunan persen',c.interest],['Gaji awal Rp',c.salary],['Kenaikan gaji persen',c.growth],['Bulan kenaikan',c.raiseMonth],['Alokasi gaji persen',c.allocation],['Tenor tahun',c.years],['Inflasi persen',c.inflation],['Bonus bulan gaji',c.bonus],['Alokasi bonus persen',c.bonusAllocation],['Bulan bonus',c.bonusMonth],
      ['Status lunas dalam proyeksi',r.paidOff?'Ya':'Tidak'],['Saldo akhir Rp',r.balance],['Saldo jatuh tempo Rp',r.maturityBalance],
      ['Harga jual bruto asumsi Rp',s.price],['Biaya penjualan Rp',s.costs],['Pelunasan saat penjualan','Pembagian hasil bersih menyelesaikan seluruh pinjaman; bunga masa depan berhenti.'],
      ['Rumus porsi debitur','Pokok awal yang sudah dibayar / pokok awal. Bunga tidak dihitung.'],
      ['Waktu porsi','Sesudah pembayaran akhir bulan. Gunakan transaksi aktual untuk penyelesaian nyata.'],
      ['Persen memakai angka 0-100; bukan pecahan. Angka uang Rp.'],[],
      columns.map(x=>x[1]),...rows.map(row=>columns.map(([key,,style])=>style===2?(row[key]*100).toFixed(6):typeof row[key]==='number'?row[key].toFixed(2):row[key]))
    ].map(a=>a.map(quote).join(',')).join('\r\n');
  }
  function summary(c,r,s) {
    return [
      ['Ruang - asumsi dan aturan'],['Jenis data','PROYEKSI; bukan catatan pembayaran aktual'],
      ['Pokok awal / harga beli; tanpa uang muka',c.principal],['Bunga nominal tahunan (%)',c.interest],['Tenor (tahun)',c.years],
      ['Awal pembayaran',c.startDate],['Strategi',c.strategy==='budget'?'Alokasi gaji saja':'Angsuran kontrak'],
      ['Gaji neto awal',c.salary],['Kenaikan tahunan (%)',c.growth],['Bulan kenaikan',c.raiseMonth],['Alokasi gaji (%)',c.allocation],
      ['Bonus (bulan gaji)',c.bonus],['Alokasi bonus (%)',c.bonusAllocation],['Bulan bonus',c.bonusMonth],['Inflasi (%)',c.inflation],
      ['Angsuran acuan',r.minimum],['Status akhir',r.paidOff?'Lunas dalam proyeksi':'BELUM LUNAS dalam 50 tahun'],['Saldo akhir',r.balance],['Saldo jatuh tempo kontrak',r.maturityBalance],
      ['Harga jual bruto asumsi',s.price],['Biaya jual asumsi',s.costs],['Hasil bersih',s.price-s.costs],
      ['Porsi debitur','Akumulasi pokok awal yang benar-benar dibayar / pokok awal. Nol uang muka.'],
      ['Porsi kreditur','1 - porsi debitur. Nilai minimum 0%, maksimum 100%.'],
      ['Bunga','Bunga yang sudah dibayar tetap menjadi pendapatan kreditur; tidak menambah porsi debitur.'],
      ['Bunga tertunggak','Pembayaran melunasi bunga tertunggak dan bunga berjalan terlebih dahulu; baru pokok awal.'],
      ['Saat penjualan','Setelah pembayaran akhir bulan; sebelum pembayaran gunakan baris bulan sebelumnya. Awal: debitur 0%, kreditur 100%.'],
      ['Penyelesaian','Bagian kreditur dari hasil jual bersih melunasi seluruh pinjaman, sekalipun kurang dari saldo. Tidak ditambah pelunasan saldo lagi; bunga masa depan berhenti.'],
      ['Sifat porsi','Hak pembagian hasil penjualan yang disepakati; bukan bukti peralihan hak atas tanah.'],
      ['Contoh penjualan','Harga jual dan biaya dianggap sama untuk setiap baris. Setiap baris adalah skenario alternatif, bukan penjualan berulang.'],
      ['Pembulatan','Amortisasi presisi penuh. Bagian hasil jual Debitur dibulatkan ke rupiah terdekat; bagian Kreditur = hasil bersih dikurangi bagian Debitur, agar jumlah tepat. Persentase Excel berupa nilai numerik pecahan.']
    ];
  }
  async function xlsx(c,r,s) {
    const Zip=root.JSZip||(typeof require==='function'?require('./vendor/jszip.min.js'):null);
    const zip=new Zip();
    const letters=n=>{let t='';for(n++;n;n=Math.floor((n-1)/26))t=String.fromCharCode(65+(n-1)%26)+t;return t;};
    const cell=(value,row,col,style=0)=>typeof value==='number'?`<c r="${letters(col)}${row}" s="${style}"><v>${value}</v></c>`:`<c r="${letters(col)}${row}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    const sheet=(rows,styles,filter=false)=>`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${styles.map((_,i)=>`<col min="${i+1}" max="${i+1}" width="${filter?24:i===0?45:100}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.map((row,i)=>`<row r="${i+1}"${i===0?' ht="44" customHeight="1"':''}>${row.map((v,j)=>cell(v,i+1,j,i===0?3:styles[j]||0)).join('')}</row>`).join('')}</sheetData>${filter?`<autoFilter ref="A1:${letters(styles.length-1)}${rows.length}"/>`:''}</worksheet>`;
    const data=schedule(c,r,s);
    const sheets=[['Asumsi',summary(c,r,s),[0,0],false],['Jadwal bulanan',[columns.map(x=>x[1]),...data.map(row=>columns.map(([key])=>row[key]))],columns.map(x=>x[2]),true],['Tambahan sekali',[['Bulan ke','Tanggal','Jumlah Rp'],...c.prepayments.map(p=>[p.month,root.Mortgage.dateAt(c.startDate,p.month-1),p.amount])],[0,0,1],true]];
    zip.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml',`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name],i)=>`<sheet name="${name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="style" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/styles.xml','<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF163F32"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf xfId="0"/><xf numFmtId="3" xfId="0" applyNumberFormat="1"/><xf numFmtId="10" xfId="0" applyNumberFormat="1"/><xf fontId="1" fillId="2" xfId="0" applyFont="1" applyFill="1"><alignment wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    sheets.forEach(([,rows,styles,filter],i)=>zip.file(`xl/worksheets/sheet${i+1}.xml`,sheet(rows,styles,filter)));
    return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
  }
  function clauses(c,r,s,d={}) {
    const field=(key,placeholder)=>String(d[key]||placeholder).trim();
    const mode=c.strategy==='budget'?'Pembayaran rutin sebesar '+c.allocation+'% dari gaji neto bulanan, tanpa tambahan otomatis untuk mencapai angsuran acuan.':'Pembayaran rutin sebesar angsuran acuan tetap '+money(r.minimum)+'; persentase gaji hanya untuk uji kemampuan bayar.';
    return [
      ['DRAF PERJANJIAN PINJAMAN KELUARGA','Dengan Kesepakatan Pembagian Hasil Penjualan Rumah'],
      ['Status dokumen','DRAF UNTUK DITINJAU. Belum ditandatangani. Angka pada lampiran adalah proyeksi, bukan pengakuan penerimaan pembayaran. Identitas, objek, bukti penyerahan dana, serta klausul yang belum lengkap harus diperiksa dan disepakati para pihak sebelum penandatanganan.'],
      ['Para pihak',`Kreditur (pemberi pinjaman): ${field('creditor','[NAMA KREDITUR]')}. Identitas dan alamat: ${field('creditorDetails','[IDENTITAS DAN ALAMAT KREDITUR]')}. Debitur (penerima pinjaman): ${field('borrower','[NAMA DEBITUR]')}. Identitas dan alamat: ${field('borrowerDetails','[IDENTITAS DAN ALAMAT DEBITUR]')}. Tempat/tanggal: ${field('place','[TEMPAT]')}, ${field('signDate','[TANGGAL PENANDATANGANAN]')}.`],
      ['Pasal 1 - Pinjaman dan objek',`Kreditur menyediakan pinjaman sebesar ${money(c.principal)} untuk membiayai seluruh harga beli rumah, tanpa uang muka Debitur. Objek: ${field('property','[ALAMAT, NOMOR SERTIPIKAT, LUAS, DAN PEMEGANG HAK]')}. Penyerahan dana dibuktikan dengan [BUKTI DAN TANGGAL TRANSFER]. Porsi dalam perjanjian ini adalah hak ekonomis atas hasil penjualan yang disepakati; bukan bukti kepemilikan bersama atau peralihan hak atas tanah.`],
      ['Pasal 2 - Bunga dan pembayaran',`Bunga nominal tetap ${c.interest}% per tahun; bunga bulanan = saldo awal bulan x ${c.interest}/1200. Pembayaran pada akhir bulan dimulai ${date(c.startDate)}. Tenor acuan ${c.years} tahun, jatuh tempo ${date(r.maturityDate)}. ${mode} Para pihak harus secara tertulis menyepakati pola pembayaran ini; angsuran acuan bukan tambahan dana otomatis.`],
      ['Pasal 3 - Gaji, bonus, dan pembayaran tambahan',`Gaji neto awal ${money(c.salary)}. Kenaikan ${c.growth}% pada bulan kalender ${c.raiseMonth}; kenaikan pertama terjadi setelah bulan pembayaran pertama. Bonus ${c.bonus} kali gaji pada bulan kalender ${c.bonusMonth}, dengan ${c.bonusAllocation}% dialokasikan ke pinjaman. Tambahan sekali dibayar sesuai daftar di lampiran. Perubahan gaji, bonus, atau tambahan harus dikonfirmasi berdasarkan keadaan dan pembayaran aktual serta dicatat dalam lampiran revisi yang disepakati.`],
      ['Pasal 4 - Pencatatan dan bunga belum dibayar','Pembayaran dialokasikan terlebih dahulu untuk bunga belum dibayar dan bunga bulan berjalan, lalu untuk pokok awal pinjaman. Bunga yang sudah diterima tetap menjadi pendapatan Kreditur dan tidak menambah porsi Debitur. Proyeksi mengasumsikan bunga belum dibayar masuk saldo dan dikenai bunga bulan berikutnya. Penerapan bunga atas bunga, keterlambatan, dan akibat hukum pola tersebut wajib ditinjau dan disepakati secara khusus; tabel simulasi tidak dengan sendirinya menetapkan keabsahan atau keterutangannya. Denda, asuransi, pajak pembelian, dan penalti belum dimasukkan.'],
      ['Pasal 5 - Porsi hasil penjualan','Porsi Debitur = akumulasi pokok awal yang telah dibayar / pokok awal pinjaman, dibatasi 0% sampai 100%. Porsi Kreditur = 100% dikurangi porsi Debitur. Sebelum pembayaran pertama: Debitur 0%, Kreditur 100%. Pembayaran bunga, termasuk pelunasan bunga tertunggak, tidak dihitung sebagai pokok awal. Setelah pokok awal lunas, porsi Debitur 100%. Porsi ditentukan berdasarkan catatan pembayaran aktual; lampiran menunjukkan porsi proyeksi sesudah pembayaran akhir bulan. Penjualan sebelum pembayaran menggunakan posisi aktual sebelum pembayaran itu.'],
      ['Pasal 6 - Penjualan dan biaya','Penjualan dilaksanakan dengan persetujuan tertulis kedua pihak atas harga dan daftar biaya. Hasil bersih = harga jual bruto dikurangi biaya penjualan aktual yang disetujui dan dibuktikan (termasuk pajak/biaya agen/notaris bila berlaku). Hasil bersih tidak boleh negatif dalam model ini. Biaya yang melebihi harga jual memerlukan kesepakatan terpisah. Bagian Debitur = porsi Debitur x hasil bersih; bagian Kreditur = sisanya. Keuntungan atau penurunan harga dengan demikian dibagi menurut porsi tersebut.'],
      ['Pasal 7 - Penyelesaian penuh pada penjualan','Sesuai kesepakatan para pihak, setelah penjualan diselesaikan dan bagian hasil bersih dibayarkan, pembagian tersebut merupakan penyelesaian penuh seluruh pinjaman. Kreditur menerima bagiannya sekalipun lebih kecil dari saldo pinjaman; selisih kekurangan tidak lagi ditagih. Jika bagiannya lebih besar dari saldo, seluruh bagian tersebut tetap menjadi hak Kreditur sesuai formula. Saldo tidak dipotong lagi sebelum pembagian. Bunga masa depan berhenti sejak penyelesaian penjualan. Bunga yang telah diterima sebelumnya tidak dikembalikan dan tidak ditambahkan lagi sebagai tagihan. Penyelesaian ini perlu dituangkan dalam tanda terima dan pernyataan lunas tertulis.'],
      ['Pasal 8 - Pembukuan dan lampiran','Setiap pembayaran didukung bukti dan dicatat dengan pemisahan pokok dan bunga. Seluruh baris lampiran adalah kemungkinan penjualan yang saling alternatif, bukan penjualan berulang. Angka rupiah dibulatkan hanya untuk tampilan; selisih pembulatan pembagian dialokasikan ke bagian Kreditur. Lampiran direkonsiliasi dengan transaksi aktual sebelum penjualan. Perubahan kesepakatan dibuat tertulis dan disetujui kedua pihak.'],
      ['Pasal 9 - Keadaan yang belum diatur','Prosedur gagal bayar, kematian/waris, sengketa, persetujuan pasangan/pemegang hak, jaminan bila ada, biaya hukum, serta kelanjutan utang jika tidak dijual dan belum lunas pada jatuh tempo: [LENGKAPI BERDASARKAN KESEPAKATAN DAN TINJAUAN HUKUM]. Sengketa diupayakan melalui musyawarah; forum penyelesaian lanjutan: [LENGKAPI]. Dokumen ini tidak membentuk hak tanggungan secara otomatis.'],
      ['Catatan lampiran',`Harga jual contoh ${money(s.price)}; biaya jual contoh ${money(s.costs)}; hasil bersih contoh ${money(s.price-s.costs)}. Ini asumsi ilustrasi, bukan harga jual yang dijamin. Status proyeksi: ${r.paidOff?'lunas pada '+date(r.payoffDate):'BELUM LUNAS setelah 50 tahun; saldo '+money(r.balance)}. Inflasi ${c.inflation}% hanya untuk analisis daya beli, tidak mengubah pembayaran nominal dalam perjanjian.`],
      ['Tanda tangan setelah peninjauan','Kreditur: ____________________    Debitur: ____________________\nSaksi 1: ____________________    Saksi 2: ____________________\nNama, tanggal, serta formalitas lain: [LENGKAPI].']
    ];
  }
  async function pdf(c,r,s,d={}) {
    if(validateSale(s).length)throw new Error(validateSale(s).join(' '));
    const lib=root.PDFLib||(typeof require==='function'?require('./vendor/pdf-lib.min.js'):null);
    const {PDFDocument,StandardFonts,rgb}=lib;
    const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold);
    const W=841.89,H=595.28,M=34,ink=rgb(.09,.22,.17),muted=rgb(.35,.4,.37);
    let page,y;const clean=s=>String(s).replace(/[^\x20-\x7e\xa0-\xff\n]/g,'-');
    function newPage(title){page=doc.addPage([W,H]);y=H-M;page.drawText('RUANG  /  DRAF - BELUM DITANDATANGANI',{x:M,y,font:bold,size:9,color:ink});y-=24;page.drawText(title,{x:M,y,font:bold,size:13,color:ink});y-=24;}
    function paragraph(text,size=9){
      for(const p of clean(text).split('\n')){
        let line='';for(const word of p.split(/\s+/)){
          // Split long identity/property tokens so user text cannot overflow the page.
          const chunks=word.match(/.{1,80}/g)||[''];
          for(const chunk of chunks){const next=line?line+' '+chunk:chunk;if(font.widthOfTextAtSize(next,size)>W-2*M){if(y<60)newPage('Perjanjian pinjaman - lanjutan');page.drawText(line,{x:M,y,font,size,color:ink});y-=size*1.5;line=chunk;}else line=next;}
        }
        if(y<60)newPage('Perjanjian pinjaman - lanjutan');page.drawText(line,{x:M,y,font,size,color:ink});y-=size*1.5;
      }y-=6;
    }
    newPage('Perjanjian pinjaman keluarga dan pembagian hasil penjualan');
    for(const [heading,text] of clauses(c,r,s,d)){if(y<110)newPage('Perjanjian pinjaman - lanjutan');page.drawText(clean(heading),{x:M,y,font:bold,size:10,color:ink});y-=16;paragraph(text);}
    // Explicit extra-payment list includes payments that may fall after payoff.
    newPage('Lampiran A - Asumsi dan pembayaran tambahan');
    paragraph('Seluruh angka adalah proyeksi berdasarkan input saat ekspor. Pembayaran ekstra di bawah yang jatuh setelah pelunasan tidak digunakan.');
    for(const [label,value] of summary(c,r,s).slice(2,22)) paragraph(label+': '+value);
    paragraph('Pembayaran tambahan sekali:');
    if(!c.prepayments.length)paragraph('Tidak ada.');
    for(const p of c.prepayments)paragraph('Bulan '+p.month+' - '+date(root.Mortgage.dateAt(c.startDate,p.month-1))+': '+money(p.amount)+(p.month>r.months?' (tidak digunakan; setelah pelunasan)':''));
    const widths=[28,51,78,73,73,73,78,56,56,104,104];
    const heads=['Bln','Periode','Bayar total Rp','Bunga bayar Rp','Pokok awal Rp','Pokok kum. Rp','Sisa saldo Rp','Debitur %','Kreditur %','Hasil debitur Rp','Hasil kreditur Rp'];
    const tablePage=()=>{newPage('Lampiran B - Jadwal bulanan dan porsi hasil jual');paragraph('Sesudah pembayaran akhir bulan. Bunga dibayar tidak termasuk porsi. Hasil jual memakai satu asumsi harga dan biaya untuk seluruh baris.',8);let x=M;heads.forEach((v,i)=>{page.drawRectangle({x,y:y-8,width:widths[i],height:23,color:ink});page.drawText(v,{x:x+3,y,font:bold,size:6.3,color:rgb(1,1,1)});x+=widths[i];});y-=27;};
    tablePage();
    for(const row of schedule(c,r,s)){
      if(y<67)tablePage();let x=M;
      const amounts=[row.month,row.date,row.payment,row.interestPaid,row.originalPrincipalPayment,row.originalPrincipalPaid,row.balance,pct(row.borrowerShare),pct(row.creditorShare),row.saleBorrower,row.saleCreditor];
      amounts.forEach((value,i)=>{const text=clean(typeof value==='number'&&i>1?new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(value):value);let size=7;while(font.widthOfTextAtSize(text,size)>widths[i]-6)size-=.2;page.drawText(text,{x:x+3,y,font,size,color:ink});x+=widths[i];});
      page.drawLine({start:{x:M,y:y-6},end:{x:W-M,y:y-6},thickness:.3,color:rgb(.8,.85,.81)});y-=20;
    }
    doc.getPages().forEach((p,i)=>{p.drawText('PROYEKSI / DRAF | '+(i+1)+' / '+doc.getPageCount(),{x:M,y:25,font,size:8,color:muted});});
    doc.setTitle('Draf Perjanjian Pinjaman Keluarga - Ruang');doc.setAuthor('Ruang - dibuat lokal di browser');
    return doc.save();
  }
  const api={validateSale,distribution,schedule,columns,csv,xlsx,pdf,clauses};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.RuangDocuments=api;
})(typeof window!=='undefined'?window:globalThis);
