/**
 * Printable Document Component
 * Used for Invoice, Sales Order, Purchase Order, Payslip
 * Includes company logo, address, GST/tax numbers
 */
import React from 'react';

interface CompanyProfile {
  legal_name: string; trade_name?: string; logo_url?: string; brand_color?: string;
  address_line1?: string; address_line2?: string; city?: string; state?: string;
  postal_code?: string; country?: string; phone?: string; email?: string; website?: string;
  tax_registrations?: Record<string,string>;
  bank_name?: string; bank_account?: string; bank_ifsc?: string; swift_code?: string;
  currency_symbol?: string; invoice_footer?: string; terms_conditions?: string;
}

interface DocumentItem {
  description: string; hsn_code?: string; quantity: number; unit?: string;
  unit_price: number; discount_percent?: number; tax_percent?: number; line_total: number;
}

interface PrintableDocumentProps {
  type: 'invoice' | 'sales_order' | 'purchase_order' | 'quotation';
  docNumber: string;
  date: string;
  dueDate?: string;
  company: CompanyProfile;
  // Customer / Vendor
  partyName: string;
  partyAddress?: string;
  partyGstin?: string;
  partyPhone?: string;
  partyEmail?: string;
  // Items
  items: DocumentItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentTerms?: string;
  notes?: string;
  status?: string;
  // Extra
  poReference?: string;
  deliveryDate?: string;
}

const TYPE_LABELS: Record<string,string> = {
  invoice: 'TAX INVOICE', sales_order: 'SALES ORDER',
  purchase_order: 'PURCHASE ORDER', quotation: 'QUOTATION / ESTIMATE'
};

