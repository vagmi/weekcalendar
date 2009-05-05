/*
 * jQuery.weekCalendar v1.0-alpha
 * http://www.redredred.com.au/
 *
 * Requires:
 * - jquery.weekcalendar.css
 * - jquery 1.3.x
 * - jquery-ui 1.7.x (drag, drop, resize)
 *
 * Copyright (c) 2009 Rob Monie
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *   
 *   Special thanks to Adam Shaw who's fullcalendar plugin (http://arshaw.com/fullcalendar/)
 *   inspired the creation of this plugin. 
 */
(function($) {
	
	var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
	var dayAbbrevs = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	var MILLIS_IN_DAY = 86400000;
	var MILLIS_IN_WEEK = MILLIS_IN_DAY * 7;

	$.fn.weekCalendar = function(options) {
		
		if (typeof options == 'string') {
			var args = Array.prototype.slice.call(arguments, 1);
			this.each(function() {
				$.data(this, 'weekCalendar')[options].apply(this, args);
			});
			return this;
		}
		
		/*
		*	Other options not in list below
		* 	@height - function to calculate height of calendar - called on load and on window resize
		*/
		
		options = $.extend({
			date: new Date(),
			businessHours : {start: 8, end: 18},
			startParam : "start",
			endParam : "end",
			newEventText : "New Event",
			defaultEventLength : 2,
			timeslotsPerHour : 4,
            buttons : true,
            buttonText : {
                today : "today",
                lastWeek : "&lt;",
                nextWeek : "&gt;"
            },
			draggable : function(calEvent, element) { return true;},
			resizable : function(calEvent, element) { return true;},
			eventClick : function(){},
			eventRender : function(calEvent, element) { return element;},
			eventDrop : function(calEvent, element){},
			eventResize : function(calEvent, element){},
			eventNew : function(calEvent, element) {},
			calendarRendered : function(calendar) {},
            noEvents : function() {}
			
			
		}, options);
		
		options.timeslotsPerDay = options.timeslotsPerHour * 24;
		options.millisPerTimeslot = MILLIS_IN_DAY / options.timeslotsPerDay;

		this.each(function() {
		
			var $calendar = $(this);
			
			function refreshWeek() {
				clearCalendar($calendar);
				loadCalendar($calendar, options, $calendar.data("startDate")); //reload with existing week
			}
		
			function today() {
				clearCalendar($calendar);
				loadCalendar($calendar, options, new Date()); 
			}
		
			function prevWeek() {
				var newDate = new Date($calendar.data("startDate").getTime() - MILLIS_IN_WEEK);
				clearCalendar($calendar);	
				loadCalendar($calendar, options, newDate);
			}
		
			function nextWeek() {
				var newDate = new Date($calendar.data("startDate").getTime() + MILLIS_IN_WEEK);
				clearCalendar($calendar);
				loadCalendar($calendar, options, newDate); 
			}
		
			function gotoWeek(date) {
				clearCalendar($calendar);
				loadCalendar($calendar, options, date);
			}
			
			function removeEvent(eventId) {
				$calendar.find(".cal-event").each(function(){
					if($(this).data("calEvent").id === eventId) {
						$(this).fadeOut(function(){
							$(this).remove();
						});
						return false;
					}
				});
			}
			
			function updateEvent(calEvent) {
				updateEventInCalendar(calEvent, options, $calendar);
			}
			
			$.data(this, 'weekCalendar', {
				today: today,
				prevWeek: prevWeek,
				nextWeek: nextWeek,
				gotoWeek: gotoWeek,
				refresh: refreshWeek,
				removeEvent: removeEvent,
				updateEvent: updateEvent
			});
	
			renderCalendar($calendar, options);
			loadCalendar($calendar, options);
			resizeCalendar($calendar, options);

			options.calendarRendered($calendar);
			
			$(window).resize(function(){
				resizeCalendar($calendar, options);
			});
			
			return $(this);
		});
	};
	
	
	function resizeCalendar($calendar, options) {
		if($.isFunction(options.height)) {
			var calendarHeight = options.height($calendar);
			var headerHeight = $calendar.find(".week-calendar-header").outerHeight();
            var navHeight = $calendar.find(".calendar-nav").outerHeight();
			$calendar.find(".calendar-scrollable-grid").height(calendarHeight - navHeight - headerHeight);
		}
		
	}


	
	function renderCalendar($calendar, options) {
		var $calendarContainer = $("<div class=\"week-calendar\">").appendTo($calendar);
		
        if(options.buttons) {
            var calendarNavHtml = "<div class=\"calendar-nav\">\
                <button class=\"today ui-state-default ui-corner-all\">" + options.buttonText.today + "</button>\
                <button class=\"prev ui-state-default ui-corner-all\">" + options.buttonText.lastWeek + "</button>\
                <button class=\"next ui-state-default ui-corner-all\">" + options.buttonText.nextWeek + "</button>\
                </div>";
                
            $(calendarNavHtml).appendTo($calendarContainer);
            
            $calendarContainer.find(".calendar-nav .today").click(function(){
                $calendar.weekCalendar("today");
            });
            
            $calendarContainer.find(".calendar-nav .prev").click(function(){
                $calendar.weekCalendar("prevWeek");
            });
            
            $calendarContainer.find(".calendar-nav .next").click(function(){
                $calendar.weekCalendar("nextWeek");
            });
            
        }
        
		//render calendar header
		var calendarHeaderHtml = "<table class=\"week-calendar-header\"><tbody><tr><td class=\"time-column-header\"></td>"; 
		for(var i=1 ; i<=7; i++) {
			calendarHeaderHtml += "<td class=\"day-column-header day-" + i + "\"></td>";
		}
		calendarHeaderHtml += "<td class=\"scrollbar-shim\"></td></tr></tbody></table>";
					
		//var $calendarHeader = $(calendarHeaderHtml);			

		//render calendar body
		
		var calendarBodyHtml = "<div class=\"calendar-scrollable-grid\">\
			<table class=\"week-calendar-time-slots\">\
			<tbody>\
			<tr>\
			<td class=\"grid-timeslot-header\"></td>\
			<td colspan=\"7\">\
			<div class=\"time-slot-wrapper\">\
			<div class=\"time-slots\">";
			
		for(var i=0 ; i<24; i++) {
			for(var j=0;j<options.timeslotsPerHour - 1; j++) {
				calendarBodyHtml += "<div class=\"time-slot\"></div>";
			}	
			calendarBodyHtml += "<div class=\"time-slot hour-end\"></div>";	
		}
		
		calendarBodyHtml += "</div></div></td></tr><tr><td class=\"grid-timeslot-header\">";
	
		for(var i=0 ; i<24; i++) {

			var bhClass = (options.businessHours.start <= i && options.businessHours.end >= i) ? "business-hours" : "";					
			calendarBodyHtml += "<div class=\"hour-header " + bhClass + "\" id=\"hour-header-" + i + "\">\
					<div class=\"time-header-cell\">" + hourForIndex(i) + "<span class=\"am-pm\">" + amOrPm(i) + "</span></div></div>";
		}
		
		calendarBodyHtml += "</td>";
		
		for(var i=1 ; i<=7; i++) {
			calendarBodyHtml += "<td class=\"day-column day-" + i + "\"><div class=\"day-column-inner\"></div></td>"
		}
		
		calendarBodyHtml += "</tr></tbody></table></div>";
		
		//append all calendar parts to container			
		$(calendarHeaderHtml + calendarBodyHtml).appendTo($calendarContainer);
		
		var $weekDayColumns = $calendarContainer.find(".week-calendar-time-slots .day-column-inner");
		var columnHeight;
		var timeslotHeight;
		$weekDayColumns.each(function(i, val) {
			if(i==0) {
				columnHeight = $(this).parent().height();
				timeslotHeight = columnHeight / options.timeslotsPerDay;
			}
			$(this).height(columnHeight);	
		});
		$calendarContainer.find(".time-slot").height(timeslotHeight -1); //account for border
		$calendarContainer.find(".time-header-cell").outerHeight((timeslotHeight * options.timeslotsPerHour));
		//((timeslotHeight * options.timeslotsPerHour) - (timeslotHeaderPadding * 2 ) + 2)	
		
	}
	
	function loadCalendar($calendar, options, date) {
		
		var date = date || options.date;
		
		var firstDayOfWeek = dateFirstDayOfWeek(date);

		$calendar.data("startDate", dateFirstDayOfWeek(firstDayOfWeek));
		var endDate = dateLastDayOfWeek(date)
		$calendar.data("endDate", dateLastMilliOfWeek(date));
		
		var currentDay = firstDayOfWeek;
		
		$calendar.find(".week-calendar-header td.day-column-header").each(function(i, val) {
				$(this).html(dayNames[i] + "<br/>" + monthNames[currentDay.getMonth()] + ", " + currentDay.getDate() + ", " + currentDay.getFullYear());
				if(isToday(currentDay)) {
                    $(this).addClass("today");
                }
                currentDay = addDays(currentDay, 1);
			
		});
		
		currentDay = dateFirstDayOfWeek(date);

		var $weekDayColumns = $calendar.find(".week-calendar-time-slots .day-column-inner");
		$weekDayColumns.each(function(i, val) {
            
			$(this).data("startDate", cloneDate(currentDay));
			$(this).data("endDate", new Date(currentDay.getTime() + (MILLIS_IN_DAY - 1)));			
			if(isToday(currentDay)) {
                $(this).parent().addClass("today");
            }
			
			addDroppableToWeekDay($(this), options);
			addDraggableSelectionToWeekDay($(this), options)
			
			currentDay = addDays(currentDay, 1);
			
		});
		
		
		
		var start = $calendar.data("startDate");
		var end = $calendar.data("endDate");
		
		if (typeof options.events == 'string') {
			if (options.loading) options.loading(true);
			var jsonOptions = {};
			jsonOptions[options.startParam || 'start'] = Math.round(start.getTime() / 1000);
			jsonOptions[options.endParam || 'end'] = Math.round(end.getTime() / 1000);
			$.getJSON(options.events, jsonOptions, function(data) {
				events = cleanEvents(data);
				renderEvents(events, $weekDayColumns, options);
				if (options.loading) options.loading(false);
			});
		}
		else if ($.isFunction(options.events)) {
			options.events(start, end,
				function(data) {
					events = cleanEvents(data);
					renderEvents(events, $weekDayColumns, options);
				});
		}
		else if (options.events) {
			renderEvents(cleanEvents(options.events), $weekDayColumns, options);
		}
		
		disableTextSelect($weekDayColumns);
		
	}
	
	
	function renderEvents(events, $weekDayColumns, options) {
        
			$.each(events, function(i, calEvent){
				var $weekDay = findWeekDayForEvent(calEvent, $weekDayColumns);
				if($weekDay) {
					renderEvent(calEvent, $weekDay, options);
				}
			});	
        if(!$weekDayColumns.find("cal-event:first").length) {
            options.noEvents();
        }
		
	}
	
	function findWeekDayForEvent(calEvent, $weekDayColumns) {
	
		var $weekDay;
		$weekDayColumns.each(function(){
			if($(this).data("startDate").getTime() <= calEvent.start.getTime() && $(this).data("endDate").getTime() >= calEvent.end.getTime()) {
				$weekDay = $(this);
				return false;
			} 
		});	
		
		return $weekDay;
	}
	
	function updateEventInCalendar(calEvent, options, $calendar) {
		cleanEvent(calEvent);
		var $calEvent;
		$calendar.find(".cal-event").each(function(){
			if($(this).data("calEvent").id === calEvent.id) {
				$(this).remove();
				return false;
			}
		});
		
		var $weekDay = findWeekDayForEvent(calEvent, $calendar.find(".week-calendar-time-slots .day-column-inner"));
		if($weekDay) {
			renderEvent(calEvent, $weekDay, options);
		}
	}
	
	
	
	function renderEvent(calEvent, $weekDay, options) {
		
		var eventHtml = "<div class=\"cal-event ui-corner-all\">\
			<div class=\"time ui-corner-all\"></div>\
			<div class=\"title\"><p></p></div></div>";
		
		var $calEvent = options.eventRender(calEvent, $(eventHtml)).appendTo($weekDay);

		refeshEventDetails(calEvent, $calEvent);
		
		//position the event
		var pxPerMillis = $weekDay.height() / MILLIS_IN_DAY;	
		var startMillisFromStartOfDay = calEvent.start.getTime() - new Date(calEvent.start.getFullYear(), calEvent.start.getMonth(), calEvent.start.getDate()).getTime();
		var eventMillis = calEvent.end.getTime() - calEvent.start.getTime();	
		var pxTop = pxPerMillis * startMillisFromStartOfDay;
		var pxHeight = pxPerMillis * eventMillis;
		$calEvent.css({top: pxTop, height: pxHeight}).show();
		
		//prevent mousedown / up / click when clicking on an event
		$calEvent.mousedown(function(event) {
			$weekDay.data("mousedown.preventCreate", true);
		    setTimeout(function(){
				$weekDay.removeData("mousedown.preventCreate");
		    }, 500);
		}).mouseup(function(event) {
		    $weekDay.data("mouseup.preventCreate", true);
		    setTimeout(function(){
		        $weekDay.removeData("mouseup.preventCreate");
		    }, 500);
		});
		
		$calEvent.click(function(event) {
			if(!$calEvent.data("preventClickEvent")) {
				options.eventClick(calEvent, $calEvent, event);
			}
		}).mouseover(function(event){
            options.eventMouseover(calEvent, $calEvent, event);
        }).mouseout(function(event){
            options.eventMouseout(calEvent, $calEvent, event);
        });
		
		
		
		if(options.resizable(calEvent, $calEvent)) {
			addResizableToCalEvent(calEvent, $calEvent, $weekDay, options)
		}
		if(options.draggable(calEvent, $calEvent)) {
			addDraggableToCalEvent(calEvent, $calEvent, $weekDay, options);
		}
		
		$calEvent.click(function(){
			options.eventClick(calEvent, $calEvent);
		});
		
		return $calEvent;
		
	}
	
	function addDraggableSelectionToWeekDay($weekDay, options) {
		
		 var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
		
		$weekDay.mousedown(function(event){
			if($(this).data("mousedown.preventCreate")) {
		    	return;
		    }

		    var $newEvent = $("<div class=\"new-cal-event \"><div>" + options.newEventText + "</div></div>");
		    $(this).append($newEvent);

		    var columnOffset = $(this).offset().top;
		    var clickVerticalPosition = event.pageY - columnOffset;
		    var rounded = (clickVerticalPosition - (clickVerticalPosition % timeslotHeight)) / timeslotHeight;
		    var topPosition = rounded * timeslotHeight;
		    $newEvent.css({top: topPosition});

		    $(this).bind("mousemove.newevent", function(event){
		    	$newEvent.show();
		        $newEvent.data("dragged", true);
		        var height = Math.round(event.pageY - columnOffset - topPosition);
		       	var remainder = height % timeslotHeight;
		        //snap to closest timeslot
		       	if(remainder < (height / 2)) { 
		        	var useHeight = height - remainder;
		            $newEvent.css("height", useHeight < timeslotHeight ? timeslotHeight : useHeight);
		        } else {
		            $newEvent.css("height", height + (timeslotHeight - remainder));
		        }
		     }).mouseup(function(){
		        $(this).unbind("mousemove.newevent");
		        $newEvent.addClass("ui-corner-all");
		     });

		  }).mouseup(function(){
		     if($(this).data("mouseup.preventCreate")) {
		     	return;
		     }
		     var $newEvent = $(this).find(".new-cal-event");
			 //if even created from a single click only, default height
		     if(!$newEvent.data("dragged")) {
		     	$newEvent.css({height: timeslotHeight * options.defaultEventLength}).show();
		     }

		     if($newEvent.length) {
		       	var top = parseInt($newEvent.css("top"));
		       	var eventDuration = getEventDurationFromPositionedEventElement($weekDay, $newEvent, top, options);
		        options.eventNew(eventDuration, $newEvent);
             }
         });
		
	}
	
	function getEventDurationFromPositionedEventElement($weekDay, $calEvent, top, options) {
		 var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
		 var start = new Date($weekDay.data("startDate").getTime() + Math.round(top / timeslotHeight) * options.millisPerTimeslot);
	     var end = new Date(start.getTime() + ($calEvent.height() / timeslotHeight) * options.millisPerTimeslot);
		 return {start: start, end: end};
	}
	
	
	function addDroppableToWeekDay($weekDay, options) {
		$weekDay.droppable({
			accept: ".cal-event",
		    drop: function(event, ui) {
		    	var $calEvent = ui.draggable;
		        var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
		        var top = Math.round(parseInt(ui.position.top));
		        var eventDuration = getEventDurationFromPositionedEventElement($weekDay, $calEvent, top, options);
				var calEvent = $calEvent.data("calEvent");
				calEvent.start = eventDuration.start;
				calEvent.end = eventDuration.end;
				var $newEvent = renderEvent(calEvent, $weekDay, options);
				options.eventDrop(calEvent, $newEvent);
				$calEvent.remove();

		        $calEvent.data("preventClickEvent", true);
		        setTimeout(function(){$calEvent.removeData("preventClickEvent");}, 500);

		                        
			}
		});
	}
	
	function addDraggableToCalEvent(calEvent, $calEvent, $weekDay, options) {
		var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
		$calEvent.draggable({
	       	handle : ".time",
         	containment: ".calendar-scrollable-grid",
	        opacity: 0.5,
	        grid : [$calEvent.outerWidth() + 1, timeslotHeight ]
       	});
		
	}
	
	function addResizableToCalEvent(calEvent, $calEvent, $weekDay, options) {
		var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
		$calEvent.resizable({
	    	grid: timeslotHeight,
	        containment : $weekDay,
	        handles: "s",
	        minHeight: timeslotHeight,
	        stop :function(event, ui){
	        	var $calEvent = ui.element;  
	
	 			var newEnd = new Date($calEvent.data("calEvent").start.getTime() + ($calEvent.height() / timeslotHeight) * options.millisPerTimeslot);
				calEvent.end = newEnd;
				refeshEventDetails(calEvent, $calEvent)
	    		options.eventResize(calEvent, $calEvent);
	            $calEvent.data("preventClickEvent", true);
	            setTimeout(function(){
					$calEvent.removeData("preventClickEvent");}, 500);
	             }
	    });
	}
	
	
	function refeshEventDetails(calEvent, $calEvent) {
		$calEvent.data("calEvent", calEvent);
		$calEvent.find(".time").text(formatAsTime(calEvent.start) + " to " +  formatAsTime(calEvent.end));
		$calEvent.find(".title p").text(calEvent.title);
	}
	
	function clearCalendar($calendar) {
		$calendar.find(".day-column-inner div").remove();
	}
	
	function formatAsTime(date) {
		return zeroPad(hourForIndex(date.getHours()), 2) + ":" + zeroPad(date.getMinutes(), 2) + " " + amOrPm(date.getHours());
	}

	function hourForIndex(index) {
		if(index === 0 ) {
			return 12;
		} else if(index < 13) {
			return index;
		} else {
			return index - 12;
		}
	}
	
	function amOrPm(hourOfDay) {
		return hourOfDay < 12 ? "AM" : "PM";
	}
    
    function isToday(date) {
        var clonedDate = cloneDate(date);
        clearTime(clonedDate);
        var today = new Date();
        clearTime(today);
        return today.getTime() === clonedDate.getTime();
    }

	function cleanEvents(events) {
		$.each(events, function(i, event) {
			cleanEvent(event);
		});
		return events;
	}
	
	function cleanEvent(event) {
		if (event.date) event.start = event.date;
		event.start = cleanDate(event.start);
		event.end = cleanDate(event.end);
		if (!event.end) event.end = addDays(cloneDate(event.start), 1);
	}

	function disableTextSelect($elements) {
		$elements.each(function(){
		            if($.browser.mozilla){//Firefox
		                $(this).css('MozUserSelect','none');
		            }else if($.browser.msie){//IE
		                $(this).bind('selectstart',function(){return false;});
		            }else{//Opera, etc.
		                $(this).mousedown(function(){return false;});
		            }
		        });
	}

	
	// date utils

	function dateFirstDayOfWeek(date) {
		
		var midnightCurrentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		var currentDayOfWeek = midnightCurrentDate.getDay();
		var millisToSubtract = currentDayOfWeek * 86400000;
		return new Date(midnightCurrentDate.getTime() - millisToSubtract);
		
	}
	
	function dateLastDayOfWeek(date) {
		var midnightCurrentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		var currentDayOfWeek = midnightCurrentDate.getDay();
		var millisToAdd = (6 - currentDayOfWeek) * MILLIS_IN_DAY;
		return new Date(midnightCurrentDate.getTime() + millisToAdd);
	}
	
	function dateLastMilliOfWeek(date) {
		var lastDayOfWeek = dateLastDayOfWeek(date);
		return new Date(lastDayOfWeek.getTime() + (MILLIS_IN_DAY - 1));
		
	}
	
	function zeroPad(number, size) {
		var length = ("" + number).length;
		var strNumber = "" + number;
		for(var i = 0; i<size - length; i++) {
			strNumber = "0" + strNumber;
		}
		return strNumber;
	}
    
    function clearTime(d) {
        d.setHours(0); 
        d.setMinutes(0);
        d.setSeconds(0); 
        d.setMilliseconds(0);
        return d;
    }
	
	function addDays(d, n, keepTime) {
		d.setDate(d.getDate() + n);
		if (keepTime) return d;
		return clearTime(d);
	}
	
	
	
	function cloneDate(d) {
		return new Date(+d);
	}
	
	function cleanDate(d) {
		if (typeof d == 'string')
			return $.parseISO8601(d, true) || Date.parse(d) || new Date(parseInt(d));
		if (typeof d == 'number')
			return new Date(d * 1000);
		return d;
	}
	
	$.parseISO8601 = function(s, ignoreTimezone) {
		// derived from http://delete.me.uk/2005/03/iso8601.html
		var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
		    "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
		    "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
		var d = s.match(new RegExp(regexp));
		if (!d) return null;
		var offset = 0;
		var date = new Date(d[1], 0, 1);
		if (d[3]) { date.setMonth(d[3] - 1); }
		if (d[5]) { date.setDate(d[5]); }
		if (d[7]) { date.setHours(d[7]); }
		if (d[8]) { date.setMinutes(d[8]); }
		if (d[10]) { date.setSeconds(d[10]); }
		if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
		if (!ignoreTimezone) {
			if (d[14]) {
				offset = (Number(d[16]) * 60) + Number(d[17]);
				offset *= ((d[15] == '-') ? 1 : -1);
			}
			offset -= date.getTimezoneOffset();
		}
		return new Date(Number(date) + (offset * 60 * 1000));
	};

	$.ISO8601String = function(date) {
		// derived from http://delete.me.uk/2005/03/iso8601.html
		var zeropad = function (num) { return ((num < 10) ? '0' : '') + num; }
		return date.getUTCFullYear() +
			"-" + zeropad(date.getUTCMonth() + 1) +
			"-" + zeropad(date.getUTCDate()) +
			"T" + zeropad(date.getUTCHours()) +
			":" + zeropad(date.getUTCMinutes()) +
			":" + zeropad(date.getUTCSeconds()) +
			"Z";
	};
	
	

})(jQuery);
