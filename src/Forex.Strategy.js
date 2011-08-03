"use strict";
Forex.Strategy = K.Base.subclass({
	_init:function(o){	//gets Strategy object parameter,timelines,rules
		K.merge(this,{
			  id:				K.createId()
			, timelineTemplate: o.timelineTemplate
			, ruleTemplate:		o.ruleTemplate
			, computeParameter:	o.computeParameter// function to compute additional, dependant parameters (like cross_down = 100 - cross_up, ...) to mix into parameter set
				/* Example: 
					function(p){ return {
						  fast_cross_down_level:	100 - p.fast_cross_up_level
						, slow_cross_down_level:	100 - p.slow_cross_up_level
						, ema_cross_down_above:		100 - p.ema_cross_up_below
					};}
					kann aber auch beliebig komplex werden...
				*/
			, parameterDefinition: o.parameterDefinition
			, parameter: 		[].concat(o.parameterDefinition).map(function(p){return Forex.Strategy.Parameter.create(p);},this)
			, results: 			{}	//saves all iterations in {parameter_hash: simulation_statistic} objects
			, UI:				null
		}
		return this;
	}
	, createUI: function(outputId){
		this.UI = Forex.Strategy.UI.create(this);
        document.getElementById(outputId).appendChild(this.UI.build());
		
	}
    , saveResults: function(){}
    , loadResults: function(){}
	, getSearchSpaceDimension:function(){ var r=1; for(var i=0,len=this.parameter.length;i<len;i++){ r *= this.parameter[i].values.length; } return r; }
	, parameterSetToHash:function(parameterSet){
        return this.parameter.map(function(p){ return parameterSet[p.name].replace(/\./g,"$");},this).join("_"); 
    }
	, hashToParameterSet:function(hash){ 
        var r={}, values=hash.split("_"); 
        Object.keys(this.parameter).forEach(function(key,i){ r[key] = this.parameter[key].convert( values[i].replace(/\$/g,".") ); },this); 
        return r; 
    }
	, getParamChangeMethod:function(pname){ return this.UI.getParamChangeMethod(pname); }
	, getParameterRanges:function(pname){
		var type = this.UI.getParamRangeType(pname);
		var values = this.UI.getParamRangeValues(pname);
		var value = this.UI.getParamValue(pname);
		var a = values.split(",");
		switch(type){	
			case "csv":		return { value: value, values: a }; 
			case "range":	return { value: value, from: a[0], to: a[1], step: a[2] || null };
			case "around":	return { value: value, middle: a[0], around: a[1], step: a[2] || null };
			case "none":	return { value: value };
		}
		return {};
	}
	, runSimulation:function(parameterSet,log){
		var Sim = Forex.Simulation.create({
			  timelines:	this.timelineTemplate(parameterSet)
			, rules:		this.ruleTemplate(parameterSet)
			, logEvents:	log || false
		});
		Sim.run();
		return {statistic:Sim.statistic, log:(log?Sim.getLog():[]), simulation:(log?Sim:null) };
	}
	, runonce:function(parameterSet){
		if(!parameterSet){
			parameterSet = {};
			this.parameter.forEach(function(p){ 
				parameterSet[p.name] = p.convert( this.UI.getParamValue(pname) ); 
			},this);
			if(this.computeParameter){
				K.merge(parameterSet,this.computeParameter(parameterSet));
			}
		}
		var result = this.runSimulation(parameterSet,true);
		//output logs, graphs, statistics, ...
        result.simulation.plot(this.UI.outputId);
	}
	, iterate:function(n){
		var parameterSet={};
		var r = {}, best={};
		var n = n || parseInt(this.UI.getIterations());
		//Parameter Ranges setzen
		var paramChangeMethod = {}
		var plen=this.parameter.length,p;
		for(i=0;i<plen;i++){
			p = this.parameter[i];
			p.initValues( this.getParameterRanges(p.name) );
			paramChangeMethod[p.name] = this.getParamChangeMethod(p.name);
		}
		var start = new Date().getTime();
		var hash,simresult,breaks=0;
		for(i=0;i<n;i++){
			parameterSet = {};
			for(i=0;i<plen;i++){
				p = this.parameter[i];
				parameterSet[p.name] = p.get( paramChangeMethod[p.name] ); 
			}
			if(this.computeParameter){
				Ksl.Object.extend(parameterSet,this.computeParameter(parameterSet));
			}
			hash = this.parameterSetToHash(parameterSet);
			if(!this.results[hash]){ //lauf nur, wenn parameterSet noch nicht gespeichert
				simresult = this.runSimulation(parameterSet,false);//false == no logging
				this.results[hash] = simresult;
				r[hash] = simresult;
			} else {
				//TODO oder gespeichertes Ergebnis frech hinzufügen?
				i--; //dieser Schleifendurchlauf zählt nicht
				breaks++; if(breaks>n){ break; } // verhindert Endlosschleifen falls der Parameterraum schon abgegrast ist
									//TODO whats the best threshold? n? 2*n??
			}
		}
		var end = new Date().getTime();
		var statistic = Forex.Strategy.Statistic.create(r,end-start);
        //var statistic = Forex.Strategy.Statistic.create(this.results,end-start); //Gesamtstatistik, falls gefragt
		//TODO Output statistic
		//output graphs, statistics, ...
		this.UI.updateParameterSet( statistic );
		
        //TODO Enable selction of criteria of best iteration
        
		//Calculate and plot best iteration
		var criteria = this.UI.getCriteriaForBestIteration();
		this.runonce( statistic.getBestSimulation(criteria).parameter );
	}
});
K.require("Forex.Strategy.Parameter.js","Forex.Strategy.UI.js");