"use strict";
//Ausgelagert da die Ausgabe (Text oder Graphic) ebenfalls hier gekapselt werden kann
Forex.Simulation.Statistic = K.Base.subclass({
	  _init: function(sim){
		var i,len,timeline,name;
		var trades = sim.getClosedFilledTrades();		
		this.balance = sim.balance;
		K.merge(this, this.getStatisticByTimeline(trades,null) );
		if(sim.timelines.length>1){
			for(i=0,len=sim.timelines.length;i<len;i++){
				timeline = sim.timelines[i];
				name = "timeline_"+timeline.currencypair+"_"+Forex.getTimeframeName(timeline.timeframe);
				this[name] = this.getStatisticByTimeline(trades,timeline);
			}
		}
		var min = min_unrealized = min_differences = 99999999999;
		var max = max_unrealized = max_differences = 0;
		var positive = negative = 0;
		var differences = [];
		var b,u,d;
		var sumvariationY = sumvariationResiduen = 0;
		var steigung = sim.balances[sim.balances.length-1][1]/sim.balances.length; //da wir bei (0,0) starten
		var mittelwert = this.alltrades.average;
		var minDiffFromLinear = 9999999999999,diffFromLinear;
		var minRelDiffFromLinear = 9999999999999,reldiffFromLinear;
		for(i=0,len=sim.unrealized.length;i<len,i++){	//setzt voraus dass unrealized.length===balances.length
			//Balances
			b = sim.balances[i][1];
			if(b>max){ max = b; }
			if(b<min){ min = b; }
			//Unrealized
			u = sim.unrealized[i][1];
			if(u>max_unrealized){ max_unrealized = u; }
			if(u<min_unrealized){ min_unrealized = u; }
			//Difference
			d = u-b;
			differences.push(d);
			if(d>max_differences){ max_differences = d; }
			if(d<min_differences){ min_differences = d; }
			if(u>b){ positive++; } 
			if(u<b){ negative++; }
			//for r2
			sumvariationY += Math.pow(b-mittelwert,2);
			sumvariationResiduen += Math.pow(b-(i*steigung),2);
			//for max_drawdown
			diffFromLinear = u-(i*steigung);
			if(diffFromLinear<minDiffFromLinear){ minDiffFromLinear = diffFromLinear; }
			if(i>0 &&steigung!==0){
				reldiffFromLinear = diffFromLinear / (i*steigung)
				if(reldiffFromLinear<minRelDiffFromLinear){ minRelDiffFromLinear = reldiffFromLinear; }
			}
		}
		K.merge(this,{
			  min: 					min
			, max:					max
			, min_unrealized:		min_unrealized
			, max_unrealized:		max_unrealized
			, max_unrealized_profit:max_differences
			, max_unrealized_loss:	min_differences
			, max_drawdown:			(0 - minDiffFromLinear)/this.balance	// Definiert als größte absolute Abweichung von der Geraden in Relation zum Endsaldo
			, max_rel_drawdown:		0 - minRelDiffFromLinear 			// Definiert als größte relative Abweichung von der Geraden
			, unrealized_positive:	positive / (positive+negative)
			, market_attendance:	(positive+negative)/sim.balances.length
			, r2:					1 - sumvariationResiduen/sumvariationY		//Bestimmtheitsmaß r^2
			, startDate:			sim.startDate
			, stopDate:				sim.stopDate
			, tradesPerMonth:		0|( this.alltrades.number*1000*60*60*24*30/(sim.stopDate.getTime()-sim.startDate.getTime()) )
			, tradesPerDay:			0|( this.alltrades.number*1000*60*60*24/(sim.stopDate.getTime()-sim.startDate.getTime()) )
		});
		
		//TODO Consecutive Losses
		
		this.rating = this.alltrades.sum * (this.t_test - 1.6) * (this.winloss_success - 0.5) * Math.pow(this.r2,2);//experimentell
		
		return this;
	}
	, getStatisticByTimeline:function(trades,timeline){
		var alltrades = [],longtrades = [],shorttrades = [],positivetrades = [],negativetrades = [];
		for(var i=0,len=trades.length;i<len;i++){
			var trade = trades[i];
			if(!!timeline && timeline!==trade.timeline){ continue; }
			alltrades.push(trade);
			if(trade.type===Forex.Trade.Type.LONG){	longtrades.push(trade); } 
				else {								shorttrades.push(trade);  }
			if(trade.saldo>0){	positivetrades.push(trade); } 
				else {			negativetrades.push(trade); }
		}
		var r = {
			  alltrades:		this.calculateTradeStatistic(alltrades)
			, longtrades:		this.calculateTradeStatistic(longtrades)
			, shorttrades:		this.calculateTradeStatistic(shorttrades)
			, positivetrades:	this.calculateTradeStatistic(positivetrades)
			, negativetrades:	this.calculateTradeStatistic(negativetrades)
		};
		r.successratio = 		r.positivetrades.number/r.alltrades.number;
		r.winlossratio =		-1*r.positivetrades.sum/r.negativetrades.sum;
		r.winloss_success =		r.winlossratio * r.successratio;
		r.average_per_stddv = 	r.alltrades.average / r.alltrades.stddv;
		r.t_test =				Math.sqrt( r.alltrades.number )*( r.alltrades.average / r.alltrades.stddv );
		return r;
	}
	, calculateTradeStatistic: function(a){
		var r ={},t,i,len,s,d;
		var sumsaldo = sumsaldochi2 = sumduration = maxsaldo = maxduration = 0;
		var minsaldo = minduration = 999999999999999;
		for(i=0,len=a.length;i<len;i++){
			t = a[i];
			s = t.saldo;
			d = t.duration;
			sumsaldo += s;
			sumduration += d;
			if(s>maxsaldo){ maxsaldo = s; }
			if(s<minsaldo){ minsaldo = s; }
			if(d>maxduration){ maxduration = s; }
			if(d<minduration){ minduration = d; }
		}
		K.merge(r,{
			  number:			a.length
			, sum:				sumsaldo
			, min:				minsaldo
			, max:				maxsaldo
			, min_duration:		minduration
			, max_duration:		maxduration
			, average:			sumsaldo / a.length
			, average_duration:	sumduration / a.length
		});
		for(i=0,len=a.length;i<len;i++){
			sumsaldochi2 += Math.pow(a[i].saldo-r.average,2);
		}
		r.stddv = Math.sqrt( sumsaldochi2 / (a.length-1) );
		return r;
	}
	, getSummary:function(){
		return ["Result: "+this.balance.toFixed(4)
			,"Trades: "+this.alltrades.number
			,"T-Test: "+this.t_test.toFixed(4)
			,"Successratio: "+this.successratio.toPercent(4)
			,"PosUnrealized: "+this.unrealized_positive.toPercent(4)
			,"R2: "+this.r2.toFixed(4)
			,"MaxDrawdown: "+this.max_rel_drawdown.toPercent(4)
			,"Rating: "+this.rating.toFixed(4)
		].join(",  ");
	}
});

