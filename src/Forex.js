var Forex = {
	Timeframes : {
		  M1:	60*1000
		, M5:	5*60*1000
		, M15:	15*60*1000
		, M30:	30*60*1000
		, H1:	60*60*1000
		, H3:	3*60*60*1000		//Oanda Speciality
		, H4:	4*60*60*1000
		, D1:	24*60*60*1000
		, W1:	7*24*60*60*1000
	}
	, getTimeframeName : function(ms){ 
		for(var name in this.Timeframes){if(this.Timeframes.hasOwnProperty(name)){
			if(this.Timeframes[name]===ms){ return name; }
		}}
        throw new Error("getTimeframeName found no name for ms: "+ms);
	}
	, getPipfactor : function(pair){
		var yen=pair.indexOf("JPY")>-1, gold=pair.indexOf("XAU")>-1;
		if(!gold && yen){ return 100; }
		if(gold && !yen){ return 100; } //???
		return 10000;
	}
	, Spreads : { //typical spreads, very conservative
		  GBPJPY: 5
		, EURJPY: 3
		, UDSJPY: 2
		, EURUSD: 2
		, GBPUSD: 3
		, XAUUSD: 50
		, EURGBP: 4
	}
};
