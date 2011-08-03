"use strict";
K.require("K.Date.js");
K.require("Forex.Price.js","Forex.Timeline.js","Forex.Rule.js","Forex.Trade.js");
Forex.Simulation = K.Base.subclass({
	_init: function(o){
		K.merge(this,{
			  timelines: 		[]
			, rules: 			[]
			, trades: 			[]
			, balance:			0		//I count the Pips so I get comparable results idnependent from the moneymanagement
			, standardAmmount:	1
			, saldoPercentage:	0.05	// max risk per trade
			, events:			[]		// for logging
			, logEvents:		o.logEvents || true
			, balances:			[]
			, unrealized:		[]
			, data:				{} 		//data for trades and rules
			, statistic:		null
			, startDate:		null
			, stopDate:			null
		});
		[].concat(o.timelines).forEach(function(timeline){ this.addTimeline(timeline); },this);
		[].concat(o.rules).forEach(function(rule){ this.addRule(rule); },this);
		return this;
	}
	, getLog:function(){ 
		//get consolidated Log from all timelines
		
	}
	, getAmmount:function(desiredAmmount,price,stoploss){//returns acceptable ammount
		//return this.balance;
		return this.standardAmmount; //fixed ammoutn for testing purposes - gibt die PIPs als Ergebnis aus
	
		var maxSaldoChange = this.saldoPercentage * this.balance;
		var maxAmmount = Math.floor( maxSaldoChange / price );
		return Math.min( desiredAmmount || 0, maxAmmount );
	}
	, addTimeline:function(timeline){
		if(!Forex.PriceTimeline.prototype.isPrototypeOf(timeline)){ timeline = Forex.PriceTimeline.create(timeline); }
		this.timelines.push(timeline);
		return this; 
	}
	, getTimeline:function(pair,timeframename){ //for rules to adress specific timelines
		var a = this.timelines.filter(function(timeline){
			return timeline.currencypair == pair && !!timeframename ? Forex.getTimeframeName(timeline.timeframe) == timeframename : true;
		},this);
		if(a.length>1){ throw new Error("getTimeline got more than one matching timeline for pair "+pair+" and timeframe "+timeframename); }
		if(a.length==0){ throw new Error("getTimeline got no matching timeline for pair "+pair+" and timeframe "+timeframename); }
		return a[0];
	}
	, addTrade:function(trade){ 
		trade.parent = this;
		if(!Forex.Trade.prototype.isPrototypeOf(trade)){ trade = Forex.Trade.create(trade); }
		this.trades.push(trade);
		return this; 
	}
	, addRule:function(rule){
		rule.logEvents = this.logEvents || false;
		if(!Forex.Rule.prototype.isPrototypeOf(rule)){ rule = Forex.Rule.create(rule); }
		this.rules.push(rule);
		return this;
	}
	, getActiveTrades:function(timeline){       return this.getTradesByStatus(Forex.Trade.Status.ACTIVE,timeline); }
	, getWaitingTrades:function(timeline){      return this.getTradesByStatus(Forex.Trade.Status.WAITING,timeline); }
	, getClosedTrades:function(timeline){       return this.getTradesByStatus(Forex.Trade.Status.CLOSED,timeline); }
	, getClosedFilledTrades:function(timeline){ return this.getClosedTrades(timeline).filter(function(t){return t.was_filled;}); }
	, getOpenTrades:function(timeline){         return this.getActiveTrades(timeline).concat(this.getWaitingTrades(timeline)); }
	, getTradesByStatus:function(status,timeline){
		//Zeitkritisch musste also optimiert werden
		var r = [];
		for(var i=0,len=this.trades.length;i<len;i++){
			var t = this.trades[i];
			if(t.status===status && (!!timeline ? t.timeline===timeline : true) ){
				r.push(t);
			}
		}
		return r;
		//return this.trades.filter(function(t){ return t.status == status && (!!timeline ? t.timeline==timeline : true); }); 
	}
	, advanceCursors: function(date){
		this.timelines.forEach(function(timeline,i){ timeline.advanceCursor( date ); });//im einfachsten fall wird einfach jeder timeframe index um eins erhöht
	}
	, run: function(){
		this.timelines.forEach(function(timeline){ timeline.clearEvents(); });
		if(this.timelines.length==1){ return this.runSingleTimeline(); }
		var i,j,k,l;
		var   tickSpeed = 99999999999		//min der timeframes aller timelines
			, startDate = 0					//max der startIndices aller Timeframes
			, stopDate = 9999999999999		//min der letzten Dates aller Timeframes
			, timeline
			, date
			, len = this.timelines.length;
		for(i=0;i<len;i++){
			timeline = this.timelines[i], timeframe=timeline.getTimeframe();
			if(timeframe<tickSpeed){ tickSpeed=timeframe;}
			timeline.cursor = timeline.startIndex;
			date = timeline.data[ timeline.cursor ].date.getTime();
			if(date>startDate){ startDate=date; }
			date = timeline.data[ timeline.data.length-1 ].date.getTime();
			if(date<stopDate){ stopDate=date; }
		}
		var currentTime = startDate;
		this.startDate = new Date(startDate);
		this.stopDate = new Date(stopDate);
		this.advanceCursors( currentTime ); //Increase index for each timeframe until every date is >= max Date (until next date > max Date)
		
		// TODO: Eigentlich sollten Rules nur processed werden, wenn eine Änderung auf der eigenen Timeline stattfand.
		//			Sonst folgender Bug: D1 und H1 Timeline, Rules auf D1 werden 24 mal processed, also z.B. 24 Trades geöffnet!
		//			FALSCH! sonst könnte kein zeitnaher SL feuern!
		//			also müssen die Rules verbessert werden
		var openTrades=[],previous,tlen, rlen;
		while( currentTime < stopDate){
			openTrades = this.getOpenTrades();
			for(i=0;i<len;i++){
				timeline = this.timelines[i];
				previous = timeline.cursor;
				timeline.advanceCursor( currentTime ); 
				if(timeline.cursor != previous){	//only process trades and rules if there was a change on the timeline
					tlen = openTrades.length, trade;
					for(j=0;j<tlen;j++){			// process open rules attached to trades within a simulation
						trade = openTrades[j];
						rlen = trade.rules.length;
						for(k=0;k<rlen;k++){
							trade.rules[k].process(this,timeline,trade);
						},this);
					},this);
					rlen = this.rules.length;
					for(l=0;l<rlen;l++){			//process rules directly attached to the simulation, not to a trade
						this.rules[l].process(this,timeline,null);
					},this);
				}
			}
			this.balances.push([new Date(currentTime),this.balance]);
			this.unrealized.push([new Date(currentTime),this.balance + this.getTradeWorth()]);
			if(this.logEvents){
				this.events.push({
					date:		new Date(currentTime)
					,prices:	this.timelines.map(function(t){return t.data[t.cursor].out();})
					,events:	this.timelines.map(function(t){return t.events[t.cursor].join(".");})
				});
			}
			currentTime.increaseMillisecond( tickSpeed );	//advance in Time
		}
		this.statistic = Forex.Simulation.Statistic.create(this);
		return this;
	}
	, runSingleTimeline: function(){	//takes only this.timelines[0], limited functionality, but maybe faster
		var timeline = this.timelines[0], openTrades,trade,i,j,k;
		var len=timeline.data.length,olen,tlen,rlen;
		this.startDate = new Date(timeline.data[0].date);
		this.stopDate = new Date(timeline.data[timeline.data.length-1].date);
		for(i=timeline.startIndex;i<len;i++){
			timeline.cursor = i;
			openTrades = this.getOpenTrades();
			olen = openTrades.length;
			for(j=0;j<olen;j++){		// process open rules attached to trades within a simulation
				trade = openTrades[j];
				tlen=trade.rules.lengh
				for(k=0;k<tlen;k++){
					trade.rules[k].process(this,timeline,trade);
				}
			}
			rlen=this.rules.length;
			for(j=0;j<rlen;j++){				//process rules directly attached to the simulation, not to a trade
				this.rules[j].process(this,timeline,null);
			}
			this.balances.push([new Date(timeline.data[i].date),this.balance]);
			this.unrealized.push([new Date(timeline.data[i].date),this.balance+this.getTradeWorth()]);
			if(this.logEvents){
				this.events.push({
					date:		new Date(timeline.data[i].date)
					,prices:	timeline.data[i].out()
					,events:	timeline.events[i].join(".")
				});
			}
		}
		this.statistic = Forex.Simulation.Statistic.create(this);
		return this;
	}
	, getTradeWorth: function(){
		var sum=0, a=this.getActiveTrades(), len=a.length;
		for(var i=0;i<len;i++){
			sum += a[i].getWorth();
		}
		return sum;
	}
	, plot: function(){
		//TODO Plot Timelines with Trades?
        var simplot1,simplot2,simplot3,simplot4;
        var div = K.createElement("div",{style:"width:400px;height:600px;max-height:600px;overflow:scroll"}
            , simplot1 = K.createElement("div",{id:"simplot_1",style:"width:400px;height:300px;"})
            , simplot2 = K.createElement("div",{id:"simplot_2",style:"width:400px;height:100px;"})
            , simplot3 = K.createElement("div",{id:"simplot_3",style:"width:400px;height:100px;"}})
            , simplot4 = K.createElement("div",{id:"simplot_4",style:"width:400px;height:0px;"}})
        );
		//--------------- Plot Balances + Unrealized -----------------
		//$.plot($("#"+"simplot_1"), [ 
        $.plot(simplot1, [ 
			 {data: this.balances ,label:"Balance",lines:{show:true,lineWidth:.5}}
			,{data: this.unrealized ,label:"Unrealized",lines:{show:true,lineWidth:.5}}
			,{data: [	  [this.balances[0][0],this.balances[0][1]]
						, [this.balances[this.balances.length-1][0],this.balances[this.balances.length-1][1]]
					] ,label:"linear",lines:{show:true,lineWidth:.5}}
			],{legend:{position:"se",backgroundOpacity: 70},xaxis: { mode: "time", minTickSize: [1, "day"] }}
		);
		//--------------- Plot Trade Histogramm -----------------
		var closedfilledTrades = this.getClosedFilledTrades();
		var trades = [].concat(closedfilledTrades).sort(function(a,b){return a.saldo>b.saldo?-1:(a.saldo<b.saldo?1:0);}); 
		$.plot(simplot2, [ 
			{ data: trades.map(function(t,i){ return [i,t.saldo]; }) ,label:"Best Iteration Trades",bars:{show:true,lineWidth:.5}}
		],{legend:{position:"se",backgroundOpacity: 70}});
		//--------------- Plot CHi2 of trades -----------------
		var tradeAverage = this.statistic.alltrades.average;
		var tradeIndicators = {
			chi2: {
				  parameter: { obj:"data", property:"saldo" }
				, ownStartIndex: 0
				, process: function(i){
					var a = this.getObj(this.parameter.obj);
					var p = this.parameter.property || (this.parameter.obj=="price" ? "close" : "value");
					return { value: Math.pow(a[i][p] - tradeAverage, 2) };
				}
			}
		};
		var tradeTimeline = Forex.Timeline.create({
			  data: [].concat(closedfilledTrades)
			, indicators: [
				  {name:"chi2", definition:tradeIndicators.chi2 }
			]
		});
		$.plot(simplot3, [ 
			{ data: tradeTimeline.toArray("chi2") ,label:"Chi^2",lines:{show:true,lineWidth:.5}}
		],{legend:{position:"nw",backgroundOpacity: 70}});
        
        return div;
	}
});
K.require("Forex.Simulation.Statistic.js");