import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Zap, ShieldCheck, Radio, ChevronRight, Check, Loader2, Wallet, Receipt, Users, Store } from 'lucide-react';

const RECIPIENT_TYPES = [
  { id: 'bill', label: 'Pay a bill', sublabel: 'Electricity, water, internet', icon: Receipt },
  { id: 'person', label: 'Send to someone', sublabel: 'Family, friends', icon: Users },
  { id: 'merchant', label: 'Pay a merchant', sublabel: 'Market, shop, service', icon: Store },
];

const BILLERS = ['Ikeja Electric (PHCN)', 'Eko Electric', 'Lagos Water Corporation', 'MTN Data', 'DSTV / GOtv'];

function useLiveRate() {
  const [rate, setRate] = useState(1587.42);
  useEffect(() => {
    const id = setInterval(() => {
      setRate(r => {
        const drift = (Math.random() - 0.5) * 1.2;
        return Math.round((r + drift) * 100) / 100;
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return rate;
}

function CorridorVisual({ stage }) {
  // stage: 0 idle, 1 quoting, 2 bridging, 3 settling, 4 done
  const steps = [
    { key: 'source', label: 'USDC · Sender' },
    { key: 'Arcatraz', label: 'CCTP · Arc' },
    { key: 'settle', label: 'NGN · Recipient' },
  ];
  const progress = stage === 0 ? 0 : stage === 1 ? 0.08 : stage === 2 ? 0.5 : stage >= 3 ? 1 : 0;

  return (
    <div className="corridor">
      <div className="corridor-track">
        <div className="corridor-fill" style={{ width: `${progress * 100}%` }} />
        <div className="corridor-pulse" style={{ left: `${progress * 100}%`, opacity: stage === 1 || stage === 2 ? 1 : 0 }} />
      </div>
      <div className="corridor-nodes">
        {steps.map((s, i) => {
          const active = (i === 0 && stage >= 1) || (i === 1 && stage >= 2) || (i === 2 && stage >= 3);
          const current = (i === 0 && stage === 1) || (i === 1 && stage === 2) || (i === 2 && stage === 3);
          return (
            <div key={s.key} className={`corridor-node ${active ? 'node-active' : ''} ${current ? 'node-current' : ''}`}>
              <div className="node-dot">{active && !current ? <Check size={11} strokeWidth={3} /> : current ? <Loader2 size={11} className="spin" /> : null}</div>
              <span className="node-label">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Arcatraz() {
  const [step, setStep] = useState('type'); // type, details, review, processing, done
  const [recipientType, setRecipientType] = useState(null);
  const [biller, setBiller] = useState(BILLERS[0]);
  const [accountRef, setAccountRef] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('100');
  const [corridorStage, setCorridorStage] = useState(0);
  const rate = useLiveRate();
  const timeoutsRef = useRef([]);

  const ngnAmount = (parseFloat(usdcAmount || 0) * rate).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  const fee = 0; // gas-sponsored, no fee shown to sender

  const goReview = () => setStep('review');

  const confirmPay = () => {
    setStep('processing');
    setCorridorStage(1);
    const t1 = setTimeout(() => setCorridorStage(2), 1400);
    const t2 = setTimeout(() => setCorridorStage(3), 3000);
    const t3 = setTimeout(() => { setCorridorStage(4); setStep('done'); }, 4600);
    timeoutsRef.current = [t1, t2, t3];
  };

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  const reset = () => {
    setStep('type');
    setRecipientType(null);
    setAccountRef('');
    setRecipientName('');
    setUsdcAmount('100');
    setCorridorStage(0);
  };

  const canProceedDetails =
    recipientType === 'bill' ? accountRef.trim().length > 3 :
    recipientType === 'person' ? recipientName.trim().length > 1 && accountRef.trim().length > 3 :
    recipientType === 'merchant' ? recipientName.trim().length > 1 : false;

  return (
    <div className="Arcatraz-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .Arcatraz-root {
          --ink: #0B0F1A;
          --ink-2: #131B2E;
          --sand: #E8DFC9;
          --sand-dim: #C9BFA3;
          --green: #14663F;
          --green-bright: #1E8A57;
          --amber: #D4A24C;
          --white-blue: #EAF0F5;
          --white-blue-dim: #9AA7BD;
          font-family: 'Space Grotesk', sans-serif;
          background: var(--ink);
          color: var(--white-blue);
          min-height: 100vh;
          padding: 32px 20px 60px;
          display: flex;
          justify-content: center;
        }
        .Arcatraz-root * { box-sizing: border-box; }
        .Arcatraz-shell { width: 100%; max-width: 460px; }

        .brand-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px;
        }
        .brand-mark {
          display: flex; align-items: center; gap: 9px;
          font-weight: 700; font-size: 17px; letter-spacing: -0.01em; color: var(--white-blue);
        }
        .brand-glyph {
          width: 26px; height: 26px; border-radius: 7px;
          background: linear-gradient(135deg, var(--green-bright), var(--green));
          display: flex; align-items: center; justify-content: center;
        }
        .live-chip {
          display: flex; align-items: center; gap: 6px;
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          color: var(--white-blue-dim); background: rgba(255,255,255,0.04);
          padding: 5px 10px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.06);
        }
        .live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--green-bright);
          box-shadow: 0 0 0 0 rgba(30,138,87,0.6);
          animation: livepulse 2s infinite;
        }
        @keyframes livepulse {
          0% { box-shadow: 0 0 0 0 rgba(30,138,87,0.5); }
          70% { box-shadow: 0 0 0 5px rgba(30,138,87,0); }
          100% { box-shadow: 0 0 0 0 rgba(30,138,87,0); }
        }

        .headline { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 6px; }
        .subline { color: var(--white-blue-dim); font-size: 14px; margin: 0 0 26px; line-height: 1.5; }

        .card {
          background: var(--ink-2);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 20px;
        }

        .type-grid { display: flex; flex-direction: column; gap: 10px; }
        .type-option {
          display: flex; align-items: center; gap: 14px;
          background: var(--ink-2); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 16px; cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
          text-align: left; width: 100%; color: inherit; font-family: inherit;
        }
        .type-option:hover { border-color: rgba(30,138,87,0.5); background: rgba(30,138,87,0.06); }
        .type-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          background: rgba(212,162,76,0.12); color: var(--amber);
          display: flex; align-items: center; justify-content: center;
        }
        .type-text-label { font-weight: 600; font-size: 15px; color: var(--white-blue); }
        .type-text-sub { font-size: 12.5px; color: var(--white-blue-dim); margin-top: 1px; }
        .type-chevron { margin-left: auto; color: var(--white-blue-dim); flex-shrink: 0; }

        .field-label {
          font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--white-blue-dim); margin-bottom: 8px; display: block;
        }
        .field-group { margin-bottom: 18px; }
        select.bfield, input.bfield {
          width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 13px 14px; color: var(--white-blue); font-size: 15px;
          font-family: 'Space Grotesk', sans-serif; outline: none; transition: border-color 0.15s ease;
        }
        select.bfield:focus, input.bfield:focus { border-color: var(--green-bright); }
        input.bfield::placeholder { color: rgba(154,167,189,0.5); }

        .amount-row {
          display: flex; align-items: baseline; gap: 8px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 14px 14px;
        }
        .amount-row input {
          background: none; border: none; outline: none; color: var(--white-blue);
          font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 500;
          width: 100%; padding: 0;
        }
        .amount-unit { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--white-blue-dim); flex-shrink: 0; }

        .quote-line {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--white-blue-dim);
        }
        .quote-value { color: var(--amber); font-weight: 600; }

        .btn-primary {
          width: 100%; background: var(--green-bright); color: #06150E; border: none;
          border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700;
          font-family: 'Space Grotesk', sans-serif; cursor: pointer; display: flex;
          align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s ease, opacity 0.15s ease;
          margin-top: 6px;
        }
        .btn-primary:hover:not(:disabled) { background: #26a066; }
        .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-secondary {
          width: 100%; background: none; color: var(--white-blue-dim); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 500;
          font-family: 'Space Grotesk', sans-serif; cursor: pointer; margin-top: 10px;
        }
        .btn-secondary:hover { color: var(--white-blue); border-color: rgba(255,255,255,0.2); }

        .review-row {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 14px;
        }
        .review-row:last-of-type { border-bottom: none; }
        .review-key { color: var(--white-blue-dim); }
        .review-val { color: var(--white-blue); font-weight: 500; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 13.5px; }

        .fee-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(30,138,87,0.14); color: var(--green-bright);
          font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 100px;
          margin-top: 14px;
        }

        .corridor { margin: 30px 0 26px; }
        .corridor-track {
          position: relative; height: 3px; background: rgba(255,255,255,0.08);
          border-radius: 2px; margin-bottom: 14px; overflow: visible;
        }
        .corridor-fill {
          height: 100%; background: linear-gradient(90deg, var(--green-bright), var(--amber));
          border-radius: 2px; transition: width 1.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .corridor-pulse {
          position: absolute; top: 50%; width: 12px; height: 12px; margin-left: -6px;
          background: var(--amber); border-radius: 50%; transform: translateY(-50%);
          box-shadow: 0 0 12px 3px rgba(212,162,76,0.6); transition: left 1.3s ease, opacity 0.3s ease;
        }
        .corridor-nodes { display: flex; justify-content: space-between; }
        .corridor-node { display: flex; flex-direction: column; align-items: center; gap: 7px; width: 33%; }
        .node-dot {
          width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center; color: var(--white-blue-dim);
          transition: all 0.3s ease;
        }
        .node-active .node-dot { border-color: var(--green-bright); color: var(--green-bright); background: rgba(30,138,87,0.1); }
        .node-current .node-dot { border-color: var(--amber); color: var(--amber); background: rgba(212,162,76,0.1); }
        .node-label { font-size: 10.5px; color: var(--white-blue-dim); text-align: center; font-family: 'JetBrains Mono', monospace; }
        .node-active .node-label, .node-current .node-label { color: var(--white-blue); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .status-text { text-align: center; font-size: 13.5px; color: var(--white-blue-dim); margin-top: -6px; margin-bottom: 22px; font-family: 'JetBrains Mono', monospace; }

        .done-check {
          width: 56px; height: 56px; border-radius: 50%; background: rgba(30,138,87,0.14);
          border: 1.5px solid var(--green-bright); color: var(--green-bright);
          display: flex; align-items: center; justify-content: center; margin: 4px auto 18px;
        }
        .done-title { text-align: center; font-size: 19px; font-weight: 700; color: var(--white-blue); margin-bottom: 4px; }
        .done-sub { text-align: center; font-size: 13.5px; color: var(--white-blue-dim); margin-bottom: 22px; }

        .back-link {
          background: none; border: none; color: var(--white-blue-dim); font-size: 13px;
          font-family: inherit; cursor: pointer; display: flex; align-items: center; gap: 4px;
          margin-bottom: 16px; padding: 0;
        }
        .back-link:hover { color: var(--white-blue); }

        .footer-note {
          text-align: center; font-size: 11.5px; color: var(--white-blue-dim);
          margin-top: 22px; line-height: 1.6; opacity: 0.7;
        }
      `}</style>

      <div className="Arcatraz-shell">
        <div className="brand-row">
          <div className="brand-mark">
            <div className="brand-glyph"><Zap size={14} color="#0B0F1A" strokeWidth={2.5} /></div>
            Arcatraz
          </div>
          <div className="live-chip">
            <span className="live-dot" />
            1 USDC = ₦{rate.toFixed(2)}
          </div>
        </div>

        {step === 'type' && (
          <>
            <h1 className="headline">Send value home.</h1>
            <p className="subline">USDC in, useful money out — bills paid, family funded, vendors settled. No gas fees, no wallet jargon.</p>
            <div className="type-grid">
              {RECIPIENT_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} className="type-option" onClick={() => { setRecipientType(t.id); setStep('details'); }}>
                    <div className="type-icon"><Icon size={18} /></div>
                    <div>
                      <div className="type-text-label">{t.label}</div>
                      <div className="type-text-sub">{t.sublabel}</div>
                    </div>
                    <ChevronRight size={18} className="type-chevron" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <button className="back-link" onClick={() => setStep('type')}>← Back</button>
            <h1 className="headline">
              {recipientType === 'bill' ? 'Pay a bill' : recipientType === 'person' ? 'Send to someone' : 'Pay a merchant'}
            </h1>
            <p className="subline">
              {recipientType === 'bill' ? 'Pick the biller and enter the account or meter number.' :
               recipientType === 'person' ? 'Enter their name and Nigerian bank or mobile number.' :
               'Enter the merchant name to settle instantly.'}
            </p>
            <div className="card">
              {recipientType === 'bill' && (
                <div className="field-group">
                  <label className="field-label">Biller</label>
                  <select className="bfield" value={biller} onChange={e => setBiller(e.target.value)}>
                    {BILLERS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
              {recipientType === 'person' && (
                <div className="field-group">
                  <label className="field-label">Recipient name</label>
                  <input className="bfield" placeholder="e.g. Chidinma Okafor" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                </div>
              )}
              {recipientType === 'merchant' && (
                <div className="field-group">
                  <label className="field-label">Merchant name</label>
                  <input className="bfield" placeholder="e.g. Balogun Market Textiles" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                </div>
              )}
              {(recipientType === 'bill' || recipientType === 'person') && (
                <div className="field-group">
                  <label className="field-label">{recipientType === 'bill' ? 'Account / meter number' : 'Bank account or mobile number'}</label>
                  <input className="bfield" placeholder={recipientType === 'bill' ? 'e.g. 04521187733' : 'e.g. 0803 XXX XXXX'} value={accountRef} onChange={e => setAccountRef(e.target.value)} />
                </div>
              )}

              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Amount to send</label>
                <div className="amount-row">
                  <input type="number" min="1" value={usdcAmount} onChange={e => setUsdcAmount(e.target.value)} />
                  <span className="amount-unit">USDC</span>
                </div>
                <div className="quote-line">
                  <span>Recipient gets</span>
                  <span className="quote-value">₦{ngnAmount}</span>
                </div>
              </div>
            </div>

            <button className="btn-primary" disabled={!canProceedDetails || !usdcAmount || parseFloat(usdcAmount) <= 0} onClick={goReview}>
              Review <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === 'review' && (
          <>
            <button className="back-link" onClick={() => setStep('details')}>← Back</button>
            <h1 className="headline">Confirm payment</h1>
            <p className="subline">Rate locks the moment you confirm. Gas is on us.</p>
            <div className="card">
              <div className="review-row">
                <span className="review-key">Sending</span>
                <span className="review-val">{usdcAmount} USDC</span>
              </div>
              <div className="review-row">
                <span className="review-key">Rate</span>
                <span className="review-val">₦{rate.toFixed(2)} / USDC</span>
              </div>
              <div className="review-row">
                <span className="review-key">Recipient gets</span>
                <span className="review-val">₦{ngnAmount}</span>
              </div>
              <div className="review-row">
                <span className="review-key">{recipientType === 'bill' ? 'Biller' : recipientType === 'person' ? 'To' : 'Merchant'}</span>
                <span className="review-val">{recipientType === 'bill' ? biller : recipientName}</span>
              </div>
              {(recipientType === 'bill' || recipientType === 'person') && (
                <div className="review-row">
                  <span className="review-key">Reference</span>
                  <span className="review-val">{accountRef}</span>
                </div>
              )}
              <div className="review-row">
                <span className="review-key">Network fee</span>
                <span className="review-val" style={{ color: '#1E8A57' }}>₦0 (sponsored)</span>
              </div>
              <div className="fee-badge"><ShieldCheck size={12} /> Gas-sponsored · settled via CCTP on Arc</div>
            </div>
            <button className="btn-primary" onClick={confirmPay}>
              <Wallet size={16} /> Confirm & send
            </button>
          </>
        )}

        {step === 'processing' && (
          <>
            <h1 className="headline">Moving your money</h1>
            <p className="subline">Sit tight — this takes a few seconds.</p>
            <div className="card">
              <CorridorVisual stage={corridorStage} />
              <div className="status-text">
                {corridorStage === 1 && 'Locking rate and confirming USDC…'}
                {corridorStage === 2 && 'Bridging via CCTP on Arc…'}
                {corridorStage === 3 && 'Settling to recipient in NGN…'}
              </div>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="done-check"><Check size={26} strokeWidth={2.5} /></div>
            <div className="done-title">₦{ngnAmount} delivered</div>
            <div className="done-sub">
              {recipientType === 'bill' ? `${biller} · ${accountRef}` : recipientType === 'person' ? `To ${recipientName}` : `To ${recipientName}`}
            </div>
            <div className="card">
              <CorridorVisual stage={4} />
              <div className="review-row" style={{ marginTop: -8 }}>
                <span className="review-key">Sent</span>
                <span className="review-val">{usdcAmount} USDC</span>
              </div>
              <div className="review-row">
                <span className="review-key">Settlement</span>
                <span className="review-val">Arc · CCTP</span>
              </div>
              <div className="review-row">
                <span className="review-key">Fee</span>
                <span className="review-val" style={{ color: '#1E8A57' }}>₦0</span>
              </div>
            </div>
            <button className="btn-primary" onClick={reset}>Send another</button>
          </>
        )}

        <p className="footer-note">
          <Radio size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
          Prototype demo · rates and settlement are simulated
        </p>
      </div>
    </div>
  );
}