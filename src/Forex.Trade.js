"use strict";
K.require("Forex.Rule.js");

Forex.Trade = K.Base.subclass({
    _init: function(o){
        K.merge(this,{
              id:               Ksl.String.createId()
            , status:           Forex.Trade.Status.WAITING
            , was_filled:       false
            , timeline:         o.timeline
            , parent:           o.parent                // simulation
            , currencypair:     o.timeline.currencypair
            , initial_ammount:  o.ammount || 1          //TODO brauche ich das?
            , ammount:          0                       // ammount of shares the trade currently holds
            , saldo:            0                       // saldo of the trade in Pips
            , type:             o.type                  //LONG or SHORT
            , price:            o.price || null
            , enterdate:        null
            , duration:         null
            , data:             o.data || {}            //internal storage to be used by rules, e.g. for moving stop losses, number of triggers, etc
            , rules:            []
            , events:           []                      //just for logging
            , logEvents:        !!o.parent ? o.parent.logEvents : false
        });
        [].concat(o.rules).forEach(function(rule){ this.addRule(rule); },this);
        this.log({
              date:     new Date(this.timeline.data[this.timeline.cursor].date)
            , price:    o.price || this.timeline.data[this.timeline.cursor].close
            , type:     "OPEN"
            , message:  this.type+" trade '"+this.id+"' was OPENED"
        });
        if(o.price || o.fill){ this.enter({ ammount: o.ammount, price: o.price, property: o.property }); }
                    //o.fill==true heißt fill egal zu welchem Preis...
        return this;
    }
    , enter:function(o){
        o = o || {};
        //TODO set enter cursor?        
        if(this.status != Forex.Trade.Status.WAITING){
            //this.events.forEach(function(s){ console.log(s); });
            throw new Error("Invalid status to enter a trade");    
        }
        var currentPrice = this.timeline.data[this.timeline.cursor];
        if(o.price && (o.price<currentPrice.low || o.price>currentPrice.high)){
            this.price = currentPrice.open;
            //console.log("set price to open "+this.price);
        } else { 
            this.price = o.price || currentPrice[o.property || "close"];
        }
        this.ammount = this.parent.getAmmount(o.ammount,this.price);
        this.status = Forex.Trade.Status.ACTIVE;
        this.enterdate = this.timeline.cursor;
        this.was_filled = true;
        this.log({
              date:     new Date(this.timeline.data[this.timeline.cursor].date)
            , price:    this.price
            , type:     "ENTER"
            , message:  this.type+" trade '"+this.id+"' was ENTERED for price "+this.price
        });
        return this;
    }
    , exit:function(o){
        o = o || {};
        if(this.status === Forex.Trade.Status.WAITING){    //was never filled!
            this.status = Forex.Trade.Status.CLOSED;
            this.duration = this.timeline.cursor-this.enterdate;
            this.log(this.type+" waiting trade '"+this.id+"' was CLOSED");
            return this;
        }
        if(this.status === Forex.Trade.Status.CLOSED){
            this.events.forEach(function(s){ console.log(s); });
            throw new Error("Invalid status to exit a trade");    
        }
        var currentPrice = this.timeline.data[this.timeline.cursor];
        if(o.price && (o.price<currentPrice.low || o.price>currentPrice.high)){
            var exitprice = o.price;
            //console.log("set exit price to "+o.price);
        } else {
            var exitprice = o.price || currentPrice[o.property || "close"];
        }
        var change;
        var spread = Forex.Spreads[this.timeline.currencypair];
        if(this.type === Forex.Trade.Type.LONG){
            change = this.ammount * ( exitprice - this.price ) * Forex.getPipfactor(this.timeline.currencypair) - spread;
        } else {
            change = this.ammount * ( this.price - exitprice ) * Forex.getPipfactor(this.timeline.currencypair) - spread ;
        }
        this.saldo += change;
        this.parent.balance += change;
        this.ammount = 0;
        this.status = Forex.Trade.Status.CLOSED;
        this.duration = this.timeline.cursor-this.enterdate;
        this.log({
              date:     new Date(this.timeline.data[this.timeline.cursor].date)
            , price:    exitprice
            , type:     "CLOSE"
            , message:  this.type+" trade '"+this.id+"' was CLOSED for "+exitprice+". Requested exit price (SL/TP):"+o.price+". End saldo is "+this.saldo
        });
        return this;
    }
    //add gibts nicht mehr, das wäre dann ein eigener Trade!
    , reduce:function(o){    //partial TP or SL // TODO UNTESTED!!!
        o = o || {};
        //TODO Check if o.price & trade status is reasonable
        if(this.status !== Forex.Trade.Status.ACTIVE){
            this.events.forEach(function(s){ console.log(s); });
            throw new Error("Invalid status to reduce a trade");    
        }
        var currentPrice = this.timeline.data[this.timeline.cursor];
        if(o.price && (o.price<currentPrice.low || o.price>currentPrice.high)){
            var exitprice = o.price;
            //console.log("set exit price to "+o.price);
        } else {
            var exitprice = o.price || currentPrice[o.property || "close"];
        }
        if(o.ammount >= this.ammount){ this.exit(o); }
        var change;
        var spread = Forex.Spreads[this.timeline.currencypair]/Forex.getPipfactor(this.timeline.currencypair);
        if(this.type === Forex.Trade.Type.LONG){
            change = o.ammount * ( exitprice - this.price ) * Forex.getPipfactor(this.timeline.currencypair) - spread;
        } else {
            change = o.ammount * ( this.price - exitprice ) * Forex.getPipfactor(this.timeline.currencypair) - spread ;
        }
        this.saldo += change;
        this.parent.balance += change;
        this.ammount -= o.ammount;
        this.log({
              date:     new Date(this.timeline.data[this.timeline.cursor].date)
            , price:    exitprice
            , type:     "REDUCE"
            , message:  this.type+" trade '"+this.id+"' reduced "+o.ammount+" shares for "+exitprice+". Current saldo is "+this.saldo+". Current worth: "+this.getWorth()
        });
        return this;
    }
    , getPipDifference:function(timeline,property){
        timeline = timeline || this.timeline;
        var exitprice = timeline.data[timeline.cursor][property||"close"];
        if(this.type === Forex.Trade.Type.LONG){
            return ( exitprice - this.price )*Forex.getPipfactor(this.currencypair);
        } else {
            return ( this.price - exitprice )*Forex.getPipfactor(this.currencypair);
        }
    }
    , getPriceDifference:function(timeline,property){
        timeline = timeline || this.timeline;
        var exitprice = timeline.data[timeline.cursor][property||"close"];
        if(this.type === Forex.Trade.Type.LONG){
            return ( exitprice - this.price - Forex.Spreads[this.currencypair]/Forex.getPipfactor(this.currencypair) );
        } else {
            return ( this.price - exitprice + Forex.Spreads[this.currencypair]/Forex.getPipfactor(this.currencypair) );
        }
    }
    , getWorth:function(timeline,property){    //Unrealized Restwert des Trades
        return this.ammount*this.getPipDifference(timeline,property);
    }
    , addRule: function(rule){ 
        rule.timeframe = rule.timeframe || this.timeframe;
        rule.currencypair = rule.currencypair || this.currencypair;
        if(!Forex.Rule.prototype.isPrototypeOf(rule)){ rule = Forex.Rule.create(rule); }
        this.rules.push(rule);
        return this;
    }
    , log:function(s){
        if(this.logEvents){
            this.events.push(s);
            this.timeline.log(s.message);
        }
    }
    , toFlotArray: function(){ //that way I can plot trades alongside with price timelines
        var r=[];
        for(var i=0;i<this.events.length;i++){
            var event = this.events[i];
            //RULE TRIGGER needs to be excluded here  //TODO OPEN evtl auch?
            if(event.type!=="RULE TRIGGER"){
                r.push([event.date,event.price]);
            }
        }
        return r;
    }
});

K.merge(Forex.Trade,{
    Type:{
          LONG:     "long"
        , SHORT:    "short"
    }
    , Status:{
          WAITING:  "waiting"
        , ACTIVE:   "active"
        , CLOSED:   "closed"
    }
});
