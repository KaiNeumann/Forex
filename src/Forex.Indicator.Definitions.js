"use strict";
//K.require("Forex.Indicator.js");
K.require("Forex.Indicator.js",function(){

Forex.Indicator.addDefinition({
      name: "U"
    , parameter: {
          obj:      "price"
        , property: "close"
    }
    , ownStartIndex: 1
    , process: function(i){
        if( i < this.startIndex ){ 
            var u = Number.NaN; 
        } else {
            var a = this.getObj(this.parameter.obj);
            var p = (this.parameter.obj !== "price") ? "value" : this.parameter.property || "close";
            var u = a[i][p] > a[i-1][p] ? a[i][p] - a[i-1][p] : 0;
        }
        return { value: u };
    }
});
Forex.Indicator.addDefinition({
      name: "D"
    , parameter: {
          obj:      "price"
        , property: "close"
    }
    , ownStartIndex: 1
    , process: function(i){
        if( i < this.startIndex ){ 
            var d = Number.NaN; 
        } else {
            var a = this.getObj(this.parameter.obj);
            var p = (this.parameter.obj !== "price") ? "value" : this.parameter.property || "close";
            var d = a[i][p] < a[i-1][p] ? a[i-1][p] - a[i][p] : 0;
        }
        return { value: d };
    }
});
Forex.Indicator.addDefinition({
      name: "RSI"
    , parameter: {
          period:   14
        , obj:      "price"
        , property: "close"
    }
    , requirements: [
          {name: "U_RSI", definition: "U", map: {obj: "@obj", property: "@property"} }
        , {name: "D_RSI", definition: "D", map: {obj: "@obj", property: "@property"} }
        , {name: "EMA_U_RSI", definition: "EMA", map: {obj: "U_RSI", property: "value", period: "@period"} }
        , {name: "EMA_D_RSI", definition: "EMA", map: {obj: "D_RSI", property: "value", period: "@period"} }
    ]
    , ownStartIndex: 0    //if ema are present, rsi is immediatly computable
    , process: function(i){
        if( i < this.startIndex ){ 
            var val = Number.NaN; 
        } else {
            var a = this.getObj(this.parameter.obj);
            var p = (this.parameter.obj !== "price") ? "value" : this.parameter.property || "close";
            var ema_u = this.getObj("EMA_U_RSI")[i].value;
            var ema_d = this.getObj("EMA_D_RSI")[i].value;
            var val = 100 - (100 / (1 + ema_u/ema_d )); 
        }
        return { value: val }; 
    }
});
Forex.Indicator.addDefinition({
      name: "STOCH_RSI"
    , parameter: {
          period: 14
    }
    , requirements: [
          {name: "RSI_S", definition: "RSI", map:{ period:"@period"} }
    ]
    , ownStartIndex: function(){ return this.parameter.period; }
    , process: function(i){
        if(i<this.startIndex){ 
            var ret = Number.NaN;
        } else {
            var a = this.getObj("RSI_S")
                ,min = Number.MAX_VALUE
                ,max = 0;
            for(var j = i-this.parameter.period+1; j <= i; j++){    //sollte 20x schneller sein und ist nicht soo viel mehr code
                var val = a[j].value;
                if(val > max){ max = val; }
                if(val < min){ min = val; }
            }
            var ret = (this.getObj("RSI_S")[i].value - min)/(max - min);
        }
        return { value: ret }; 
    }
});
Forex.Indicator.addDefinition({    //TODO Richtige Formel finden!
      name: "EMA"
    , parameter: {
          period:   14
        , obj:      "price"
        , property: "close"
    }
    , ownStartIndex: function(){ return this.parameter.period; }
    , process: function(i){
        if( i < this.startIndex ){ 
            var val = Number.NaN;
        } else if( i === this.startIndex ){  //erstmalige Berechnung, rückwirkend
            var a = this.getObj(this.parameter.obj);
            var p = this.parameter.property || (this.parameter.obj==="price" ? "close" : "value");
            var period = this.parameter.period;
            var val = a[i][p];
            for(var j = i-period; j <= i; j++){
                val += (1/period)*(a[j][p] - val);
            }
        } else {
            var a = this.getObj(this.parameter.obj);
            var p = this.parameter.property || (this.parameter.obj==="price" ? "close" : "value");
            var val = this.data[i-1].value + (1/(this.parameter.period))*(a[i][p] - this.data[i-1].value);
        }
        return { value: val };
    }
});
Forex.Indicator.addDefinition({
      name: "SMA"
    , parameter: {
          period:   14
        , obj:      "price"
        , property: "close"
    }
    , ownStartIndex: function(){ return this.parameter.period; }
    , process: function(i){
        if( i < this.startIndex ){ 
            var ret = Number.NaN;
        } else {
            var a = this.getObj(this.parameter.obj);
            var p = this.parameter.property || (this.parameter.obj==="price" ? "close" : "value");
            var period = this.parameter.period, val = 0;
            for(var j = i-period; j <= i; j++){ val += a[j][p]; }
            var ret = val/period;
        }
        return { value: ret }; 
    }
});
Forex.Indicator.addDefinition({
      name: "DMA"
    , parameter: {
          period:       14
        , displacement: 5
        , obj:          "price"
        , property:     "close"
        , smoothing:    "SMA"    //könnte ja auch EMA sein (meine Idee)
    }
    , requirements:[
          { name: "IND", definition:"@smoothing", map:{obj:"@obj",property:"@property",period:"@period"} }
    ]
    , ownStartIndex: function(){ return this.parameter.displacement; }
    , process: function(i){
        if(i<this.startIndex){ 
            var ret = Number.NaN;
        } else {
            var ret = this.getObj("IND")[i-this.parameter.displacement].value;
        }
            return { value: ret }; 
    }
});
Forex.Indicator.addDefinition({
      name: "DIFF"
    , parameter: {
          obj:      "price"
        , property: "close"
    }
    , ownStartIndex: 1
    , process: function(i){
        if( i < this.startIndex ){ 
            var ret = Number.NaN;
        } else {
            var a = this.getObj(this.parameter.obj);
            var p = this.parameter.property || (this.parameter.obj==="price" ? "close" : "value");
            var ret = a[i][p] - a[i-1][p];
        }
        return { value: ret }; 
    }
});
Forex.Indicator.addDefinition({
      name: "CROSS"
    , parameter: {
          obj1:         null
        , property1:    "value"
        , obj2:         null
        , property2:    "value"
    }
    , ownStartIndex: 1
    , process: function(i){
        if( i < this.startIndex ){ 
            var val = Number.NaN
                , up = false
                , down = false;
        } else {
            var a1 = this.getObj(this.parameter.obj1);
            var a2 = this.getObj(this.parameter.obj2);
            var p1 = this.parameter.property1 || (this.parameter.obj1==="price" ? "close" : "value");
            var p2 = this.parameter.property2 || (this.parameter.obj2==="price" ? "close" : "value");
            var up = a1[i-1][p1] < a2[i-1][p2] && a1[i][p1] > a2[i][p2];
            var down = a1[i-1][p1] > a2[i-1][p2] && a1[i][p1] < a2[i][p2];
            var val = !!up ? 1 : (!!down ? -1 : 0)
        }
        return { value: val, up: up, down: down };
    }
});
Forex.Indicator.addDefinition({
      name: "CROSS_LEVEL"
    , parameter: {
          obj:      null
        , property: "value"
        , level:    70
    }
    , ownStartIndex: 1
    , process: function(i){
        if( i < this.startIndex ){ 
            var val = Number.NaN
                , up = false
                , down = false;
        } else {
            var a = this.getObj(parameter.obj);
            var p = this.parameter.property || (this.parameter.obj==="price" ? "close" : "value");
            var up = a[i-1][p] < this.parameter.level && a[i][p] > this.parameter.level;
            var down = a[i-1][p] > this.parameter.level && a[i][p] < this.parameter.level;
            var val = !!up ? 1 : (!!down ? -1 : 0)
        }
        return { value: val, up: up, down: down };
    }
});
Forex.Indicator.addDefinition({
      name: "MACD"
    , parameter: {
          fast:     12
        , slow:     26
        , signal:   9
        , obj:      "price"
        , property: "close"
    }
    , requirements:[
          { name: "EMA_MACD_fast", definition: "EMA", map: { obj: "@obj", property: "@property", period: "@fast" } }
        , { name: "EMA_MACD_slow", definition: "EMA", map: { obj: "@obj", property: "@property", period: "@slow" } }
    ]
    , ownStartIndex: function(){ return this.parameter.signal; }
    , process: function(i){
        var a = this.getObj(this.parameter.obj);
        var p = this.parameter.property || (this.parameter.obj==="price" ? "close" : "value");
        if( i < this.parameter.slow ){ 
            var value = Number.NaN;
            var signal = Number.NaN;
        } else if( i < this.startIndex ){
            var value = this.getObj("EMA_MACD_fast")[i].value - this.getObj("EMA_MACD_slow")[i].value;
            var signal = Number.NaN;
        } else if( i === this.startIndex ){ //initial signal calculation
            var value = this.getObj("EMA_MACD_fast")[i].value - this.getObj("EMA_MACD_slow")[i].value;
            var signal = this.data[i-this.parameter.signal].value;
            for(var j=i-this.parameter.signal;j<=i;j++){
                signal += (1/this.parameter.signal)*(this.data[j].value - signal);
            }
        } else { //normal calculation
            var value = this.getObj("EMA_MACD_fast")[i].value - this.getObj("EMA_MACD_slow")[i].value;
            var signal = this.data[i-1].signal + (1/this.parameter.signal)*(value - this.data[i-1].signal);
        }
        return { value: value, signal: signal, histo: value-signal || Number.NaN };
    }
});
Forex.Indicator.addDefinition({
      name: "TR"
    , parameter: {}
    , ownStartIndex: 1
    , process: function(i){
        var a = this.timeline.data;
        if(i<this.startIndex){  return { value:Number.NaN }; } 
        return {value: Math.max( a[i].high - a[i].low, a[i].high - a[i-1].close, a[i].low - a[i-1].close )};
    }
});
Forex.Indicator.addDefinition({
      name: "ATR"
    , parameter: {
          period: 14
    }
    , requirements: [
          { name: "TR", defintition: "TR" }
    ]
    , ownStartIndex: function(){ return this.parameter.period; }
    , process: function(i){
        if(i < this.startIndex){ 
            var ret = Number.NaN;
        } else if ( i === this.startIndex ){
            var a=this.getObj("TR"),val = 0;
            for(var j=i-this.parameter.period;j<=i;j++){
                val += a[j].value;
            }
            var ret = val / this.parameter.period;
        } else {
            var ret = (this.data[i-1].value*(this.parameter.period-1) + this.getObj("TR")[i].value) / this.parameter.period;
        }
        return { value: ret };
    }
});
Forex.Indicator.addDefinition({
      name: "KELTNER_CHANNEL"
    , parameter: {    
          property:     "close"
        , ema_period:   20
        , factor:       2
        , atr_period:   10 
    }
    , requirements: [
          { name: "EMA_KELTNER", definition: "EMA", map: { period: "@ema_period", obj: "price", property: "@property" } }
        , { name: "ATR_KELTNER", definition: "ATR", map: { period: "@atr_period" } }
    ]
    , ownStartIndex: 0
    , process: function(i){
        if( i < this.startIndex ){
            var value = Number.NaN;
        } else {
            var value = this.getObj("EMA_KELTNER")[i].value;
            var atr = this.getObj("ATR_KELTNER")[i].value;
        }
        return { value: value, upper: value+this.parameter.factor*atr, lower: value-this.parameter.factor*atr };
    }
});
Forex.Indicator.addDefinition({
      name: "STDDV"
    , parameter: {
          period:   14
        , obj:      "price"
        , property: "close"
    }
    , requirements: [
        { name: "SMA_STDDV", definition: "SMA", map: { period: "@period", obj: "@obj", property: "@property" } }
    ]
    , ownStartIndex: 0
    , process: function(i){
        if( i < this.startIndex ){
            var stddv = Number.NaN;
        } else {
            var a = this.getObj(this.parameter.obj);
            var p = this.parameter.property || (this.parameter.obj=="price" ? "close" : "value");
            var sma = this.getObj("SMA_STDDV")[i].value;
            var sum = 0;
            for(var j=i-this.parameter.period;j<=i;j++){
                sum += Math.pow(a[j][p] - sma,2);
            }
            var stddv = Math.sqrt( sum / (this.parameter.period-1) );
        }
        return { value: stddv };
    }
});
Forex.Indicator.addDefinition({
      name: "BB"
    , parameter: {
          obj:          "price"    //könnte auch ein Indikator sein z.B. RSI, dann wäre property == "value"!
        , property:     "close"
        , sma_period:   20
        , stddv_factor: 2
        , stddv_period: 20 
    }
    , requirements: [
          { name: "SMA_BB", definition: "SMA", map: { period: "@sma_period", obj: "@obj", property: "@property" } }
        , { name: "STDDV_BB", definition: "STDDV", map: { period: "@stddv_period", obj: "@obj", property: "@property" } }
    ]
    , ownStartIndex: 0
    , process: function(i){
        if( i < this.startIndex ){
            var sma = Number.NaN;
            var stddv = Number.NaN;
        } else {
            var sma = this.getObj("SMA_BB")[i].value;
            var stddv = this.getObj("STDDV_BB")[i].value;
        }
        return { value: sma, upper: sma + this.parameter.stddv_factor * stddv, lower: sma - this.parameter.stddv_factor * stddv, stddv: stddv };
    }
});
Forex.Indicator.addDefinition({
      name: "INSIDE_BAR"
    , parameter: {}
    , ownStartIndex: 1
    , process: function(i){
        if( i < this.startIndex ){ 
            var value = Number.NaN;
        } else {
            var current = this.timeline.data[i];
            var previous = this.timeline.data[i-1];
            var value = (current.high<previous.high && current.low>previous.low) ? 1 : 0;
        }
        return { value: value };
    }
});
Forex.Indicator.addDefinition({//TODO
      name: "HEIKEN_ASHI"
    , parameter: {}        
    , ownStartIndex: 1
    , process: function(i){
        if( i < this.startIndex ){
            return {open:Number.NaN,close:Number.NaN,high:Number.NaN,low:Number.NaN}; 
        } else {
            var c = this.timeline.data[i];
            var p = this.timeline.data[i-1];
            return {open:Number.NaN,close:Number.NaN,high:Number.NaN,low:Number.NaN};
        }
    }
});

});//end require