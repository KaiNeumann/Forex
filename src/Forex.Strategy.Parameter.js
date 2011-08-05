"use strict";
K.require("Forex.Strategy.js",function(){

Forex.Strategy.Parameter = K.Base.subclass({
    _init:function(o){
        /*    Beispiel:
        {name:"rsi_period",from:2,to:25,step:1}
        new Forex.Strategy.Parameter({
              name:         "RSI period"
            , type:         "number"
            , description:  "Basic Indicator on Price Close. Parameter defines the RSI smotthing factor
            , defaultValues: {
                  value:    14
                , from:     2
                , to:       30
            }
        })
        Werte für diesen Parameter werden dann von der UI ausgelesen und per initValues() eingegeben
        in Strategietests werden für jede Iteration dann neue Werte per get("random") oder get("next") ausgelesen
        */
        K.merge(this,{        
              name:             o.name
            , description:      o.description || ""
            , type:             o.type || "number"      //could also be string or boolean
            , values:           []
            , value:            null                    //currently selected value from array this.values
            , defaultValues:    o.defaultValues || {}
        });
        if(!!o.defaultValues){ this.initValues(o.defaultValues); }
        return this;
    }
    , initValues: function(o){
        this.values = [];
        //console.log("initValues for "+this.name+" : "+JSON.stringify(o));
        if(this.type==="number" && K.isDefined(o.middle) && K.isDefined(o.around)){
            var val=this.convert(o.middle), around=this.convert(o.around), step=this.convert(o.step||"1");
            for(var i=val-around;i<=val+around;i+=step||1){
                this.values.push(i);
            }
        } else if(this.type==="number" && K.isDefined(o.from) && K.isDefined(o.to)){
            var from=this.convert(o.from), to=this.convert(o.to), step=this.convert(o.step||"1");
            for(var i=from;i<=to;i+=step||1){
                this.values.push(i);
            }
        } else if(Ksl.Object.isDefined(o.values)){
            for(var i=0;i<o.values.length;i++){
                this.values.push( this.convert(o.values[i]) );
            }
        } else if(Ksl.Object.isDefined(o.value)){
            this.values.push( this.convert(o.value) );
        }
        if(K.isDefined(o.value)){ this.value = this.convert(o.value); }
        //console.log(this.values);
        return this;
    }
    , convert:function(s){ //converts string read from UI to desired type
        var r;
        switch(this.type){
            case "number":  r = parseFloat(""+s);            break;
            case "string":  r = ""+s;                        break;
            case "boolean": r = (s===true || s=="true");    break;
        }
        return r;
    }
    , set:function(val){ this.value = (typeof val === this.type) ? val : this.convert(val); }
    , get:function(method){
        if(this.values.length==0){ throw new Error("Parameter "+this.name+".get() failed, because there were no values intitialized"); }
        switch(method){
            case "ordered": //fallthrough
            case "next":    this.value = !this.value ? this.values[0] : this.values[ (this.values.indexOf(this.value)+1) % this.values.length ]; break;
            case "random":    this.value = this.values[ 0 | ( Math.random() * this.values.length)]; break;
            default: break;    //no change in value    (method "none" or "keep" or whatever
        }
        return this.value;
    }
});

});//end require