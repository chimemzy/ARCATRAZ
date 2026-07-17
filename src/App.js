import DigitInput from './components/DigitInput';
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { ArrowRight, Zap, ShieldCheck, Radio, ChevronRight, Check, Loader2, Wallet, Receipt, Users, Store, AlertCircle } from 'lucide-react';

const RECIPIENT_TYPES = [
  { id: 'bill', label: 'Pay a bill', sublabel: 'Electricity, water, internet', icon: Receipt },
  { id: 'person', label: 'Send to someone', sublabel: 'Family, friends', icon: Users },
  { id: 'merchant', label: 'Pay a merchant', sublabel: 'Market, shop, service', icon: Store },
];

const BILL_CATEGORIES = [
  { id: 'electricity', label: 'Electricity', sublabel: 'Prepaid & postpaid meters' },
  { id: 'water', label: 'Water', sublabel: 'State water corporations' },
  { id: 'airtime', label: 'Airtime & Data', sublabel: 'Recharge any network' },
  { id: 'tv', label: 'Cable TV', sublabel: 'DSTV, GOtv, Startimes' },
];

const BILLERS_BY_CATEGORY = {
  electricity: [
    'Ikeja Electric (IKEDC)',
    'Eko Electricity Distribution Company (EKEDC)',
    'Abuja Electricity Distribution Company (AEDC)',
    'Ibadan Electricity Distribution Company (IBEDC)',
    'Kano Electricity Distribution Company (KEDCO)',
    'Port Harcourt Electricity Distribution Company (PHED)',
    'Enugu Electricity Distribution Company (EEDC)',
    'Kaduna Electric (KAEDCO)',
    'Jos Electricity Distribution Company (JED)',
    'Benin Electricity Distribution Company (BEDC)',
    'Yola Electricity Distribution Company (YEDC)',
  ],
  water: [
    'Lagos Water Corporation',
    'FCT Water Board (Abuja)',
    'Rivers State Water Board',
    'Ogun State Water Corporation',
    'Kano State Water Board',
  ],
  airtime: [
    'MTN Nigeria',
    'Airtel Nigeria',
    'Globacom (Glo)',
    '9mobile',
  ],
  tv: [
    'DSTV',
    'GOtv',
    'Startimes',
  ],
};

const BILLER_FIELD_LABEL = {
  electricity: 'Meter number',
  water: 'Account / customer number',
  airtime: 'Phone number',
  tv: 'Smartcard / IUC number',
};

const BILLER_FIELD_PLACEHOLDER = {
  electricity: 'e.g. 04521187733',
  water: 'e.g. LWC-2291045',
  airtime: 'e.g. 0803 XXX XXXX',
  tv: 'e.g. 7031234567',
};

// ---- Arc Testnet + contract config ----
const ARC_CHAIN_ID_HEX = '0x4cef52'; // 5042002
const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
const ARC_EXPLORER = 'https://testnet.arcscan.app';
const CONTRACT_ADDRESS = '0x0F17FD51Ddf2aEC6639Bf6B919673F5eea36236D'; // <-- your deployed PayoutReceiver

const CONTRACT_ABI = [
  'function sendPayment(string recipientRef, string countryCode) external payable',
];

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

function useWallet() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [error, setError] = useState(null);

  const checkNetwork = async () => {
    if (!window.ethereum) return;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    setWrongNetwork(chainId.toLowerCase() !== ARC_CHAIN_ID_HEX);
  };

  const switchToArc = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_CHAIN_ID_HEX }],
      });
    } catch (switchError) {
      // chain not added yet
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: ARC_CHAIN_ID_HEX,
            chainName: 'Arc Testnet',
            rpcUrls: [ARC_RPC_URL],
            nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
            blockExplorerUrls: [ARC_EXPLORER],
          }],
        });
      } else {
        throw switchError;
      }
    }
    await checkNetwork();
  };

  const connect = async () => {
    setError(null);
    if (!window.ethereum) {
      setError('No wallet found. Please install MetaMask.');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accounts[0]);
      await checkNetwork();
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        checkNetwork();
      }
    });
    const handleAccountsChanged = (accounts) => setAddress(accounts[0] || null);
    const handleChainChanged = () => checkNetwork();
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return { address, connecting, wrongNetwork, error, connect, switchToArc };
}