const fmtCur = (v: number, sym='₹') => `${sym}${v.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  type, docNumber, date, dueDate, company, partyName, partyAddress, partyGstin,
  partyPhone, partyEmail, items, subtotal, taxAmount, totalAmount,
  amountPaid, balanceDue, paymentTerms, notes, status, poReference, deliveryDate,
}) => {
  const sym = company.currency_symbol || '₹';
  const color = company.brand_color || '#6366f1';
  const taxRegs = company.tax_registrations || {};
  const gstin = taxRegs.gstin || taxRegs.vat || taxRegs.ein || '';

  const numberToWords = (num: number): string => {
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const toWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+toWords(n%100) : '');
      if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+toWords(n%1000) : '');
      if (n < 10000000) return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+toWords(n%100000) : '');
      return toWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' '+toWords(n%10000000) : '');
    };
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let words = toWords(rupees) || 'Zero';
    words += ' Rupees';
    if (paise > 0) words += ' and ' + toWords(paise) + ' Paise';
    return words + ' Only';
  };

  return (
    <div className="print-document" style={{fontFamily:'Arial,sans-serif',maxWidth:'210mm',margin:'0 auto',padding:'16px',backgroundColor:'#fff',color:'#000',fontSize:'11px'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',paddingBottom:'12px',borderBottom:`3px solid ${color}`}}>
        <div style={{flex:1}}>
          {company.logo_url ? (
            <img src={company.logo_url} alt="Logo" style={{height:'60px',marginBottom:'6px',objectFit:'contain'}} />
          ) : (
            <div style={{fontSize:'22px',fontWeight:'900',color,letterSpacing:'1px',marginBottom:'4px'}}>
              {company.trade_name || company.legal_name}
            </div>
          )}
          <div style={{fontSize:'12px',fontWeight:'700',color:'#1e293b'}}>{company.legal_name}</div>
          <div style={{color:'#64748b',lineHeight:'1.5',marginTop:'4px'}}>
            {company.address_line1}{company.address_line2 ? ', '+company.address_line2 : ''},<br/>
            {company.city}, {company.state} - {company.postal_code}, {company.country}
          </div>
          <div style={{color:'#64748b',marginTop:'4px'}}>
            {company.phone && `Ph: ${company.phone}`}
            {company.email && ` | ${company.email}`}
          </div>
          {gstin && <div style={{fontWeight:'700',color:'#1e293b',marginTop:'4px'}}>GSTIN: {gstin}</div>}
          {taxRegs.pan && <div style={{color:'#64748b'}}>PAN: {taxRegs.pan}</div>}
          {taxRegs.cin && <div style={{color:'#64748b',fontSize:'10px'}}>CIN: {taxRegs.cin}</div>}
        </div>
        <div style={{textAlign:'right',minWidth:'160px'}}>
          <div style={{backgroundColor:color,color:'#fff',padding:'8px 16px',borderRadius:'6px',fontSize:'14px',fontWeight:'900',marginBottom:'10px'}}>
            {TYPE_LABELS[type]}
          </div>
          <table style={{marginLeft:'auto',fontSize:'11px'}}>
            <tbody>
              <tr><td style={{color:'#64748b',paddingRight:'8px'}}>Number:</td><td style={{fontWeight:'700'}}>{docNumber}</td></tr>
              <tr><td style={{color:'#64748b'}}>Date:</td><td>{new Date(date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td></tr>
              {dueDate && <tr><td style={{color:'#64748b'}}>Due Date:</td><td style={{fontWeight:'700',color:'#ef4444'}}>{new Date(dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td></tr>}
              {deliveryDate && <tr><td style={{color:'#64748b'}}>Delivery:</td><td>{new Date(deliveryDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td></tr>}
              {poReference && <tr><td style={{color:'#64748b'}}>PO Ref:</td><td>{poReference}</td></tr>}
              {paymentTerms && <tr><td style={{color:'#64748b'}}>Terms:</td><td>{paymentTerms}</td></tr>}
              {status && <tr><td style={{color:'#64748b'}}>Status:</td><td style={{fontWeight:'700',color:status==='paid'?'#10b981':status==='overdue'?'#ef4444':'#f59e0b',textTransform:'uppercase'}}>{status}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill To / Ship To */}
      <div style={{display:'flex',gap:'24px',marginBottom:'16px'}}>
        <div style={{flex:1,backgroundColor:'#f8fafc',padding:'12px',borderRadius:'6px',border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:'10px',fontWeight:'700',color:'#64748b',textTransform:'uppercase',marginBottom:'6px'}}>
            {type==='purchase_order'?'Vendor To':'Bill To'}
          </div>
          <div style={{fontWeight:'700',fontSize:'13px',color:'#1e293b'}}>{partyName}</div>
          {partyAddress && <div style={{color:'#64748b',marginTop:'3px',lineHeight:'1.5'}}>{partyAddress}</div>}
          {partyGstin && <div style={{fontWeight:'700',marginTop:'4px'}}>GSTIN: {partyGstin}</div>}
          {partyPhone && <div style={{color:'#64748b'}}>Ph: {partyPhone}</div>}
          {partyEmail && <div style={{color:'#64748b'}}>{partyEmail}</div>}
        </div>
        {type === 'invoice' && (
          <div style={{flex:1,backgroundColor:'#f0f4ff',padding:'12px',borderRadius:'6px',border:'1px solid #c7d2fe'}}>
            <div style={{fontSize:'10px',fontWeight:'700',color:'#6366f1',textTransform:'uppercase',marginBottom:'6px'}}>Bank Details</div>
            <div><strong>Bank:</strong> {company.bank_name}</div>
            <div><strong>A/C No:</strong> {company.bank_account}</div>
            <div><strong>IFSC:</strong> {company.bank_ifsc}</div>
            {company.swift_code && <div><strong>SWIFT:</strong> {company.swift_code}</div>}
          </div>
        )}
      </div>

      {/* Items Table */}
      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'16px',fontSize:'11px'}}>
        <thead>
          <tr style={{backgroundColor:color,color:'#fff'}}>
            <th style={{padding:'8px',textAlign:'left',width:'32px'}}>#</th>
            <th style={{padding:'8px',textAlign:'left'}}>Description</th>
            <th style={{padding:'8px',textAlign:'center',width:'70px'}}>HSN/SAC</th>
            <th style={{padding:'8px',textAlign:'center',width:'50px'}}>Qty</th>
            <th style={{padding:'8px',textAlign:'center',width:'40px'}}>Unit</th>
            <th style={{padding:'8px',textAlign:'right',width:'80px'}}>Rate</th>
            <th style={{padding:'8px',textAlign:'right',width:'50px'}}>Disc%</th>
            <th style={{padding:'8px',textAlign:'right',width:'50px'}}>GST%</th>
            <th style={{padding:'8px',textAlign:'right',width:'90px'}}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{backgroundColor:i%2===0?'#fff':'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
              <td style={{padding:'7px 8px',color:'#94a3b8'}}>{i+1}</td>
              <td style={{padding:'7px 8px',fontWeight:'500'}}>{item.description}</td>
              <td style={{padding:'7px 8px',textAlign:'center',color:'#64748b',fontFamily:'monospace'}}>{item.hsn_code||'—'}</td>
              <td style={{padding:'7px 8px',textAlign:'center'}}>{item.quantity}</td>
              <td style={{padding:'7px 8px',textAlign:'center',color:'#64748b'}}>{item.unit||'nos'}</td>
              <td style={{padding:'7px 8px',textAlign:'right'}}>{fmtCur(item.unit_price,sym)}</td>
              <td style={{padding:'7px 8px',textAlign:'right',color:'#64748b'}}>{item.discount_percent||0}%</td>
              <td style={{padding:'7px 8px',textAlign:'right',color:'#64748b'}}>{item.tax_percent||0}%</td>
              <td style={{padding:'7px 8px',textAlign:'right',fontWeight:'600'}}>{fmtCur(item.line_total,sym)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'16px'}}>
        <table style={{fontSize:'12px',minWidth:'280px'}}>
          <tbody>
            <tr><td style={{padding:'4px 12px',color:'#64748b'}}>Subtotal</td><td style={{padding:'4px 12px',textAlign:'right'}}>{fmtCur(subtotal,sym)}</td></tr>
            <tr><td style={{padding:'4px 12px',color:'#64748b'}}>CGST + SGST / GST</td><td style={{padding:'4px 12px',textAlign:'right'}}>{fmtCur(taxAmount,sym)}</td></tr>
            {amountPaid !== undefined && amountPaid > 0 && <tr><td style={{padding:'4px 12px',color:'#10b981'}}>Amount Received</td><td style={{padding:'4px 12px',textAlign:'right',color:'#10b981'}}>({fmtCur(amountPaid,sym)})</td></tr>}
            <tr style={{backgroundColor:color,color:'#fff'}}>
              <td style={{padding:'8px 12px',fontWeight:'700',fontSize:'13px'}}>TOTAL DUE</td>
              <td style={{padding:'8px 12px',textAlign:'right',fontWeight:'900',fontSize:'14px'}}>{fmtCur(balanceDue !== undefined ? balanceDue : totalAmount, sym)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words */}
      <div style={{backgroundColor:'#f0f4ff',padding:'8px 12px',borderRadius:'6px',marginBottom:'16px',fontSize:'11px'}}>
        <strong>Amount in Words: </strong>{numberToWords(balanceDue !== undefined ? balanceDue : totalAmount)}
      </div>

      {/* Notes & Terms */}
      {notes && <div style={{marginBottom:'12px',padding:'8px',backgroundColor:'#fffbeb',borderLeft:'3px solid #f59e0b',borderRadius:'3px',fontSize:'11px'}}><strong>Note: </strong>{notes}</div>}
      {company.terms_conditions && (
        <div style={{fontSize:'10px',color:'#94a3b8',marginBottom:'12px'}}>
          <div style={{fontWeight:'700',marginBottom:'3px'}}>Terms & Conditions:</div>
          {company.terms_conditions}
        </div>
      )}

      {/* Footer */}
      <div style={{borderTop:'2px solid #e2e8f0',paddingTop:'12px',display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'16px'}}>
        <div style={{fontSize:'10px',color:'#94a3b8',maxWidth:'60%'}}>
          {company.invoice_footer}
          <div style={{marginTop:'4px'}}>This is a computer generated document.</div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{width:'120px',borderBottom:'1px solid #000',marginBottom:'4px',height:'40px'}}></div>
          <div style={{fontSize:'10px',color:'#64748b'}}>Authorised Signatory</div>
          <div style={{fontSize:'11px',fontWeight:'700'}}>{company.legal_name}</div>
        </div>
      </div>
    </div>
  );
};

export default PrintableDocument;
