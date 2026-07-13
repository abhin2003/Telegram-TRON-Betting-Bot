<div align="center">
  <img src="./src/assets/hero.png" width="180" alt="TronFlip Mascot">
  <h1>TronFlip 🎲</h1>
  <p><strong>A decentralized, transparent, and fair betting platform built on the TRON blockchain.</strong></p>
</div>

---

## 🌟 Overview
TronFlip is a premium Web3 betting application that allows users to place wagers on the last digit of the TRON blockchain hash. Built with a sleek, modern, glassmorphism UI, it offers an engaging and instantaneous betting experience directly from your browser. 

Players can predict whether the block hash will end in an **ODD** or **EVEN** number, with automated payouts sent directly to their TronLink wallet.

## 🚀 Key Features
- **100% Provably Fair**: Bets are judged entirely on the unpredictable last digit of the TRON block hash, ensuring complete transparency.
- **Dual Asset Support**: Users can wager using either **TRX** or **USDT (TRC20)**.
- **Instant Payouts**: Automated logic processes payouts within seconds directly to the winner's wallet.
- **Live Global Feed**: See a real-time feed of all bets placed globally, powered by a live Supabase WebSocket connection.
- **Seamless Wallet Integration**: Instantly connects and authenticates with the TronLink browser extension.

## 🛠 Tech Stack
- **Frontend**: React 18, Vite
- **Styling**: Vanilla CSS Modules (Glassmorphism, Neon UI)
- **Blockchain SDK**: TronWeb (TRX/TRC20 processing)
- **Database / Backend**: Supabase (PostgreSQL, Realtime WebSockets)

## 💻 Running Locally

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) account
- The [TronLink](https://www.tronlink.org/) browser extension installed

### 1. Clone & Install
```bash
git clone https://github.com/your-username/tron-betting.git
cd tron-betting
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add the following keys:
```env
VITE_MAIN_PRIVATE_KEY=your_admin_wallet_private_key
VITE_MAIN_ADDRESS=your_admin_wallet_address
VITE_TRON_RPC=https://api.shasta.trongrid.io
VITE_USDT_ADDRESS=your_usdt_trc20_address
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup
Run the following SQL in your Supabase SQL Editor to initialize the tracking table:
```sql
create table public.bets (
  id text primary key,
  player text not null,
  prediction text not null,
  amount numeric not null,
  asset text not null,
  block bigint not null,
  result text not null,
  payout numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.bets disable row level security;
```

### 4. Start Development Server
```bash
npm run dev
```

## ⚠️ Security Notice
> **Disclaimer**: This codebase includes frontend payout logic utilizing a private key (`VITE_MAIN_PRIVATE_KEY`) for prototype and demonstration purposes. **DO NOT** deploy this specific implementation pattern to a public mainnet environment, as the private key will be exposed to the client. For production, the payout logic must be abstracted to a secure backend Node server or a native TRON Smart Contract.

## 📜 License
© 2024 TronFlip. All Rights Reserved.