function CorridorVisual({ stage }) {
  const steps = [
    { key: 'source', label: 'USDC · Sender' },
    { key: 'bridge', label: 'Arc Contract' },
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
  const [step, setStep] = useState('type');
  const [recipientType, setRecipientType] = useState(null);
  const [billCategory, setBillCategory] = useState(null);
  const [biller, setBiller] = useState('');
  const [accountRef, setAccountRef] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('0.01'); // small default — real testnet funds
  const [corridorStage, setCorridorStage] = useState(0);
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const rate = useLiveRate();
  const wallet = useWallet();
  const timeoutsRef = useRef([]);

  const ngnAmount = (parseFloat(usdcAmount || 0) * rate).toLocaleString('en-NG', { maximumFractionDigits: 0 });

  const goReview = () => setStep('review');

  const confirmPay = async () => {
    setTxError(null);
    setStep('processing');
    setCorridorStage(1);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const recipientRef = recipientType === 'bill' ? accountRef : recipientType === 'person' ? accountRef : recipientName;
      const valueWei = ethers.parseEther(usdcAmount); // Arc native USDC uses 18 decimals, like ETH

      setCorridorStage(2);
      const tx = await contract.sendPayment(recipientRef, 'NG', { value: valueWei });
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setCorridorStage(3);
        setTimeout(() => {
          setCorridorStage(4);
          setStep('done');
        }, 900);
      } else {
        throw new Error('Transaction failed onchain');
      }
    } catch (err) {
      setTxError(err.reason || err.message || 'Transaction failed');
      setStep('review');
      setCorridorStage(0);
    }
  };

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  const reset = () => {
    setStep('type');
    setRecipientType(null);
    setBillCategory(null);
    setBiller('');
    setAccountRef('');
    setRecipientName('');
    setUsdcAmount('0.01');
    setCorridorStage(0);
    setTxHash(null);
    setTxError(null);
  };

  const canProceedDetails =
    recipientType === 'bill' ? !!billCategory && !!biller && accountRef.trim().length > 3 :
    recipientType === 'person' ? recipientName.trim().length > 1 && accountRef.trim().length > 3 :
    recipientType === 'merchant' ? recipientName.trim().length > 1 : false;

  const canPay = wallet.address && !wallet.wrongNetwork;

  return (
    <div className="bridge-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .bridge-root {
          --ink: #0B0F1A; --ink-2: #131B2E; --sand: #E8DFC9; --sand-dim: #C9BFA3;
          --green: #14663F; --green-bright: #1E8A57; --amber: #D4A24C;
          --white-blue: #EAF0F5; --white-blue-dim: #9AA7BD; --red: #E5484D;
          font-family: 'Space Grotesk', sans-serif; background: var(--ink); color: var(--white-blue);
          min-height: 100vh; padding: 32px 20px 60px; display: flex; justify-content: center;
        }
        .bridge-root * { box-sizing: border-box; }
        .bridge-shell { width: 100%; max-width: 460px; }
        .brand-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 10px; flex-wrap: wrap; }
        .brand-mark { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 17px; letter-spacing: -0.01em; color: var(--white-blue); }
        .brand-glyph { width: 26px; height: 26px; border-radius: 7px; background: linear-gradient(135deg, var(--green-bright), var(--green)); display: flex; align-items: center; justify-content: center; }
        .live-chip { display: flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--white-blue-dim); background: rgba(255,255,255,0.04); padding: 5px 10px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.06); }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green-bright); animation: livepulse 2s infinite; }
        @keyframes livepulse { 0% { box-shadow: 0 0 0 0 rgba(30,138,87,0.5); } 70% { box-shadow: 0 0 0 5px rgba(30,138,87,0); } 100% { box-shadow: 0 0 0 0 rgba(30,138,87,0); } }
        .wallet-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--ink-2); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 14px; margin-bottom: 20px; }
        .wallet-status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--white-blue-dim); font-family: 'JetBrains Mono', monospace; }
        .wallet-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--white-blue-dim); }
        .wallet-dot.on { background: var(--green-bright); }
        .wallet-dot.warn { background: var(--amber); }
        .btn-small { background: var(--green-bright); color: #06150E; border: none; border-radius: 8px; padding: 8px 14px; font-size: 12.5px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; cursor: pointer; }
        .btn-small:hover { background: #26a066; }
        .btn-small.warn { background: var(--amber); }
        .btn-small:disabled { opacity: 0.5; cursor: not-allowed; }
        .headline { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 6px; }
        .subline { color: var(--white-blue-dim); font-size: 14px; margin: 0 0 26px; line-height: 1.5; }
        .card { background: var(--ink-2); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; }
        .type-grid { display: flex; flex-direction: column; gap: 10px; }
        .type-option { display: flex; align-items: center; gap: 14px; background: var(--ink-2); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; text-align: left; width: 100%; color: inherit; font-family: inherit; }
        .type-option:hover { border-color: rgba(30,138,87,0.5); background: rgba(30,138,87,0.06); }
        .type-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; background: rgba(212,162,76,0.12); color: var(--amber); display: flex; align-items: center; justify-content: center; }
        .type-text-label { font-weight: 600; font-size: 15px; color: var(--white-blue); }
        .type-text-sub { font-size: 12.5px; color: var(--white-blue-dim); margin-top: 1px; }
        .type-chevron { margin-left: auto; color: var(--white-blue-dim); flex-shrink: 0; }
        .field-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--white-blue-dim); margin-bottom: 8px; display: block; }
        .field-group { margin-bottom: 18px; }
        select.bfield, input.bfield { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 13px 14px; color: var(--white-blue); font-size: 15px; font-family: 'Space Grotesk', sans-serif; outline: none; transition: border-color 0.15s ease; }
        select.bfield:focus, input.bfield:focus { border-color: var(--green-bright); }
        input.bfield::placeholder { color: rgba(154,167,189,0.5); }
        .amount-row { display: flex; align-items: baseline; gap: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 14px; }
        .amount-row input { background: none; border: none; outline: none; color: var(--white-blue); font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 500; width: 100%; padding: 0; }
        .amount-unit { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--white-blue-dim); flex-shrink: 0; }
        .quote-line { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--white-blue-dim); }
        .quote-value { color: var(--amber); font-weight: 600; }
        .btn-primary { width: 100%; background: var(--green-bright); color: #06150E; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s ease, opacity 0.15s ease; margin-top: 6px; }
        .btn-primary:hover:not(:disabled) { background: #26a066; }
        .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
        .review-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
        .review-row:last-of-type { border-bottom: none; }
        .review-key { color: var(--white-blue-dim); }
        .review-val { color: var(--white-blue); font-weight: 500; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 13.5px; }
        .fee-badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(30,138,87,0.14); color: var(--green-bright); font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 100px; margin-top: 14px; }
        .error-box { display: flex; align-items: flex-start; gap: 8px; background: rgba(229,72,77,0.1); border: 1px solid rgba(229,72,77,0.3); color: var(--red); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; line-height: 1.4; }
        .corridor { margin: 30px 0 26px; }
        .corridor-track { position: relative; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-bottom: 14px; overflow: visible; }
        .corridor-fill { height: 100%; background: linear-gradient(90deg, var(--green-bright), var(--amber)); border-radius: 2px; transition: width 1.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .corridor-pulse { position: absolute; top: 50%; width: 12px; height: 12px; margin-left: -6px; background: var(--amber); border-radius: 50%; transform: translateY(-50%); box-shadow: 0 0 12px 3px rgba(212,162,76,0.6); transition: left 1.3s ease, opacity 0.3s ease; }
        .corridor-nodes { display: flex; justify-content: space-between; }
        .corridor-node { display: flex; flex-direction: column; align-items: center; gap: 7px; width: 33%; }
        .node-dot { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; color: var(--white-blue-dim); transition: all 0.3s ease; }
        .node-active .node-dot { border-color: var(--green-bright); color: var(--green-bright); background: rgba(30,138,87,0.1); }
        .node-current .node-dot { border-color: var(--amber); color: var(--amber); background: rgba(212,162,76,0.1); }
        .node-label { font-size: 10.5px; color: var(--white-blue-dim); text-align: center; font-family: 'JetBrains Mono', monospace; }
        .node-active .node-label, .node-current .node-label { color: var(--white-blue); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .status-text { text-align: center; font-size: 13.5px; color: var(--white-blue-dim); margin-top: -6px; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
        .tx-link { display: block; text-align: center; font-size: 12px; color: var(--amber); font-family: 'JetBrains Mono', monospace; margin-bottom: 14px; text-decoration: none; word-break: break-all; }
        .tx-link:hover { text-decoration: underline; }
        .done-check { width: 56px; height: 56px; border-radius: 50%; background: rgba(30,138,87,0.14); border: 1.5px solid var(--green-bright); color: var(--green-bright); display: flex; align-items: center; justify-content: center; margin: 4px auto 18px; }
        .done-title { text-align: center; font-size: 19px; font-weight: 700; color: var(--white-blue); margin-bottom: 4px; }
        .done-sub { text-align: center; font-size: 13.5px; color: var(--white-blue-dim); margin-bottom: 22px; }
        .back-link { background: none; border: none; color: var(--white-blue-dim); font-size: 13px; font-family: inherit; cursor: pointer; display: flex; align-items: center; gap: 4px; margin-bottom: 16px; padding: 0; }
        .back-link:hover { color: var(--white-blue); }
        .footer-note { text-align: center; font-size: 11.5px; color: var(--white-blue-dim); margin-top: 22px; line-height: 1.6; opacity: 0.7; }
      `}</style>

      <div className="bridge-shell">
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

        <div className="wallet-bar">
          <div className="wallet-status">
            <span className={`wallet-dot ${wallet.address ? (wallet.wrongNetwork ? 'warn' : 'on') : ''}`} />
            {wallet.address
              ? wallet.wrongNetwork
                ? 'Wrong network'
                : `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
              : 'Wallet not connected'}
          </div>
          {!wallet.address && (
            <button className="btn-small" onClick={wallet.connect} disabled={wallet.connecting}>
              {wallet.connecting ? 'Connecting…' : 'Connect MetaMask'}
            </button>
          )}
          {wallet.address && wallet.wrongNetwork && (
            <button className="btn-small warn" onClick={wallet.switchToArc}>Switch to Arc</button>
          )}
        </div>
        {wallet.error && (
          <div className="error-box"><AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{wallet.error}</div>
        )}

        {step === 'type' && (
          <>
            <h1 className="headline">Send value home.</h1>
            <p className="subline">Real USDC on Arc, sent onchain. No gas jargon, no wallet confusion.</p>
            <div className="type-grid">
              {RECIPIENT_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} className="type-option" onClick={() => { setRecipientType(t.id); setStep(t.id === 'bill' ? 'category' : 'details'); }}>
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

        {step === 'category' && (
          <>
            <button className="back-link" onClick={() => setStep('type')}>← Back</button>
            <h1 className="headline">What are you paying?</h1>
            <p className="subline">Pick a category to see the right billers.</p>
            <div className="type-grid">
              {BILL_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className="type-option"
                  onClick={() => {
                    setBillCategory(c.id);
                    setBiller(BILLERS_BY_CATEGORY[c.id][0]);
                    setStep('details');
                  }}
                >
                  <div className="type-icon"><Receipt size={18} /></div>
                  <div>
                    <div className="type-text-label">{c.label}</div>
                    <div className="type-text-sub">{c.sublabel}</div>
                  </div>
                  <ChevronRight size={18} className="type-chevron" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <button className="back-link" onClick={() => setStep(recipientType === 'bill' ? 'category' : 'type')}>← Back</button>
            <h1 className="headline">
              {recipientType === 'bill' ? BILL_CATEGORIES.find(c => c.id === billCategory)?.label : recipientType === 'person' ? 'Send to someone' : 'Pay a merchant'}
            </h1>
            <p className="subline">
              {recipientType === 'bill' ? 'Pick the biller and enter your account details.' :
               recipientType === 'person' ? 'Enter their name and Nigerian bank or mobile number.' :
               'Enter the merchant name to settle instantly.'}
            </p>
            <div className="card">
              {recipientType === 'bill' && (
                <div className="field-group">
                  <label className="field-label">Biller</label>
                  <select className="bfield" value={biller} onChange={e => setBiller(e.target.value)}>
                    {(BILLERS_BY_CATEGORY[billCategory] || []).map(b => <option key={b} value={b}>{b}</option>)}
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
    <label className="field-label">
      {recipientType === 'bill' ? BILLER_FIELD_LABEL[billCategory] : 'Bank account or mobile number'}
    </label>
    <DigitInput
      maxDigits={
        recipientType === 'bill'
          ? (billCategory === 'electricity' ? 11
            : billCategory === 'water' ? 10
            : billCategory === 'airtime' ? 11
            : billCategory === 'tv' ? 10
            : 11)
          : 11
      }
      value={accountRef}
      onChange={setAccountRef}
      placeholder={
        recipientType === 'bill'
          ? BILLER_FIELD_PLACEHOLDER[billCategory]
          : 'e.g. 0803 XXX XXXX'
      }
    />
  </div>
)}
              
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Amount to send (testnet USDC)</label>
                <div className="amount-row">
                  <input type="number" min="0.001" step="0.001" value={usdcAmount} onChange={e => setUsdcAmount(e.target.value)} />
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
            <p className="subline">This sends a real transaction on Arc Testnet from your connected wallet.</p>
            {txError && <div className="error-box"><AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{txError}</div>}
            <div className="card">
              <div className="review-row"><span className="review-key">Sending</span><span className="review-val">{usdcAmount} USDC</span></div>
              <div className="review-row"><span className="review-key">Rate</span><span className="review-val">₦{rate.toFixed(2)} / USDC</span></div>
              <div className="review-row"><span className="review-key">Recipient gets</span><span className="review-val">₦{ngnAmount}</span></div>
              <div className="review-row"><span className="review-key">{recipientType === 'bill' ? 'Biller' : recipientType === 'person' ? 'To' : 'Merchant'}</span><span className="review-val">{recipientType === 'bill' ? biller : recipientName}</span></div>
              {recipientType === 'bill' && (
                <div className="review-row"><span className="review-key">{BILLER_FIELD_LABEL[billCategory]}</span><span className="review-val">{accountRef}</span></div>
              )}
              {recipientType === 'person' && (
                <div className="review-row"><span className="review-key">Reference</span><span className="review-val">{accountRef}</span></div>
              )}
              <div className="review-row"><span className="review-key">Contract</span><span className="review-val">{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span></div>
              <div className="fee-badge"><ShieldCheck size={12} /> Onchain · Arc Testnet</div>
            </div>
            <button className="btn-primary" onClick={confirmPay} disabled={!canPay}>
              <Wallet size={16} /> {canPay ? 'Confirm & send' : 'Connect wallet to send'}
            </button>
          </>
        )}

        {step === 'processing' && (
          <>
            <h1 className="headline">Moving your money</h1>
            <p className="subline">Confirm the transaction in MetaMask, then sit tight.</p>
            <div className="card">
              <CorridorVisual stage={corridorStage} />
              <div className="status-text">
                {corridorStage === 1 && 'Waiting for wallet confirmation…'}
                {corridorStage === 2 && 'Transaction sent, waiting for confirmation…'}
                {corridorStage === 3 && 'Confirmed onchain. Finalizing…'}
              </div>
              {txHash && (
                <a className="tx-link" href={`${ARC_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
                  View on ArcScan: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              )}
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="done-check"><Check size={26} strokeWidth={2.5} /></div>
            <div className="done-title">₦{ngnAmount} on the way</div>
            <div className="done-sub">
              {recipientType === 'bill' ? `${biller} · ${accountRef}` : recipientType === 'person' ? `To ${recipientName}` : `To ${recipientName}`}
            </div>
            <div className="card">
              <CorridorVisual stage={4} />
              <div className="review-row" style={{ marginTop: -8 }}><span className="review-key">Sent</span><span className="review-val">{usdcAmount} USDC</span></div>
              <div className="review-row"><span className="review-key">Network</span><span className="review-val">Arc Testnet</span></div>
              {txHash && (
                <a className="tx-link" href={`${ARC_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
                  {txHash.slice(0, 14)}...{txHash.slice(-10)}
                </a>
              )}
            </div>
            <button className="btn-primary" onClick={reset}>Send another</button>
          </>
        )}

        <p className="footer-note">
          <Radio size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
          Onchain on Arc Testnet · payout to local currency is simulated for demo
        </p>
      </div>
    </div>
  );
}