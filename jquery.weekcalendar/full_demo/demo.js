

$(document).ready(function() {

    var $dialogContent = $("#event_edit_container");
    
	$('#calendar').weekCalendar({
		timeslotsPerHour : 4,
		allowCalEventOverlap : true,
		height : function($calendar) {
			return $(window).height() - $("h1").outerHeight();
		},
		eventRender : function(calEvent, $event) {
			if (calEvent.end.getTime() < new Date().getTime()) {
				$event.css("backgroundColor", "#aaa");
				$event.find(".time").css({
							"backgroundColor" : "#999",
							"border" : "1px solid #888"
						});
			}
		},
		eventNew : function(calEvent, $event) {
            
            $dialogContent.dialog({
                modal: true,
                title: "New Calendar Event",
                close: function() {
                   $dialogContent.dialog("destroy");
                   $dialogContent.hide();
                   $dialogContent.find("input").val("");
                   $('#calendar').weekCalendar("removeUnsavedEvents");
                },
                buttons: {
                    save : function(){},
                    cancel : function(){
                        $dialogContent.dialog("close");
                    }
                }
            }).show();
		},
		eventDrop : function(calEvent, $event) {
		},
		eventResize : function(calEvent, $event) {
		},
		eventClick : function(calEvent, $event) {
            
            $dialogContent.find("input[name='start']").val(calEvent.start);
            $dialogContent.find("input[name='end']").val(calEvent.end);
            $dialogContent.find("input[name='title']").val(calEvent.title);
            $dialogContent.find("input[name='description']").val(calEvent.description);
            
            $dialogContent.dialog({
                close: function() {
                   $dialogContent.dialog("destroy");
                   $dialogContent.hide();
                   $dialogContent.find("input").val("");
                   $('#calendar').weekCalendar("removeUnsavedEvents");
                },
                buttons: {
                    save : function(){},
                    cancel : function(){
                        $dialogContent.dialog("close");
                    }
                }
            }).show();
            
		},
		eventMouseover : function(calEvent, $event) {
		},
		eventMouseout : function(calEvent, $event) {
		},
		noEvents : function() {
		},
		data : []
	});
    
    

});