/*
//TODO consecutive trades machen bei mehreren timelines keinen sinn! eigentlich müßte ich das balances array anschauen, nicht this.trades!
summary.maxconsecutivepositive = {};
var positive = trades.map(function(t,i){ 
	var r={n:0,sum:0};
	if(t.saldo>=0 && (i<trades.length-1 ? trades[i+1].saldo<0 : true )){
		r.n++;
		r.sum+=trades[i].saldo;
		var j=i-1;
		while (j>0 && trades[j].saldo>=0){
			r.n++;
			r.sum+=trades[j].saldo;
			j--;
		}
	} else {
		return r;
	}
	return r; 
},this);
summary.maxconsecutivepositive.number = Math.max.apply(null, positive.map(function(o){ return o.n; }) );
summary.maxconsecutivepositive.sum = Math.max.apply(null, positive.map(function(o){ return o.sum; }) );
	//max sum kommt nicht notwendigerweise von max consecutive trades
summary.maxconsecutivenegative = {};
var negative = trades.map(function(t,i){ 
	var r={n:0,sum:0};
	if(t.saldo<0 && (i<trades.length-1 ? trades[i+1].saldo>=0 : true )){
		r.n++;
		r.sum+=trades[i].saldo;
		var j=i-1;
		while (j>0 && trades[j].saldo<0){
			r.n++;
			r.sum+=trades[j].saldo;
			j--;
		}
	} else {
		return r;
	}
	return r; 
},this);
summary.maxconsecutivenegative.number = Math.max.apply(null, negative.map(function(o){ return o.n; }) );
summary.maxconsecutivenegative.sum = Math.min.apply(null, negative.map(function(o){ return o.sum; }) );

//Max Drawdown
//Sagt nichts über anfängliche Dips aus, wenn es von anfang an erstmal bergab geht
var maxima = [];
var max = 0;
this.balances.forEach(function(el,i){
	if(el[1]>max){ 	max = el[1]; maxima.push(i); }
});
var minima = maxima.map(function(i){
	return Math.min.apply( null, this.balances.clone().splice(i,this.balances.length-i).map(function(el){return el[1]; }) );
},this);
var drawdowns = maxima.map(function(el,i){
	var max = this.balances[el][1], min = minima[i];
	return (max-min)/max;
},this);
summary.maxdrawdown = Math.max.apply(null, drawdowns);
*/