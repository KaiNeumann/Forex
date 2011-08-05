"use strict";
K.require("Forex.Strategy.js",function(){

Forex.Strategy.UI = K.Base.subclass({
    _init:function(o){
        K.merge(this,{
              id:           "FOREX_UI_"+o.id
            , outputId:     o.outputId || null
            , parent:       o
            , criteria:     "balance"        //which criteria will be used to sort iteration results and shown
        });
        this.build();
        return this;
    }
    , build:function(){
        K.clearElement(this.id);
        var _this = this;
        var $KDE = K.createElement, $KDA = K.createAttribute;
        var divparam,divstrategy,diviteration,divsimulation;
        var div = K.createElement("div",
            , divparam = K.createElement("div",{id:this.id+"_divparam"})
            , divstrategy = K.createElement("div",{id:this.id+"_divstrategy"})
            , diviteration = K.createElement("div",{id:this.id+"_diviteration"})
            , divsimulation = K.createElement("div",{id:this.id+"_divsimulation"})
        );
        
        var criteria = Forex.Strategy.Statistic.max_criteria.concat(Forex.Strategy.Statistic.min_criteria);
        //TODO Select Input für criteria
        //TODO Select if best of last iteration or all iterations
        
        //TODO Single Line for Parameter(-Hash) Input
        var paramDiv = $KDE("div", {"id":this.id,style:"float:right;"}
            /*            Value        Range                                Change
                param1 [ act val ]    [\/] from,to,step ] [        ]        [\/] random ]
                param2 [  with   ]    [\/] mid,+/-,step ] [        ]        [\/] no change ]
                param3 [ tooltip ]    [\/] csv values     ]    [        ]        [\/] ordered ]
            */            
            , this.parameter.map(function(p){
                var d = p.defaultValues, defaultValues="";
                if(K.isDefined(d.values)){
                    defaultValues = d.values;
                }else if(K.isDefined(d.from) && K.isDefined(d.to)){
                    defaultValues = ""+d.from+","+d.to;
                    if(K.isDefined(d.step)){
                        defaultValues += ","+d.step;
                    }
                }else if(K.isDefined(d.middle) && K.isDefined(d.around)){
                    defaultValues = ""+d.middle+","+d.around;
                    if(K.isDefined(d.step)){
                        defaultValues += ","+d.step;
                    }
                }
                return $KDE("div",
                      $KDE("span", p.name, {
                          style:    "float:left;width:9em;border:1px solid black;"
                        , title:    p.description
                    } )
                    , $KDE("input", {
                          type:     "text"
                        , size:     5
                        , id:       this.id+"_"+p.name+"_value"
                        , value:    ""+p.defaultValues.value
                    } ) 
                            //TODO tooltip description
                    , $KDE("select", {style:"width:120px;",id:this.id+"_"+p.name+"_rangetype"}
                        , $KDE("option",{value:"range"},"from, to (,step)", d.from ? $KDA("selected","selected") : null )
                        , $KDE("option",{value:"around"},"middle,+/- (,step)", d.middle ? $KDA("selected","selected") : null )
                        , $KDE("option",{value:"csv"},"value list", d.values ? $KDA("selected","selected") : null )
                        , $KDE("option",{value:"none"},"fixed value" )
                    )
                    , $KDE("input", {
                          type:     "text"
                        , size:     12
                        , id:       this.id+"_"+p.name+"_rangevalues"
                        , value:    defaultValues
                    } )
                    , $KDE("select", {style:"width:100px;",id:this.id+"_"+p.name+"_changemethod"}
                        , $KDE("option",$KDA("value","none"),"fixed")
                        , $KDE("option",$KDA("value","ordered"),"ordered")
                        , $KDE("option",$KDA("value","random"),"random",$KDA("selected","selected"))
                    )
                );
            },this)
            , $KDE("input", {type:"text", size:5, id:this.id+"_iterations", value:10} )
            , $KDE("input", {type:"button", value:"Iterate!", id:this.id+"_button", 
                click:function(){ _this.parent.iterate(); }}
            )
            , " or "
            , $KDE("input", {type:"button", value:"Run once with eventlog", id:this.id+"_button", 
                    click:function(){ _this.parent.runonce(); }} 
            )
        );
        
        return div;
    }
    , getParamChangeMethod: function(pname){ return document.getElementById(this.id+"_"+pname+"_changemethod").value; }
    , getParamRangeType:    function(pname){ return document.getElementById(this.id+"_"+pname+"_rangetype").value; }
    , getParamRangeValues:  function(pname){ return document.getElementById(this.id+"_"+pname+"_rangevalues").value; }
    , getParamValue:        function(pname){ return document.getElementById(this.id+"_"+pname+"_value").value; }
    , setParamValue:        function(pname,value){ return document.getElementById(this.id+"_"+pname+"_value").value = value; }
    , updateParameterSet:   function(statistic){
        var best = statistic.getBestSimulation(this.criteria).parameter;
        for(var name in best){ if(best.hasOwnProperty(name)){
            this.setParamValue(name,best[name]);
        }}
    }
    , getCriteriaForBestIteration: function(){ return document.getElementById(this.id+"_criteria").value; }
    , insertSimulationResult: function(div){
        K.clearElement(this.id+"_divsimulation").appendChild(div);
    }
});

});//end require