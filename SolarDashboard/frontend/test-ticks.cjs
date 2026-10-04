function calcDomains(maxW, minW) {
      const roughStepL = (maxW - minW) / 5;
      const mag = Math.pow(10, Math.floor(Math.log10(roughStepL || 1)));
      let stepL = Math.ceil(roughStepL / mag) * mag;
      
      if (stepL === 3 * mag || stepL === 4 * mag) stepL = 5 * mag;
      else if (stepL === 6 * mag || stepL === 7 * mag || stepL === 8 * mag || stepL === 9 * mag) stepL = 10 * mag;

      let L_max = Math.ceil(maxW / stepL) * stepL;
      let L_min = Math.floor(minW / stepL) * stepL;
      
      const posTicks = Math.round(L_max / stepL);
      const negTicks = Math.round(Math.abs(L_min) / stepL);
      
      const stepR = 90 / posTicks;
      const R_max = 90;
      const R_min = -stepR * negTicks;

      const leftTicks = [];
      for(let i = -negTicks; i <= posTicks; i++) leftTicks.push(i * stepL);
      
      const rightTicks = [];
      for(let i = -negTicks; i <= posTicks; i++) rightTicks.push(i * stepR);
      
      console.log({ maxW, minW, leftTicks, rightTicks });
}
calcDomains(14, -7);
calcDomains(400, -25);
calcDomains(0.1, 0);
