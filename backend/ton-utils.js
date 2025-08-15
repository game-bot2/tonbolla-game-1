require('dotenv').config();
const TonWeb = require('tonweb');
const { HttpProvider } = TonWeb.providers.http;
const { mnemonicToKeyPair } = require('tonweb-mnemonic');

const provider = new HttpProvider(
  process.env.TON_NETWORK === 'mainnet' ? 
    'https://toncenter.com/api/v2/jsonRPC' : 
    'https://testnet.toncenter.com/api/v2/jsonRPC',
  { apiKey: process.env.TONCENTER_API_KEY }
);

const tonweb = new TonWeb(provider);

// Initialize wallets
let ownerWallet = process.env.OWNER_WALLET ? 
  new TonWeb.Address(process.env.OWNER_WALLET) : null;

let botWallet = null;
let botWalletKeyPair = null;

async function initBotWallet() {
  try {
    const mnemonic = process.env.BOT_WALLET_MNEMONIC?.split(' ') || [
      'test', 'word1', 'word2', 'word3', 'word4', 'word5',
      'word6', 'word7', 'word8', 'word9', 'word10', 'word11',
      'word12', 'word13', 'word14', 'word15', 'word16', 'word17',
      'word18', 'word19', 'word20', 'word21', 'word22', 'word23'
    ];

    botWalletKeyPair = await mnemonicToKeyPair(mnemonic);
    const WalletClass = tonweb.wallet.all['v4R2'];
    botWallet = new WalletClass(provider, {
      publicKey: botWalletKeyPair.publicKey
    });

    const walletAddress = await botWallet.getAddress();
    console.log('✅ Bot Wallet Initialized:', walletAddress.toString(true, true, true));
    
    return botWallet;
  } catch (err) {
    console.error('❌ Failed to initialize bot wallet:', err);
    throw err;
  }
}

async function sendTON(toAddress, amount) {
  try {
    const to = new TonWeb.Address(toAddress);
    const seqno = await botWallet.methods.seqno().call();
    
    const transfer = botWallet.methods.transfer({
      secretKey: botWalletKeyPair.secretKey,
      toAddress: to,
      amount: TonWeb.utils.toNano(amount.toString()),
      seqno: seqno || 0,
      payload: null,
      sendMode: 3
    });

    const result = await transfer.send();
    console.log(`✅ Sent ${amount} TON to ${toAddress}`);
    return result;
  } catch (err) {
    console.error('❌ Failed to send TON:', err);
    throw err;
  }
}

async function getBalance(address) {
  try {
    const balance = await tonweb.getBalance(new TonWeb.Address(address));
    return TonWeb.utils.fromNano(balance);
  } catch (err) {
    console.error('❌ Failed to get balance:', err);
    throw err;
  }
}

module.exports = {
  tonweb,
  sendTON,
  getBalance,
  ownerWallet,
  initBotWallet,
  toCoreAddress: (addr) => new TonWeb.Address(addr),
  toTonwebAddress: (addr) => addr.toString(true, true, true)
};
