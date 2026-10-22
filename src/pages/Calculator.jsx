import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, API, errorText, money } from '../api';
import { useApp } from '../AppContext.jsx';
import DoughnutChart from '../components/DoughnutChart.jsx';
import Guidelines from '../components/Guidelines.jsx';
import Schedule from '../components/Schedule.jsx';
import Steps from '../components/Steps.jsx';

export default function Calculator() {
  const { meta } = useApp();
  const [sp] = useSearchParams();
  const type = meta?.loanTypes.find((t) => t.code === sp.get('type'));
  if (!meta) return <p className="muted">Loading...</p>;
  return (
    <>
      <h1 className="h1">EMI Calculator</h1>
      {type ? <CalcForm key={sp.toString()} type={type} sp={sp} disclaimer={meta.disclaimer} /> : <Picker types={meta.loanTypes} />}
      <Guidelines />
    </>
  );
}

function Picker({ types }) {
  return (
    <>
      <p className="muted">Pick a loan type, enter your details, and see exactly how your EMI is calculated.</p>
      <div className="how">
        <div><b>1. Pick a loan type</b>Tap the box that matches your loan. Sample values are filled in for you.</div>
        <div><b>2. Enter your details</b>Type or slide the amount, rate and tenure, then press Calculate EMI.</div>
        <div><b>3. Read the steps</b>See your EMI, the totals and exactly how each number was worked out.</div>
      </div>
      <h2 className="h2">Choose your loan type</h2>
      <div className="grid g3">
        {types.map((t) => (
          <Link key={t.code} className="tile" to={`/calculator?type=${t.code}`}>
            <span className="ic">{t.icon}</span><strong>{t.label}</strong><small>{t.blurb}</small>
          </Link>
        ))}
      </div>
    </>
  );
}

function CalcForm({ type, sp, disclaimer }) {
  const { user } = useApp();
  const fromHistory = sp.has('amount');
  const [amount, setAmount] = useState(sp.get('amount') || String(type.defaultAmount));
  const [rate, setRate] = useState(sp.get('rate') || String(type.defaultRate));
  const [unit, setUnit] = useState(sp.get('unit') || 'YEARS');
  const [tenure, setTenure] = useState(sp.get('tenure') || String(type.defaultYears));
  const [name, setName] = useState(sp.get('name') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const body = () => ({ loanAmount: Number(amount), annualRate: Number(rate), tenure: Number(tenure), tenureUnit: unit, loanType: type.code });

  async function calculate(e) {
    e?.preventDefault();
    setError(''); setNotice(''); setLoading(true);
    try { setResult(await api('/emi/full', { method: 'POST', body: body() })); }
    catch (err) { setResult(null); setError(errorText(err)); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (fromHistory) calculate(); }, []); // reopen a saved calculation automatically

  async function save() {
    try { await api('/calculations', { method: 'POST', body: { ...body(), loanName: name } }); setNotice('Saved to your history.'); }
    catch (err) { setError(errorText(err)); }
  }

  const qs = new URLSearchParams({ loanAmount: amount, annualRate: rate, tenure, tenureUnit: unit, loanType: type.code }).toString();
  const s = result?.summary;

  return (
    <>
      <Link className="btn small outline no-print" to="/calculator">← Change loan type</Link>
      <form className="card no-print" onSubmit={calculate} style={{ marginTop: 12 }}>
        <h2 className="h2" style={{ marginTop: 0 }}>{type.icon} {type.label} loan details</h2>
        <p className="tip">{type.tip}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="grid g2">
          <div>
            <label htmlFor="amt">Loan amount (INR)</label>
            <input id="amt" type="number" min="1000" step="1000" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input type="range" min="100000" max="50000000" step="50000" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Loan amount slider" />
          </div>
          <div>
            <label htmlFor="rate">Annual interest rate (%)</label>
            <input id="rate" type="number" min="0" max="100" step="0.05" required value={rate} onChange={(e) => setRate(e.target.value)} />
            <input type="range" min="0" max="30" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} aria-label="Interest rate slider" />
          </div>
          <div>
            <label htmlFor="ten">Tenure</label>
            <input id="ten" type="number" min="1" required value={tenure} onChange={(e) => setTenure(e.target.value)} />
            <input type="range" min="1" max={unit === 'YEARS' ? 40 : 480} value={tenure} onChange={(e) => setTenure(e.target.value)} aria-label="Tenure slider" />
          </div>
          <div>
            <label htmlFor="unit">Tenure unit</label>
            <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="YEARS">Years</option><option value="MONTHS">Months</option>
            </select>
          </div>
        </div>
        <button className="btn" type="submit" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? 'Calculating...' : 'Calculate EMI'}
        </button>
      </form>

      {result && (
        <>
          <div className="card hero"><div className="lbl">Monthly EMI</div><div className="big">{money(s.monthlyEmi)}</div>
            <div className="small">{type.label} loan · {s.tenureMonths} months at {s.annualRate}% p.a.</div></div>
          <div className="grid g4" style={{ marginTop: 14 }}>
            <div className="card"><div className="lbl">Principal</div><div className="val">{money(s.loanAmount)}</div></div>
            <div className="card"><div className="lbl">Total interest</div><div className="val">{money(s.totalInterest)}</div></div>
            <div className="card"><div className="lbl">Total repayment</div><div className="val">{money(s.totalPayment)}</div></div>
            <div className="card"><div className="lbl">Tenure</div><div className="val">{s.tenureMonths} months</div></div>
          </div>
          <div className="grid g2" style={{ marginTop: 14 }}>
            <div className="card"><div className="lbl">Principal vs interest</div><DoughnutChart principal={s.loanAmount} interest={s.totalInterest} /></div>
            <div className="card no-print">
              <div className="lbl">Actions</div>
              <div className="row wrap" style={{ margin: '8px 0 12px' }}>
                <a className="btn small outline" href={`/api/emi/export/pdf?${qs}`}>Download PDF summary</a>
                <a className="btn small outline" href={`/api/emi/export/csv?${qs}`}>Download schedule (CSV)</a>
                <button className="btn small outline" type="button" onClick={() => window.print()}>Print</button>
              </div>
              {user ? (
                <div className="row">
                  <input value={name} maxLength={100} placeholder="Name this calculation" aria-label="Calculation name" onChange={(e) => setName(e.target.value)} />
                  <button className="btn small" type="button" onClick={save}>Save</button>
                </div>
              ) : <p className="small muted"><Link to="/login">Log in</Link> to save this calculation to your history.</p>}
              {notice && <p className="ok small">{notice}</p>}
              <p className="small muted">{disclaimer}</p>
            </div>
          </div>
          <h2 className="h2">How this was calculated</h2>
          <Steps summary={s} ex={result.explanation} disclaimer={disclaimer} />
          <h2 className="h2">Repayment schedule</h2>
          <Schedule rows={result.schedule} />
        </>
      )}
    </>
  );
}
