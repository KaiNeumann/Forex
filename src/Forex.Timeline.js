"use strict";
K.require("K.Date.js","Forex.Indicator.js");

Forex.Timeline = K.Base.subclass({ //General timeline that can have indicators (Pricetimeline will be derived from this)
    _init: function(o){ // {data,indicators)
        K.merge(this,{
              id:           K.createId()
            , data:         o.data || []    //array of data (prices etc)
            , indicator:    {}                //named indicators
            , startIndex:   0                //calculated according to Indicators
            , timeframe:    null            //in ms
            , events:       []                //for trades to log into
        });
        Forex.Indicator.requirementsToDefinition(o.indicators).forEach(function(definition){
            this.addIndicator(K.merge(definition, { 
                  name:     el.name
                , timeline: this
                //this is an indicator directly attached to a timeline, not a sub indicator of another indicator, so no parent!
            }));
        },this);
        return this; 
    }
    , clearEvents: function(){ this.events=[]; return this; }
    , getObj: function(s){ //gets desired Array of Data, either Prices, or Indicatordata. Typically called from Indicator Processing
        if(!s || s=="price" || s=="data"){ return this.data; }
        return this.indicator[s].data;
    }
    , addIndicator: function(name,o){
        this.indicator[name] = Forex.Indicator.create(o);
        this.indicator[name].recalculate();
        this.startIndex = this.getStartIndex(); //neuberechnung des startindex für diese timeline
        return this; 
    }
    , recalculateIndicators: function(){
        for(var name in this.indicator){ if(this.indicator.hasOwnProperty(name)){
            this.indicator[name].recalculate(this);
        }}
        this.startIndex = this.getStartIndex();
        return this;
    }
    , getStartIndex: function(){
        var max = 0,val;
        for(var name in this.indicator){ if(this.indicator.hasOwnProperty(name)){
            val = this.indicator[name].startIndex;
            if(val>max){ max=val; }
        }}
        return max;
    }
    //Timeline and Rule logs string messages, trade logs objects
    , log: function(s){
        if(!this.events[this.cursor]){ this.events[this.cursor] = []; }
        this.events[this.cursor].push(s);
    }
    , getEventlog:function(){
        return this.data.map(function(data,i){
            return {date:data.date,price:data.out(),events:[].concat(this.events[i]).join(". ")};//TODO Die events könnte man noch übersichtlicher darstellen..
        },this);
    }
    , toArray:function(obj,property){ //kann in Flot importiert werden
        var a = this.getObj(obj);
        var p = (obj!="price") ? "value" : property || "close";
        return this.data.map(function(price,i){
            //return [price.date, a[i][p]];  //Flot ignoriert die leeren Wochenend daten nicht, was komisch aussieht, aber die Korrektheit nicht beeinflusst
            return [i, a[i][p]];
        },this);
    }
});

Forex.PriceTimeline = Forex.Timeline.subclass({
      _init: function(o){    //from _base {data,indicators} + {pair,inputText}
        this._base.apply(this,o);
        K.merge(this,{
              currencypair:    o.pair || ""
            , cursor:        0                //index pointer for prices during a simulation run
        });
        if(!!o.inputText){ this.readPricesFromText(o.inputText,o.delimiter,o.linesplit); }//TODO read from file parameter
        return this;
    }
    , addPrice: function(){
        var a;
        for(var i=0;i<arguments.length;i++){ 
            a = arguments[i];
            if(a instanceof Array){ a.forEach(function(o){ this.addPrice(o); },this); } 
            else if(a instanceof Forex.Price){ this.data.push(a); }
            else{ this.data.push( Forex.Price.create(a) ); }
        }
        return this;
    }
    , advanceCursor: function(date){
        while( this.data.length > this.cursor && this.data[ this.cursor+1 ].date < date ){
            this.cursor++;
        }
        return this;
    }
    , readPricesFromText: function(text,delimiter,linesplit){
        //text could be read from DIV content with document.getElementById(id).firstChild.wholeText
        delimiter = delimiter || /\t+/; //could also be "," or ";" or " "
        linesplit = linesplit || "\n";
        text = text.split(linesplit);
        var header = text.shift();
        var columnnames = header.split(delimiter).map(function(name){
            name = name.toLowerCase();
            if(name=="min"){ name = "low"; }
            if(name=="max"){ name = "high"; }
            return name;
        });
        text.forEach(function(line){
            if(line.replace(/\s/g,"").length>0){
                var p = {};
                line.split(delimiter).forEach(function(d,i){
                    p[columnnames[i]] = d;
                },this);
                this.addPrice( p );
            }
        },this);
        this.getTimeframe();
        this.recalculateIndicators();
        return this;
    }
    , readPricesFromFile: function(url){}
    , readPricesFromYahoo: function(){}
    , getTimeframe: function(){ //TODO FIXME: Wenn die ersten zwei Daten ausgerechnet um ein Wochenende liegen, klappt das hier so nicht...
        if(this.data.length>2 && this.data[0].date && this.data[1].date){
            var timeframe = this.data[1].date - this.data[0].date;
            this.timeframe = timeframe;
            return timeframe;
        }
        //throw new Error("Unable to determine timeframe. Array of prices need at least two elements to get a timeframe");
    }
    , convertTimeframe: function(newTimeframe){
        var factor = Forex.Timeframes[newTimeframe]/this.getTimeframe();
        if(factor < 1){ throw new Error("can only convert into higher timeframes"); }
        if(factor !== Math.floor(factor)){ throw new Error("can only convert into int timeframes"); } 
        if(factor == 1){ return this; } // no conversion needed
        var a = new this(this.currencypair);
        var i = 0;
        var t = []; // temp array of next (factor) price elements
        while(i<= this.data.length - factor){
            t = this.data.splice(i,factor);
            a.add({
                  open:     this.data[i].open
                , close:    this.data[i+factor].close
                , high:     Math.max.apply(null,t.map(function(el){return el.high || Number.MIN_VALUE;}) )
                , low:      Math.min.apply(null,t.map(function(el){return el.low || Number.MAX_VALUE;}) )
                , volume:   t.reduce(function(memo,el){ return memo+(el.volume||0); },0)
            });
            i+=factor;
        }
        a.timeframe = Forex.Timeframes[newTimeframe];
        return a;
    }
    , toCSV: function(seperator){
        seperator = seperator || ",";
        var pricenames="date,open,high,low,close,volume,typical,typical_weighted".split(",");
        var indicatornames = [];
        for(var name in this.indicator){if(this.indicator.hasOwnProperty(name)){
            indicatornames.push(name);                //TODO nicht nur indicator sondern alle exports ausgeben
        }}
        var indicatorstarts = indicatornames.map(function(name){ return this.indicator[name].startIndex; },this);
        var r = [pricenames.concat(indicatornames).join(seperator)];//return array with header
        this.data.forEach(function(price,i){
            var line= pricenames.map(function(name){ return price[name] || ""; })
                                .concat(indicatornames.map(function(indi,inr){
                                    if(i<indicatorstarts[inr]){ return ""; }
                                    return this.indicator[indi].data[i].value || "";     //TODO nicht nur value erlauben sondern alle exports
                                },this));
            r.push(line.join(seperator));
        },this);
        return r.join("\n");
    }
});