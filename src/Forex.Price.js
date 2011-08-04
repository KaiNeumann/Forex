"use strict";
Forex.Price = K.Base.subclass({
    _init: function(o){
        K.merge(this,{
              date :                null
            , open :                null
            , close :               null
            , high :                null
            , low :                 null
            , typical :             null
            , typical_weighted :    null
        });
        K.merge(this,{
              set : function(o){
                //TODO determine and parse input format
                "open,close,high,low,volume".split(",").forEach(function(property){ if(!!o[property]){ this[property] = parseFloat(o[property]); } },this);
                var match = o.date.match(/^(\d+)\.(\d+)\.(\d{4})$/);//TODO determine date & time format - das hier ist erstmal eine Krücke
                if(match && match[3]){    o.date = match[3]+"-"+match[2]+"-"+match[1]; }
                this.date = new Date(o.date+"T"+o.time);
                this.typical = (this.close + this.high + this.low) / 3;
                this.typical_weighted = (2*this.close + this.high + this.low) / 4;
                return this;
            }
            , out : function(){ 
                return "O:"+this.open.toFixed(4) +" H:"+this.high.toFixed(4) +" L:"+this.low.toFixed(4) +" C:"+this.close.toFixed(4);
            }
            , compare : function(val){
                if(this.low > val){ return 1; }
                if(this.high < val){ return -1; }
                return undefined;
            }
        });
        if(!!o){ this.set(o); } 
        return this; 
    }
});
