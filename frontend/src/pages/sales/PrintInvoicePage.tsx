/**
 * Printable Invoice — connected to real API data
 * Shows company logo, address, GSTIN/tax numbers
 */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

interface Company {
  legal_name: string; trade_name?: string; logo_url?: string; brand_color?: string;
  address_line1?: string; address_line2?: string; city?: string; state?: string;
  postal_code?: string; country?: string; phone?: string; email?: string; website?: string;
  tax_registrations?: Record<string,string>;
  bank_name?: string; bank_account?: string; bank_ifsc?: string; swift_code?: string; iban?: string;
  currency_symbol?: string; invoice_footer?: string; terms_conditions?: string;
  default_payment_terms?: string;
}

const fmtCur = (v: number, sym='₹') =>
  `${sym}${(v||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

const toWords = (num: number): string => {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven',
    'Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const t = (n: number): string => {
    if (n===0) return '';
    if (n<20) return ones[n];
    if (n<100) return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
    if (n<1000) return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+t(n%100):'');
    if (n<100000) return t(Math.floor(n/1000))+' Thousand'+(n%1000?' '+t(n%1000):'');
    if (n<10000000) return t(Math.floor(n/100000))+' Lakh'+(n%100000?' '+t(n%100000):'');
    return t(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+t(n%10000000):'');
  };
  const r = Math.floor(num), p = Math.round((num-r)*100);
  return (t(r)||'Zero')+' Rupees'+(p>0?' and '+t(p)+' Paise':'')+' Only';
};

export default function PrintInvoicePage() {
  const { id, type = 'invoice' } = useParams<{id:string; type:string}>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<any>(null);
  const [company, setCompany] = useState<Company|null>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cpRes] = await Promise.all([api.get('/payroll-v2/company-profile')]);
        setCompany(cpRes.data);

        let docRes, custRes;
        if (type === 'invoice') {
          docRes = await api.get(`/sales/invoices/${id}`);
          custRes = await api.get(`/crm/customers/${docRes.data.customer_id}`);
          setDoc(docRes.data);
          setItems(docRes.data.items || []);
          setCustomer(custRes.data);
        } else if (type === 'sales_order') {
          docRes = await api.get(`/sales/orders/${id}`);
          custRes = await api.get(`/crm/customers/${docRes.data.customer_id}`);
          setDoc(docRes.data);
          setItems(docRes.data.items || []);
          setCustomer(custRes.data);
        } else if (type === 'purchase_order') {
          docRes = await api.get(`/procurement/orders/${id}`);
          const vendRes = await api.get(`/procurement/vendors/${docRes.data.vendor_id}`);
          setDoc(docRes.data);
          setItems(docRes.data.items || []);
          setCustomer(vendRes.data);
        }
      } catch(e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [id, type]);

  const handlePrint = () => window.print();
  const handleDownload = () => {
    window.print(); // In production: use html2pdf or puppeteer
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500">Loading document...</p></div>
    </div>
  );

  if (!doc || !company) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center text-slate-400"><p className="text-xl mb-2">Document not found</p>
        <button onClick={()=>navigate(-1)} className="text-indigo-600 hover:underline">← Go Back</button></div>
    </div>
  );

  const sym = company.currency_symbol || '₹';
  const taxRegs = company.tax_registrations || {};
  const color = company.brand_color || '#6366f1';

  const docTitle = type==='invoice'?'TAX INVOICE':type==='sales_order'?'SALES ORDER':type==='purchase_order'?'PURCHASE ORDER':'DOCUMENT';
  const docNum = doc.invoice_number || doc.order_number || doc.po_number || `#${id}`;
  const docDate = doc.invoice_date || doc.order_date || doc.order_date || '';
  const dueDate = doc.due_date || doc.delivery_date || '';
  const totalAmt = Number(doc.total_amount || 0);
  const amtPaid = Number(doc.amount_paid || 0);
  const balanceDue = Number(doc.balance_due || totalAmt - amtPaid);
  const subtotal = Number(doc.subtotal || 0);
  const taxAmt = Number(doc.tax_amount || doc.cgst_amount || 0) * (doc.cgst_amount ? 2 : 1);

  const partyName = customer?.company_name || customer?.name || '—';
  const partyAddr = [customer?.billing_address, customer?.city, customer?.state].filter(Boolean).join(', ');
  const partyGstin = customer?.gstin || '';

  return (
    <>
      {/* Action bar — hidden on print */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">{docTitle} — {docNum}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>

      {/* Printable Document */}
      <div className="pt-16 print:pt-0 min-h-screen bg-slate-100 print:bg-white">
        <div ref={printRef} style={{maxWidth:'210mm',margin:'0 auto',backgroundColor:'#fff',padding:'20px',boxShadow:'0 0 20px rgba(0,0,0,0.1)',fontFamily:'Arial,Helvetica,sans-serif',fontSize:'11px',color:'#000',lineHeight:'1.4'}}>

          {/* ── HEADER ── */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px',paddingBottom:'16px',borderBottom:`3px solid ${color}`}}>
            {/* Company Info */}
            <div style={{flex:1,paddingRight:'20px'}}>
              {company.logo_url ? (
                <img src={company.logo_url} alt="Logo" style={{height:'56px',marginBottom:'8px',objectFit:'contain'}} />
              ) : (
                <div style={{fontSize:'20px',fontWeight:'900',color,letterSpacing:'1px',marginBottom:'6px'}}>
                  {company.trade_name || company.legal_name}
                </div>
              )}
              <div style={{fontWeight:'700',color:'#1e293b',fontSize:'12px'}}>{company.legal_name}</div>
              <div style={{color:'#64748b',marginTop:'3px'}}>
                {company.address_line1}{company.address_line2?', '+company.address_line2:''}<br/>
                {company.city}{company.state?', '+company.state:''} - {company.postal_code}<br/>
                {company.country}
              </div>
              {company.phone && <div style={{color:'#64748b',marginTop:'3px'}}>📞 {company.phone}</div>}
              {company.email && <div style={{color:'#64748b'}}>✉ {company.email}</div>}
              {/* Tax Numbers */}
              <div style={{marginTop:'6px',padding:'6px 10px',backgroundColor:'#f0f4ff',borderRadius:'4px',display:'inline-block'}}>
                {taxRegs.gstin && <div style={{fontWeight:'700',color:'#1e293b',fontSize:'10px'}}>GSTIN: {taxRegs.gstin}</div>}
                {taxRegs.pan && <div style={{color:'#475569',fontSize:'10px'}}>PAN: {taxRegs.pan}</div>}
                {taxRegs.tan && <div style={{color:'#475569',fontSize:'10px'}}>TAN: {taxRegs.tan}</div>}
                {taxRegs.cin && <div style={{color:'#475569',fontSize:'10px'}}>CIN: {taxRegs.cin}</div>}
                {taxRegs['VAT Number'] && <div style={{fontWeight:'700',fontSize:'10px'}}>VAT: {taxRegs['VAT Number']}</div>}
                {taxRegs['EIN'] && <div style={{fontWeight:'700',fontSize:'10px'}}>EIN: {taxRegs['EIN']}</div>}
              </div>
            </div>

            {/* Document Info */}
            <div style={{textAlign:'right',minWidth:'180px'}}>
              <div style={{backgroundColor:color,color:'#fff',padding:'8px 16px',borderRadius:'8px',fontSize:'15px',fontWeight:'900',letterSpacing:'1px',marginBottom:'12px',display:'inline-block'}}>
                {docTitle}
              </div>
              <table style={{marginLeft:'auto',fontSize:'11px',width:'180px'}}>
                <tbody>
                  <tr><td style={{color:'#64748b',paddingRight:'10px',paddingBottom:'3px',textAlign:'right'}}>Number:</td><td style={{fontWeight:'700',textAlign:'right'}}>{docNum}</td></tr>
                  <tr><td style={{color:'#64748b',paddingBottom:'3px',textAlign:'right'}}>Date:</td><td style={{textAlign:'right'}}>{docDate?new Date(docDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):''}</td></tr>
                  {dueDate && <tr><td style={{color:'#64748b',paddingBottom:'3px',textAlign:'right'}}>Due/Delivery:</td><td style={{fontWeight:'700',color:'#ef4444',textAlign:'right'}}>{new Date(dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td></tr>}
                  <tr><td style={{color:'#64748b',textAlign:'right'}}>Terms:</td><td style={{textAlign:'right'}}>{doc.payment_terms||company.default_payment_terms||'30 days'}</td></tr>
                  {doc.status && <tr><td style={{color:'#64748b',textAlign:'right'}}>Status:</td><td style={{fontWeight:'700',color:doc.status==='paid'?'#10b981':doc.status==='sent'||doc.status==='confirmed'?'#3b82f6':'#f59e0b',textAlign:'right',textTransform:'uppercase'}}>{doc.status}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── BILL TO / BANK DETAILS ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div style={{padding:'12px',backgroundColor:'#f8fafc',borderRadius:'6px',border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:'10px',fontWeight:'700',color:'#64748b',textTransform:'uppercase',marginBottom:'6px'}}>
                {type==='purchase_order'?'VENDOR TO':'BILL TO'}
              </div>
              <div style={{fontWeight:'700',fontSize:'13px',color:'#1e293b'}}>{partyName}</div>
              {partyAddr && <div style={{color:'#64748b',marginTop:'3px'}}>{partyAddr}</div>}
              {partyGstin && <div style={{fontWeight:'700',marginTop:'4px',color:'#1e293b'}}>GSTIN: {partyGstin}</div>}
              {customer?.phone && <div style={{color:'#64748b',fontSize:'10px',marginTop:'2px'}}>📞 {customer.phone}</div>}
              {customer?.email && <div style={{color:'#64748b',fontSize:'10px'}}>✉ {customer.email}</div>}
            </div>
            {type==='invoice' && (
              <div style={{padding:'12px',backgroundColor:'#eff6ff',borderRadius:'6px',border:'1px solid #bfdbfe'}}>
                <div style={{fontSize:'10px',fontWeight:'700',color:'#1d4ed8',textTransform:'uppercase',marginBottom:'6px'}}>BANK DETAILS (For Payment)</div>
                {company.bank_name && <div><strong>Bank:</strong> {company.bank_name}</div>}
                {company.bank_account && <div style={{marginTop:'2px'}}><strong>A/C No:</strong> <span style={{fontFamily:'monospace'}}>{company.bank_account}</span></div>}
                {company.bank_ifsc && <div style={{marginTop:'2px'}}><strong>IFSC:</strong> <span style={{fontFamily:'monospace'}}>{company.bank_ifsc}</span></div>}
                {company.swift_code && <div style={{marginTop:'2px'}}><strong>SWIFT:</strong> {company.swift_code}</div>}
                {company.iban && <div style={{marginTop:'2px'}}><strong>IBAN:</strong> {company.iban}</div>}
              </div>
            )}
            {type !== 'invoice' && (
              <div style={{padding:'12px',backgroundColor:'#f0fdf4',borderRadius:'6px',border:'1px solid #bbf7d0'}}>
                <div style={{fontSize:'10px',fontWeight:'700',color:'#16a34a',textTransform:'uppercase',marginBottom:'6px'}}>
                  {type==='sales_order'?'DELIVERY DETAILS':'DELIVERY / SHIPPING'}
                </div>
                {doc.notes && <div style={{color:'#475569',fontSize:'11px'}}>{doc.notes}</div>}
                {dueDate && <div style={{marginTop:'4px'}}><strong>Delivery Date:</strong> {new Date(dueDate).toLocaleDateString('en-IN')}</div>}
              </div>
            )}
          </div>

          {/* ── LINE ITEMS TABLE ── */}
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'16px',fontSize:'10.5px'}}>
            <thead>
              <tr style={{backgroundColor:color,color:'#fff'}}>
                <th style={{padding:'8px 6px',textAlign:'left',width:'28px'}}>#</th>
                <th style={{padding:'8px 6px',textAlign:'left'}}>Description</th>
                <th style={{padding:'8px 6px',textAlign:'center',width:'65px'}}>HSN/SAC</th>
                <th style={{padding:'8px 6px',textAlign:'center',width:'45px'}}>Qty</th>
                <th style={{padding:'8px 6px',textAlign:'center',width:'38px'}}>Unit</th>
                <th style={{padding:'8px 6px',textAlign:'right',width:'80px'}}>Rate</th>
                <th style={{padding:'8px 6px',textAlign:'right',width:'48px'}}>Disc%</th>
                <th style={{padding:'8px 6px',textAlign:'right',width:'48px'}}>GST%</th>
                <th style={{padding:'8px 6px',textAlign:'right',width:'88px'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={9} style={{textAlign:'center',padding:'20px',color:'#94a3b8'}}>No line items</td></tr>
              )}
              {items.map((item, i) => {
                const lineTotal = Number(item.line_total || (item.quantity * item.unit_price));
                return (
                  <tr key={i} style={{backgroundColor:i%2===0?'#fff':'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
                    <td style={{padding:'7px 6px',color:'#94a3b8',textAlign:'center'}}>{i+1}</td>
                    <td style={{padding:'7px 6px',fontWeight:'500'}}>{item.description}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',fontFamily:'monospace',fontSize:'10px',color:'#64748b'}}>{item.hsn_code||'—'}</td>
                    <td style={{padding:'7px 6px',textAlign:'center'}}>{item.quantity}</td>
                    <td style={{padding:'7px 6px',textAlign:'center',color:'#64748b'}}>{item.unit||'nos'}</td>
                    <td style={{padding:'7px 6px',textAlign:'right'}}>{fmtCur(item.unit_price,sym)}</td>
                    <td style={{padding:'7px 6px',textAlign:'right',color:'#64748b'}}>{item.discount_percent||0}%</td>
                    <td style={{padding:'7px 6px',textAlign:'right',color:'#64748b'}}>{item.tax_percent||item.cgst_percent?((item.tax_percent||(item.cgst_percent||0)*2)):0}%</td>
                    <td style={{padding:'7px 6px',textAlign:'right',fontWeight:'600'}}>{fmtCur(lineTotal,sym)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── TOTALS ── */}
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'16px'}}>
            <table style={{fontSize:'12px',minWidth:'260px',borderCollapse:'collapse'}}>
              <tbody>
                <tr style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'5px 12px',color:'#64748b'}}>Subtotal</td>
                  <td style={{padding:'5px 12px',textAlign:'right'}}>{fmtCur(subtotal||totalAmt-taxAmt,sym)}</td>
                </tr>
                {taxAmt > 0 && (
                  <>
                    <tr style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'5px 12px',color:'#64748b'}}>CGST</td>
                      <td style={{padding:'5px 12px',textAlign:'right'}}>{fmtCur(taxAmt/2,sym)}</td>
                    </tr>
                    <tr style={{borderBottom:'1px solid #e2e8f0'}}>
                      <td style={{padding:'5px 12px',color:'#64748b'}}>SGST</td>
                      <td style={{padding:'5px 12px',textAlign:'right'}}>{fmtCur(taxAmt/2,sym)}</td>
                    </tr>
                  </>
                )}
                {amtPaid > 0 && (
                  <tr style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:'5px 12px',color:'#10b981'}}>Amount Received</td>
                    <td style={{padding:'5px 12px',textAlign:'right',color:'#10b981'}}>({fmtCur(amtPaid,sym)})</td>
                  </tr>
                )}
                <tr style={{backgroundColor:color,color:'#fff'}}>
                  <td style={{padding:'10px 12px',fontWeight:'700',fontSize:'14px'}}>
                    {type==='invoice'?'BALANCE DUE':'TOTAL AMOUNT'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontWeight:'900',fontSize:'15px'}}>
                    {fmtCur(type==='invoice'?balanceDue:totalAmt,sym)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div style={{backgroundColor:'#f0f4ff',padding:'8px 12px',borderRadius:'6px',marginBottom:'16px',fontSize:'11px',borderLeft:`3px solid ${color}`}}>
            <strong style={{color:color}}>Amount in Words: </strong>
            <span style={{color:'#1e293b'}}>{toWords(type==='invoice'?balanceDue:totalAmt)}</span>
          </div>

          {/* Notes & Terms */}
          {doc.notes && (
            <div style={{marginBottom:'12px',padding:'8px 12px',backgroundColor:'#fffbeb',borderLeft:'3px solid #f59e0b',borderRadius:'3px',fontSize:'11px',color:'#92400e'}}>
              <strong>Note: </strong>{doc.notes}
            </div>
          )}
          {company.terms_conditions && (
            <div style={{fontSize:'10px',color:'#94a3b8',marginBottom:'16px',padding:'8px 12px',backgroundColor:'#f8fafc',borderRadius:'4px'}}>
              <div style={{fontWeight:'700',marginBottom:'3px',color:'#64748b'}}>Terms & Conditions:</div>
              {company.terms_conditions}
            </div>
          )}

          {/* Footer */}
          <div style={{borderTop:'2px solid #e2e8f0',paddingTop:'14px',display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'20px'}}>
            <div style={{fontSize:'10px',color:'#94a3b8',maxWidth:'55%'}}>
              {company.invoice_footer && <div style={{marginBottom:'4px'}}>{company.invoice_footer}</div>}
              <div>This is a computer generated document. No physical signature required.</div>
              {company.website && <div style={{marginTop:'2px',color:'#6366f1'}}>{company.website}</div>}
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{width:'130px',borderBottom:'1px solid #000',marginBottom:'4px',height:'40px'}}></div>
              <div style={{fontSize:'10px',color:'#64748b'}}>Authorised Signatory</div>
              <div style={{fontSize:'11px',fontWeight:'700'}}>{company.legal_name}</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </>
  );
}
