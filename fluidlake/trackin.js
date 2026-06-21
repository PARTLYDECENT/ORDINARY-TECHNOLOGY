;(function(){
    const tubingOptions = [
        { id: 'mild-steel-25', name: 'Mild Steel 25mm', outer: 25, pricePerMeter: 2.20 },
        { id: 'mild-steel-32', name: 'Mild Steel 32mm', outer: 32, pricePerMeter: 2.80 },
        { id: 'aluminium-32', name: 'Aluminum 32mm', outer: 32, pricePerMeter: 4.50 },
        { id: 'chromoly-25', name: 'Chromoly 25mm', outer: 25, pricePerMeter: 5.00 }
    ];

    function estimateTubeLength(state){
        if(!state) return 0;
        const wheelbase = Number(state.wheelbase) || 0; // meters
        const track = Number(state.trackWidth) || 0; // meters
        const cab = Number(state.cabHeight) || 0; // meters

        // Baseline: perimeter rails
        let length = 2 * (wheelbase + track);

        // Crossmembers (4 typical)
        length += 4 * track;

        // Roll-cage verticals (4) and roof rails (2)
        length += 4 * cab;
        length += 2 * wheelbase;

        // Door bars / side members
        if (state.doorBars === 'open') length += 2 * (cab + 0.6);
        else if (state.doorBars === 'single') length += 1.5 * (cab + 0.6);
        else if (state.doorBars === 'xbar') length += 2.5 * (cab + 0.6);

        // Front bar options
        if (state.frontBar === 'bull') length += 1.2 * track;
        else if (state.frontBar === 'winch') length += 1.4 * track;

        // Roof accessories
        if (state.roofAcc === 'rack') length += 1.8 * wheelbase;
        else if (state.roofAcc === 'lights') length += 0.6 * wheelbase;

        // Suspension support small tubes (approx)
        length += (Number(state.springCoils) || 0) * 0.02;

        // Extra safety margin (weld overlap, cuts)
        length *= 1.08;

        return Math.max(0, length);
    }

    function estimateCost(lengthMeters, option){
        return lengthMeters * option.pricePerMeter;
    }

    function findCheapestOption(){
        return tubingOptions.slice().sort((a,b)=>a.pricePerMeter - b.pricePerMeter)[0];
    }

    function fmtMeters(m){ return m.toFixed(2) + ' m'; }
    function fmtCurrency(n){ return '$' + n.toFixed(2); }

    function updateCostDisplay(){
        const panel = document.getElementById('cost-panel');
        if(!panel) return;
        if(typeof window.state === 'undefined' || window.state === null){
            panel.innerText = 'No design state available';
            return;
        }

        const len = estimateTubeLength(window.state);
        const cheapest = findCheapestOption();
        const cost = estimateCost(len, cheapest);

        panel.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Tube Cost Estimator</div>' +
            '<div>Estimated tube length: <strong>' + fmtMeters(len) + '</strong></div>' +
            '<div>Cheapest option: <strong>' + cheapest.name + '</strong> @ ' + fmtCurrency(cheapest.pricePerMeter) + '/m</div>' +
            '<div style="margin-top:6px">Estimated material cost: <strong>' + fmtCurrency(cost) + '</strong></div>' +
            '<div style="font-size:12px;margin-top:6px;color:rgba(255,255,255,0.6)">Updates when vehicle rebuilds and every 1s.</div>';
    }

    function start(){
        // Monkey-patch buildExocetTruck to update costs after rebuild
        try {
            if(window.buildExocetTruck && !window.__trackin_patched){
                const orig = window.buildExocetTruck;
                window.buildExocetTruck = function(){
                    const result = orig.apply(this, arguments);
                    try{ updateCostDisplay(); }catch(e){}
                    return result;
                };
                window.__trackin_patched = true;
            }
        } catch(e) {
            console.warn('trackin: could not patch buildExocetTruck', e);
        }

        // Poll for state changes as a fallback
        let last = JSON.stringify(window.state || {});
        setInterval(()=>{
            const curr = JSON.stringify(window.state || {});
            if(curr !== last){ last = curr; updateCostDisplay(); }
        }, 1000);

        // Initial render
        setTimeout(updateCostDisplay, 200);
    }

    if(typeof window !== 'undefined'){
        window.trackin = { start };
        if(document.readyState === 'complete' || document.readyState === 'interactive') start();
        else window.addEventListener('DOMContentLoaded', start);
    }

})();
