"use strict";
Forex.Indicator = K.Base.subclass({
    _init: function(o){
        K.extend(this,{
              name:             o.name
            , parameter:        o.parameter             // parameter at runtime to overwrite default parameters
            , process:          o.process               // function to calculate indicator values
            , ownStartIndex:    o.ownStartIndex || 0    // fixed value or function (calculated from this.parameters at runtime)
            , startIndex:       null                    // start of indicator's valid range. calculated in dependence from ownStartIndex and those of sub-indicators
            , timeline:         o.timeline || null
            , parent:           o.parent || null        // set when this is a sub-indicator, to propagate values back to it's parent indicator
            , indicator:        {}                      // own Sub-indicators
            , data:             []                      // indicator data (content) usually objects with at least a value property {value:...}
        });
        Forex.Indicator.requirementsToDefinition(o.requirements).forEach(function(definition){
            this.addIndicator(K.merge(definition, { 
                  name:         el.name
                , timeline:     this.timeline
                , parent:       this
            }));
        },this);
        return this;
    }
    , addIndicator:function(o){
        this.indicator[o.name] = Forex.Indicator.create(o);
        this.indicator[o.name].recalculate();
        return this; 
    }
    , getObj: function(s){
        if(!s || s=="price" || s=="data"){ return this.timeline.data; }
        return this.getIndicator(s).data;
    }
    , getIndicator: function(s){
        if(this.indicator[s]){ return this.indicator[s]; }
        if(this.parent){ return this.parent.getIndicator(s); }
        return this.timeline.indicator[s];
    }
    , recalculate: function(){    // complete recalculating
        var max = 0;
        for(var indi in this.indicator){ if(this.indicator.hasOwnProperty(indi)){//recalculate requirements first
            this.indicator[indi].recalculate();
            var max = Math.max(max,this.indicator[indi].startIndex);
        }}
        if(!!this.parameter.obj && this.parameter.obj!="price" && this.parameter.obj!="data" ){ //take underlying data into account as well
            var max = Math.max(max,this.getIndicator(this.parameter.obj).startIndex);
        }
        this.startIndex =  max + (typeof this.ownStartIndex=="function" ? this.ownStartIndex() : this.ownStartIndex);//ab wann liefert dieser Indikator gültige Werte?
        this.data = [];
        for(var i=0;i<this.timeline.data.length;i++){//normale for loop, damit ich wöhrend der Berechnung auf vorhergehende Werte zurückgreifen kann
            this.data.push( this.process(i) );
        }
        return this;
    }
});
K.merge(Forex.Indicator,{
      Definitions: {}
    , addDefinition: function(o){
        if(this.definitions[o.name]){ throw new Error("addDefinition for Indicator failed. Indicator with name "+o.name+" already exists"); }
        this.Definitions[o.name] = o;
    }
    , getDefinition: function(name){
        return this.Definitions[name];
    }
    , requirementsToDefinition: function(a){//converts Indicator Requirements into proper Indicator Definitions (to be used with add Indicator)
        return a.map(function(el){
            var definition;
            if(typeof el.definition==="string"){ //a string is shortcut to load a predefined indicator definition with that name
                defintition = Forex.Indicator.getDefinition(
                    el.definition.indexOf("@")===0 ? o.parameter[ el.definition.substring(1) ] : el.definition //if string starts with "@", it will be read from a parameter
                );
            } else { //otherwise we define a whole indicator there as well
                definition = el.definition; 
            }
            Object.keys(el.map).forEach(function(key){
                definition.parameter[key] = el.map[key].indexOf("@")===0 ? o.parameter[ el.map[key.substring(1)] ] : el.map[key];
            },this);
            return definition;
        },this);
    }
});
K.require("Forex.Indicator.Definitions.js");//Load Standard Indicators