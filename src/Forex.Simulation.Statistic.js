"use strict";
K.require("Forex.Strategy.js",function(){

Forex.Strategy.Statistic = K.Base.subclass({
    _init: function(o,runtime){
        var sumresult = 0, number = 0, numberPositive = 0;
        var bestmax = Forex.Strategy.Statistic.max_criteria.map(function(c){ return 0; });
        var bestmin = Forex.Strategy.Statistic.min_criteria.map(function(c){ return 0; });
        var el;
        var results=[]; //easier to sort by balance later on
        for(var hash in o){if(o.hasOwnProperty(hash)){
            el = o[hash].statistic;
            results.push(el);
            number++;
            if(el.balance>0){ numberPositive++; }
            sumresult + =el.balance;
            Forex.Strategy.Statistic.max_criteria.forEach(function(c,i){
                if( el[c] > o[bestmax[i]].statistic[c] ){ bestmax[i] = hash; }
            });
            Forex.Strategy.Statistic.min_criteria.forEach(function(c,i){
                if( el[c] < o[bestmin[i]].statistic[c] ){ bestmin[i] = hash; }
            });
        }}
        K.merge(this,{
              best:         {}
            , results:      o
            , runtime:      runtime
            , iterations:   number
            , positive:     numberPositive/number
            , avgresult:    sumresult/number
            , benchmark:    runtime/number
            , resultarray:  results
        });
        Forex.Strategy.Statistic.max_criteria.forEach(function(c,i){ this.best[c] = bestmax[i]; });
        Forex.Strategy.Statistic.min_criteria.forEach(function(c,i){ this.best[c] = bestmin[i]; });
        
        var sumchi2 = 0, avg = this.avgresult;
        for(hash in o){if(o.hasOwnProperty(hash)){
            sumchi2 += Math.pow( o[hash].statistic.balance - avg, 2 );
        }}
        this.stddv = Math.sqrt( sumchi2/(number-1) );
        this.t_test = Math.sqrt( number )*( this.avgresult/this.stddv );
        return this;
    }
    , getBestSimulation: function(criteria){
        return {
              parameter:    Forex.Strategy.hashToParameterSet( this.best[criteria] )
            , statistic:    o[this.best[criteria]].statistic
            , value:        o[this.best[criteria]].statistic[criteria];
        };
    }
    , getSortedResults:    function(criteria){
        return this.resultarray.sort(function(a,b){ return a[criteria] > b[criteria] ? 1 : (a[criteria] < b[criteria] ? -1 :0); });
    }
    , getSummary: function(){
        return "Completed "+this.iterations+" iterations in "+this.runtime+" ms, that's "
                +(0|this.benchmark)+" ms per iteration. T-Test for these iterations: "+this.t_test.toFixed(4)
                +" with "+this.positive.toPercent(4)+" profitable runs";
    }
    , plot:function(criteria){
        var div = K.createElement("div"
            , strategyplot1 = K.createElement("div",{id:"strategystatistic"})
        );
        var sorted = this.resultarray.sort(function(a,b){
            if(a[criteria]>b[criteria]) return -1;
            if(a[criteria]<b[criteria]) return 1;
            return 0;
        });
        $.plot(strategyplot1, [ 
            { data: sorted.map(function(t,i){ return [i,t[criteria]]; }), label:"Iterations "+criteria,bars:{show:true,lineWidth:.5}}
            ,{ data: sorted.map(function(t,i){ return [i,Math.min(5,Math.abs(t.statistic.t_test))*t.statistic.t_test.sign()]; }), label:"Iterations T-Test",bars:{show:true,lineWidth:.5}, yaxis: 2}
        ],{legend:{position:"ne",backgroundOpacity: 70}});
        return div;
    }
});
K.merge(Forex.Strategy.Statistic,{
      max_criteria:    "balance,t_test,successratio,r2,rating".split(",")
    , min_criteria:    "max_drawdown".split(",")
});

});//end require