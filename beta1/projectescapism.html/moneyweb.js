// Simple MoneyWeb: balance, tokenization, and purchase helpers for Nacht purchases
(function(){
    window.moneyWeb = window.moneyWeb || {};

    moneyWeb._balance = (window.startingCredits !== undefined) ? window.startingCredits : 10000;
    moneyWeb.tokens = moneyWeb.tokens || {};

    moneyWeb.getBalance = function(){ return moneyWeb._balance; };
    moneyWeb.setBalance = function(v){ moneyWeb._balance = Math.max(0, Math.floor(v)); if (window.updateCreditsUI) updateCreditsUI(); };
    moneyWeb.add = function(v){ moneyWeb.setBalance(moneyWeb._balance + Math.floor(v)); };
    moneyWeb.canAfford = function(cost){ return (moneyWeb._balance || 0) >= (cost || 0); };

    // Synchronous spend; returns true if spent and false otherwise
    moneyWeb.spend = function(cost){
        cost = Math.max(0, Math.floor(cost || 0));
        if (!moneyWeb.canAfford(cost)) return false;
        moneyWeb._balance -= cost;
        if (window.updateCreditsUI) updateCreditsUI();
        return true;
    };

    // Tokenize a purchase to provide a simple record/receipt
    moneyWeb.createToken = function(purchaseId, amount){
        const id = purchaseId || ('tx_' + Date.now() + '_' + Math.floor(Math.random()*10000));
        const token = { id: id, amount: Math.floor(amount||0), ts: Date.now() };
        moneyWeb.tokens[id] = token;
        return token;
    };

    // Purchase helper: attempts spend then runs callback and returns token or null
    moneyWeb.purchase = function(purchaseId, amount, onSuccess){
        if (!moneyWeb.spend(amount)) return null;
        const token = moneyWeb.createToken(purchaseId, amount);
        try { if (typeof onSuccess === 'function') onSuccess(token); } catch (e) { console.error('moneyWeb purchase callback error', e); }
        return token;
    };

    // UI helper: tries to update any GUI credit elements
    function updateCreditsUI(){
        // gui.js may provide updateCreditsUI or a credits element
        if (typeof window.updateCredits === 'function') return window.updateCredits(moneyWeb._balance);
        const el = document.getElementById('nacht-credits');
        if (el) el.textContent = moneyWeb._balance;
    }

    // Expose small console helpers
    moneyWeb.debug = function(){ console.info('moneyWeb balance=', moneyWeb.getBalance(), 'tokens=', Object.keys(moneyWeb.tokens).length); };

})();
