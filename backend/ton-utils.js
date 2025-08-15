import dotenv from 'dotenv';
dotenv.config();

import TonWeb from 'tonweb';
import { Address } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';

const { HttpProvider } = TonWeb.providers.http;

// Initialize provider based on network
const provider = new HttpProvider(
  process.env.TON_NETWORK === 'mainnet' ? 
    'https://toncenter.com/api/v2/jsonRPC' : 
    'https://testnet.toncenter.com/api/v2/jsonRPC',
  { apiKey: process.env.TONCENTER_API_KEY }
);

const tonweb = new TonWeb(provider);

// Initialize owner wallet
let ownerWallet = null;
if (process.env.OWNER_WALLET) {
  ownerWallet = new TonWeb.Address(process.env.OWNER_WALLET);
}

// Initialize bot wallet
let botWallet = null;
let botWalletKeyPair = null;

async function initBotWallet() {
  try {
    const mnemonic = process.env.BOT_WALLET_MNEMONIC?.split(' ') || [
      'word1', 'word2', 'word3', 'word4', 'word5', 'word6', 
      'word7', 'word8', 'word9', 'word10', 'word11', 'word12',
      'word13', 'word14', 'word15', 'word16', 'word17', 'word18',
      'word19', 'word20', 'word21', 'word22', 'word23', 'word24'
    ];
    
    botWalletKeyPair = await mnemonicToPrivateKey(mnemonic);
    
    const WalletClass = tonweb.wallet.all['v4R2'];
    botWallet = new WalletClass(provider, {
      publicKey: botWalletKeyPair.publicKey
    });
    
    const walletAddress = await botWallet.getAddress();
    console.log('🔑 Bot Wallet Address:', walletAddress.toString(true, true, true));
    
    return botWallet;
  } catch (err) {
    console.error('❌ Bot wallet initialization failed:', err);
    throw err;
  }
}

async function sendTON(toAddress, amount) {
  try {
    const to = new TonWeb.Address(toAddress);
    const walletAddress = await botWallet.getAddress();
    
    // Get seqno
    const seqno = await botWallet.methods.seqno().call();
    
    // Create transfer
    const transfer = botWallet.methods.transfer({
      secretKey: botWalletKeyPair.secretKey,
      toAddress: to,
      amount: TonWeb.utils.toNano(amount.toString()),
      seqno: seqno || 0,
      payload: null,
      sendMode: 3,
    });
    
    // Send transaction
    const result = await transfer.send();
    console.log(`💸 Sent ${amount} TON to ${toAddress}`);
    return result;
  } catch (err) {
    console.error('❌ Send TON failed:', err);
    throw err;
  }
}

async function getBalance(address) {
  try {
    const balance = await tonweb.getBalance(new TonWeb.Address(address));
    return TonWeb.utils.fromNano(balance);
  } catch (err) {
    console.error('❌ Get balance failed:', err);
    throw err;
  }
}

// Convert between TonWeb.Address and @ton/core Address
function toCoreAddress(tonwebAddress) {
  return Address.parse(tonwebAddress.toString(true, true, true));
}

function toTonwebAddress(coreAddress) {
  return new TonWeb.Address(coreAddress.toString());
}

export default {
  tonweb,
  sendTON,
  getBalance,
  ownerWallet,
  initBotWallet,
  toCoreAddress,
  toTonwebAddress
};
