const TonWeb = require('tonweb');
const { HttpProvider } = TonWeb.providers.http;
const { Mnemonic, mnemonicToKeyPair } = require('tonweb-mnemonic');

const provider = new HttpProvider(process.env.TON_NETWORK === 'mainnet' ? 
  'https://toncenter.com/api/v2/jsonRPC' : 
  'https://testnet.toncenter.com/api/v2/jsonRPC', 
  { apiKey: process.env.TONCENTER_API_KEY }
);

const tonweb = new TonWeb(provider);

// Initialize owner wallet
let ownerWallet = null;
if (process.env.OWNER_WALLET) {
  ownerWallet = new tonweb.Address(process.env.OWNER_WALLET);
}

// Initialize bot wallet
let botWallet = null;
let botWalletKeyPair = null;

async function initBotWallet() {
  // در نسخه واقعی باید عبارت یادگاری را از .env بخوانید
  // برای تست از یک عبارت ثابت استفاده می‌کنیم
  const mnemonic = process.env.BOT_WALLET_MNEMONIC ? 
    process.env.BOT_WALLET_MNEMONIC.split(' ') : 
    ['word1', 'word2', 'word3', 'word4', 'word5', 'word6', 'word7', 'word8', 'word9', 'word10', 'word11', 'word12', 'word13', 'word14', 'word15', 'word16', 'word17', 'word18', 'word19', 'word20', 'word21', 'word22', 'word23', 'word24'];
  
  botWalletKeyPair = await mnemonicToKeyPair(mnemonic);
  botWallet = tonweb.wallet.create({ publicKey: botWalletKeyPair.publicKey });
  return botWallet;
}

async function sendTON(toAddress, amount, fromWallet = botWallet) {
  const to = new tonweb.Address(toAddress);
  
  const seqno = await fromWallet.methods.seqno().call();
  const transfer = fromWallet.methods.transfer({
    secretKey: botWalletKeyPair.secretKey,
    toAddress: to,
    amount: tonweb.utils.toNano(amount),
    seqno: seqno,
    payload: null,
    sendMode: 3
  });
  
  return await transfer.send();
}

async function getBalance(address) {
  const balance = await tonweb.getBalance(address);
  return tonweb.utils.fromNano(balance);
}

module.exports = {
  tonweb,
  sendTON,
  getBalance,
  ownerWallet,
  initBotWallet
};
