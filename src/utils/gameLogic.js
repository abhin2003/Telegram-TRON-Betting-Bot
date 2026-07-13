import { TronWeb } from 'tronweb';

// Initialize a TronWeb instance specifically for the MAIN wallet so we can send payouts.
// DANGER: Doing this in the frontend exposes the private key to anyone viewing the source code.
const adminTronWeb = new TronWeb({
  fullHost: import.meta.env.VITE_TRON_RPC,
  privateKey: import.meta.env.VITE_MAIN_PRIVATE_KEY
});

export const MIN_BET_TRX = 10;
export const MAX_BET_TRX = 10000;
export const PAYOUT_MULTIPLIER = 180;
export const MAX_CONFIRM_RETRIES = 40;
export const CONFIRM_INTERVAL_MS = 3000;
export const BALANCE_SETTLE_MS = 4000;

export const toSun = (trx) => Math.floor(trx * 1_000_000);
export const toTrx = (sun) => sun / 1_000_000;

export function judge(blockNumber) {
    const lastDigit = blockNumber % 10;
    return {
        lastDigit,
        result: lastDigit % 2 === 0 ? "EVEN" : "ODD"
    };
}

export async function waitForConfirmation(txid) {
    for (let attempt = 1; attempt <= MAX_CONFIRM_RETRIES; attempt++) {
        try {
            const txInfo = await window.tronWeb.trx.getTransactionInfo(txid);
            if (txInfo && txInfo.blockNumber) {
                return txInfo;
            }
        } catch (_) {}

        if (attempt < MAX_CONFIRM_RETRIES) {
            await new Promise(r => setTimeout(r, CONFIRM_INTERVAL_MS));
        }
    }
    const timeoutSecs = (MAX_CONFIRM_RETRIES * CONFIRM_INTERVAL_MS) / 1000;
    throw new Error(`Transaction confirmation timeout after ${timeoutSecs} seconds`);
}

export async function checkBankroll(payoutSun, asset) {
    const mainAddress = import.meta.env.VITE_MAIN_ADDRESS;
    if (asset === "TRX") {
        const mainBalanceSun = await adminTronWeb.trx.getBalance(mainAddress);
        if (mainBalanceSun < payoutSun) {
            throw new Error(`Insufficient bankroll. Required: ${toTrx(payoutSun)} TRX, Available: ${toTrx(mainBalanceSun)} TRX`);
        }
    } else {
        const contract = await adminTronWeb.contract().at(import.meta.env.VITE_USDT_ADDRESS);
        const mainBalanceSun = await contract.balanceOf(mainAddress).call();
        if (BigInt(mainBalanceSun.toString()) < BigInt(payoutSun)) {
            throw new Error(`Insufficient bankroll for USDT.`);
        }
    }
}

export async function payout(betSun, playerAddress, asset) {
    const payoutSun = Math.floor((betSun * PAYOUT_MULTIPLIER) / 100);
    await checkBankroll(payoutSun, asset);
    
    let txid;
    if (asset === "TRX") {
        const tx = await adminTronWeb.transactionBuilder.sendTrx(playerAddress, payoutSun, import.meta.env.VITE_MAIN_ADDRESS);
        const signed = await adminTronWeb.trx.sign(tx);
        const receipt = await adminTronWeb.trx.sendRawTransaction(signed);
        if (!receipt || !receipt.result || !receipt.txid) {
            throw new Error("Payout TRX broadcast failed");
        }
        txid = receipt.txid;
    } else {
        const parameter = [
            { type: 'address', value: playerAddress },
            { type: 'uint256', value: payoutSun.toString() }
        ];
        const options = { feeLimit: 150_000_000, callValue: 0 };
        const tx = await adminTronWeb.transactionBuilder.triggerSmartContract(
            import.meta.env.VITE_USDT_ADDRESS,
            'transfer(address,uint256)',
            options,
            parameter,
            import.meta.env.VITE_MAIN_ADDRESS
        );
        const signed = await adminTronWeb.trx.sign(tx.transaction);
        const receipt = await adminTronWeb.trx.sendRawTransaction(signed);
        if (!receipt || !receipt.result || !receipt.txid) {
            throw new Error("Payout TRC20 broadcast failed");
        }
        txid = receipt.txid;
    }

    const txInfo = await waitForConfirmation(txid);
    if (asset === "USDT") {
        const receiptResult = txInfo?.receipt?.result;
        if (!receiptResult || receiptResult !== 'SUCCESS') {
            throw new Error("Payout TRC20 transfer failed or unconfirmed");
        }
    }
    
    await new Promise(r => setTimeout(r, BALANCE_SETTLE_MS));
    return txid;
}

export async function validateTransaction(txid, expectedSender, expectedAmountSun, asset) {
    let txDetail;
    try {
        txDetail = await window.tronWeb.trx.getTransaction(txid);
    } catch (_) {
        throw new Error("Transaction not found on chain");
    }

    if (!txDetail || !txDetail.raw_data) {
        throw new Error("Transaction not found on chain");
    }

    const contractValue = txDetail.raw_data.contract[0].parameter.value;
    const normalize = (addr) =>
        addr.startsWith("T") ? addr : window.tronWeb.address.fromHex(addr);

    const actualSender = normalize(contractValue.owner_address);

    if (actualSender !== expectedSender) {
        throw new Error(`Transaction sender mismatch.`);
    }

    const mainAddress = import.meta.env.VITE_MAIN_ADDRESS;

    if (asset === "TRX") {
        const actualRecipient = normalize(contractValue.to_address);
        const actualAmountSun = contractValue.amount;

        if (actualRecipient !== mainAddress) {
            throw new Error(`Transaction recipient mismatch.`);
        }

        if (actualAmountSun.toString() !== expectedAmountSun.toString()) {
            throw new Error(`Transaction amount mismatch.`);
        }
    } else {
        const actualContract = normalize(contractValue.contract_address);
        if (actualContract !== import.meta.env.VITE_USDT_ADDRESS) {
            throw new Error(`Transaction contract mismatch.`);
        }
        
        const data = contractValue.data;
        if (data && data.startsWith('a9059cbb')) {
            const recipientHex = '41' + data.slice(8, 72).slice(24);
            const actualRecipient = window.tronWeb.address.fromHex(recipientHex);
            if (actualRecipient !== mainAddress) {
                throw new Error(`Transaction recipient mismatch.`);
            }

            const amountHex = data.slice(-64);
            const actualAmountSun = parseInt(amountHex, 16);
            if (actualAmountSun.toString() !== expectedAmountSun.toString()) {
                throw new Error(`Transaction amount mismatch.`);
            }
        }
    }
}
