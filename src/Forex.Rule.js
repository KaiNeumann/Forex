"use strict";
Forex.Rule = K.Base.subclass({
	_init: function(o){
		K.merge(this,{
			  id:			Ksl.String.createId()
			, name:			o.name
			, timeframe:	o.timeframe || "any"
			, currencypair:	o.currencypair || "any"
			, when:			o.when
			, then:			o.then
			, results:		null 						//optional storage for results of function "when", to be read by function "then"
		});
		return this;
	}
	, process: function(simulation,timeline,trade){
		//TODO FIXME warum funktioniern diese Abfragen nicht bei nur einer timeline?
		if(this.timeframe !== "any" && !!timeline && timeline.timeframe!==this.timeframe){ return; }
		if(this.currencypair !== "any" && !!timeline && timeline.currencypair!==this.currencypair){ return; }
		if( this.when(simulation,timeline,trade) ){
			var message = "Rule "+this.name+" filled";
			timeline.log( message );
			if(!!trade){ 
				trade.log({
					  date:		new Date(timeline.data[timeline.cursor].date)
					, price:	timeline.data[timeline.cursor].close //???
					, type:		"RULE TRIGGER"
					, message:	message
				});
			}
			this.then(simulation,timeline,trade);
		}
		return this;
	}
});
/*	Rule examples....
	reduce position by 1/2 when criterium: price goes above x
	adapt sl if criterium price reaches x
	exit if price reaches y
	add rule (...) if price reaches x
*/
