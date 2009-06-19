/*
 * jQuery.weekCalendar v1.2.0-pre
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
 *   If you're after a monthly calendar plugin, checkout http://arshaw.com/fullcalendar/
 */
(function($) {
    
    var MILLIS_IN_DAY = 86400000;
    var MILLIS_IN_WEEK = MILLIS_IN_DAY * 7;
    var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var longMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    $.fn.weekCalendar = function(options) {
        
        if (typeof options == 'string') {
            var args = Array.prototype.slice.call(arguments, 1);
            this.each(function() {
                $.data(this, 'weekCalendar')[options].apply(this, args);
            });
            return this;
        }
         
        /*
        *   Other options not in list below
        *   @height - function to calculate height of calendar - called on load and on window resize
        */
        
        options = $.extend({
            date: new Date(),
            timeFormat : "h:i a",
            dateFormat : "M d, Y",
            shortDayNames: false,
            fromToTimeSeparator : " to ",
            startParam : "start",
            endParam : "end",
            businessHours : {start: 8, end: 18},
            onlyDisplayBusinessHours : false,
            newEventText : "New Event",
            timeslotHeight: 20,
            defaultEventLength : 2,
            timeslotsPerHour : 4,
            buttons : true,
            buttonText : {
                today : "today",
                lastWeek : "&nbsp;&lt;&nbsp;",
                nextWeek : "&nbsp;&gt;&nbsp;"
            },
            scrollToHourMillis : 500,
            allowCalEventOverlap : false,
            
            draggable : function(calEvent, element) { return true;},
            resizable : function(calEvent, element) { return true;},
            eventClick : function(){},
            eventRender : function(calEvent, element) { return element;},
            eventDrop : function(calEvent, element){},
            eventResize : function(calEvent, element){},
            eventNew : function(calEvent, element) {},
            eventMouseover : function(calEvent, $event) {},
            eventMouseout : function(calEvent, $event) {},
            calendarBeforeLoad : function(calendar) {},
            calendarAfterLoad : function(calendar) {},
            noEvents : function() {}
            
        }, options);

        
        return this.each(function() {
        
            var $calendar = $(this);
            
            function refreshWeek() {
                clearCalendar($calendar);
                loadCalEvents($calendar, $calendar.data("startDate")); //reload with existing week
            }
        
            function today() {
                clearCalendar($calendar);
                loadCalEvents($calendar, new Date()); 
            }
        
            function prevWeek() {
                //minus more than 1 day to be sure we're in previous week - account for daylight savings or other anomolies
                var newDate = new Date($calendar.data("startDate").getTime() - (MILLIS_IN_WEEK / 6));
                clearCalendar($calendar);   
                loadCalEvents($calendar, newDate);
            }
        
            function nextWeek() {
                //add 8 days to be sure of being in prev week - allows for daylight savings or other anomolies
                var newDate = new Date($calendar.data("startDate").getTime() + MILLIS_IN_WEEK + (MILLIS_IN_WEEK / 7));
                clearCalendar($calendar);
                loadCalEvents($calendar, newDate); 
            }
        
            function gotoWeek(date) {
                clearCalendar($calendar);
                loadCalEvents($calendar, date);
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
            
            function removeUnsavedEvents() {
                $calendar.find(".new-cal-event").fadeOut(function(){
                    $(this).remove();
                });
            }
            
            function updateEvent(calEvent) {
                updateEventInCalendar(calEvent, $calendar);
            }
            
            $(this).data('weekCalendar', {
                today: today,
                prevWeek: prevWeek,
                nextWeek: nextWeek,
                gotoWeek: gotoWeek,
                refresh: refreshWeek,
                removeEvent: removeEvent,
                updateEvent: updateEvent,
                removeUnsavedEvents : removeUnsavedEvents
            }).data('options', options);
    
            setupEventDelegation($calendar);
            renderCalendar($calendar);
            scrollToHour($calendar, new Date().getHours());
            loadCalEvents($calendar);
            resizeCalendar($calendar);
            
            $(window).unbind("resize.weekcalendar");
            $(window).bind("resize.weekcalendar", function(){
                resizeCalendar($calendar);
            });
            
            
            
            return $(this);
        });
    };
    
    function resizeCalendar($calendar) {
        var options = $calendar.data("options");
        if(options && $.isFunction(options.height)) {
            var calendarHeight = options.height($calendar);
            var headerHeight = $calendar.find(".week-calendar-header").outerHeight();
            var navHeight = $calendar.find(".calendar-nav").outerHeight();
            $calendar.find(".calendar-scrollable-grid").height(calendarHeight - navHeight - headerHeight);
        }
    }
    
    
    // Setup event delgation for standard click & mouseover events for calEvents and columns
    function setupEventDelegation($calendar) {
        
        $calendar.click(function(event) {
            var options = $calendar.data("options");
            var $target = $(event.target);
            if($target.data("preventClick")) {
                return;
            }
            if($target.hasClass("cal-event")) {
                options.eventClick($target.data("calEvent"), $target, event);
            } else if($target.parent().hasClass("cal-event")) {
                options.eventClick($target.parent().data("calEvent"), $target.parent(), event);
            }
        }).mouseover(function(event){
            var options = $calendar.data("options");
            var $target = $(event.target);
            
            if(isDraggingOrResizing($target)) {
                return;
            }
            
            if($target.hasClass("cal-event") ) {
                options.eventMouseover($target.data("calEvent"), $target, event);
            } 
        }).mouseout(function(event){
            var options = $calendar.data("options");
            var $target = $(event.target);
            if(isDraggingOrResizing($target)) {
                return;
            }
            if($target.hasClass("cal-event")) {
                if($target.data("sizing")) return;
                options.eventMouseout($target.data("calEvent"), $target, event);
               
            } 
        });
    } 
    
    function isDraggingOrResizing($target) {
        return $target.hasClass("ui-draggable-dragging") || $target.hasClass("ui-resizable-resizing");
    }
    
    //Render the main calendar layout
    function renderCalendar($calendar) {
        
        var options, $calendarContainer, calendarNavHtml, calendarHeaderHtml, calendarBodyHtml, $weekDayColumns;
        
        
        options = $calendar.data("options");
        
        if(options.onlyDisplayBusinessHours) {
            options.timeslotsPerDay = options.timeslotsPerHour * (options.businessHours.end - options.businessHours.start);
            options.millisToDisplay = (options.businessHours.end - options.businessHours.start) * 60 * 60 * 1000;
            options.millisPerTimeslot = options.millisToDisplay / options.timeslotsPerDay;
        } else {
            options.timeslotsPerDay = options.timeslotsPerHour * 24;
            options.millisToDisplay = MILLIS_IN_DAY;
            options.millisPerTimeslot = MILLIS_IN_DAY / options.timeslotsPerDay;
        }
            
        
        $calendarContainer = $("<div class=\"week-calendar\">").appendTo($calendar);
        
        if(options.buttons) {
            calendarNavHtml = "<div class=\"calendar-nav\">\
                <button class=\"today\">" + options.buttonText.today + "</button>\
                <button class=\"prev\">" + options.buttonText.lastWeek + "</button>\
                <button class=\"next\">" + options.buttonText.nextWeek + "</button>\
                </div>";
                
            $(calendarNavHtml).appendTo($calendarContainer);
            
            $calendarContainer.find(".calendar-nav .today").click(function(){
                $calendar.weekCalendar("today");
                return false;
            });
            
            $calendarContainer.find(".calendar-nav .prev").click(function(){
                $calendar.weekCalendar("prevWeek");
                return false;
            });
            
            $calendarContainer.find(".calendar-nav .next").click(function(){
                $calendar.weekCalendar("nextWeek");
                return false;
            });
            
        }
        
        //render calendar header
        calendarHeaderHtml = "<table class=\"week-calendar-header\"><tbody><tr><td class=\"time-column-header\"></td>"; 
        for(var i=1 ; i<=7; i++) {
            calendarHeaderHtml += "<td class=\"day-column-header day-" + i + "\"></td>";
        }
        calendarHeaderHtml += "<td class=\"scrollbar-shim\"></td></tr></tbody></table>";
                    
        //render calendar body
        calendarBodyHtml = "<div class=\"calendar-scrollable-grid\">\
            <table class=\"week-calendar-time-slots\">\
            <tbody>\
            <tr>\
            <td class=\"grid-timeslot-header\"></td>\
            <td colspan=\"7\">\
            <div class=\"time-slot-wrapper\">\
            <div class=\"time-slots\">";
        
        var start = options.onlyDisplayBusinessHours ? options.businessHours.start : 0;
        var end = options.onlyDisplayBusinessHours ? options.businessHours.end : 24;    
            
        for(var i = start ; i < end; i++) {
            for(var j=0;j<options.timeslotsPerHour - 1; j++) {
                calendarBodyHtml += "<div class=\"time-slot\"></div>";
            }   
            calendarBodyHtml += "<div class=\"time-slot hour-end\"></div>"; 
        }
        
        calendarBodyHtml += "</div></div></td></tr><tr><td class=\"grid-timeslot-header\">";
    
        for(var i = start ; i < end; i++) {

            var bhClass = (options.businessHours.start <= i && options.businessHours.end > i) ? "business-hours" : "";                 
            calendarBodyHtml += "<div class=\"hour-header " + bhClass + "\">\
                    <div class=\"time-header-cell\">" + hourForIndex(i) + "<span class=\"am-pm\">" + amOrPm(i) + "</span></div></div>";
        }
        
        calendarBodyHtml += "</td>";
        
        for(var i=1 ; i<=7; i++) {
            calendarBodyHtml += "<td class=\"day-column day-" + i + "\"><div class=\"day-column-inner\"></div></td>"
        }
        
        calendarBodyHtml += "</tr></tbody></table></div>";
        
        //append all calendar parts to container            
        $(calendarHeaderHtml + calendarBodyHtml).appendTo($calendarContainer);
        
        $weekDayColumns = $calendarContainer.find(".day-column-inner");
        $weekDayColumns.each(function(i, val) {
            $(this).height(options.timeslotHeight * options.timeslotsPerDay);  
            addDroppableToWeekDay($calendar, $(this), options);
            setupEventCreationForWeekDay($calendar, $(this));
        });
        
        $calendarContainer.find(".time-slot").height(options.timeslotHeight -1); //account for border
        
        $calendarContainer.find(".time-header-cell").css({
                height :  (options.timeslotHeight * options.timeslotsPerHour) - 11,
                padding: 5
                });

        
        
    }
    
    function setupEventCreationForWeekDay($calendar, $weekDay) {
        $weekDay.mousedown(function(event) {
            var options = $calendar.data("options");
            var $target = $(event.target);
            
            if($target.hasClass("day-column-inner")) {
                
                var $newEvent = $("<div class=\"cal-event new-cal-event new-cal-event-creating\"></div>");
            
                $newEvent.css({lineHeight: (options.timeslotHeight - 2) + "px", fontSize: (options.timeslotHeight / 2) + "px"});
                $target.append($newEvent);
    
                var columnOffset = $target.offset().top;
                var clickY = event.pageY - columnOffset;
                var clickYRounded = (clickY - (clickY % options.timeslotHeight)) / options.timeslotHeight;
                var topPosition = clickYRounded * options.timeslotHeight;
                $newEvent.css({top: topPosition});

                $target.bind("mousemove.newevent", function(event){
                    $newEvent.show();
                    $newEvent.addClass("ui-resizable-resizing");
                    var height = Math.round(event.pageY - columnOffset - topPosition);
                    var remainder = height % options.timeslotHeight;
                    //snap to closest timeslot
                    if(remainder < (height / 2)) { 
                        var useHeight = height - remainder;
                        $newEvent.css("height", useHeight < options.timeslotHeight ? options.timeslotHeight : useHeight);
                    } else {
                        $newEvent.css("height", height + (options.timeslotHeight - remainder));
                    }
                 }).mouseup(function(){
                    $target.unbind("mousemove.newevent");
                    $newEvent.addClass("ui-corner-all");
                 });
            }
        
        }).mouseup(function(event) {
            var options = $calendar.data("options");
            var $target = $(event.target);
           
            //if($target.hasClass("day-column-inner") || $target.hasClass(".new-cal-event-creating")) {
                
                //var $weekDay = $target.hasClass(".new-cal-event-creating") ? $target.closest(".day-column-inner") : $target;
                
                var $weekDay = $target.closest(".day-column-inner");
                
                var $newEvent = $weekDay.find(".new-cal-event-creating");
    
                 if($newEvent.length) {
                     //if even created from a single click only, default height
                    if(!$newEvent.hasClass("ui-resizable-resizing")) {
                        $newEvent.css({height: options.timeslotHeight * options.defaultEventLength}).show();
                    }
                    var top = parseInt($newEvent.css("top"));
                    var eventDuration = getEventDurationFromPositionedEventElement($weekDay, $newEvent, top, options);
                    $newEvent.remove();
                    var newCalEvent = {start: eventDuration.start, end: eventDuration.end, title: options.newEventText};
                    var $renderedCalEvent = renderEvent(newCalEvent, $weekDay, options);
                    adjustOverlappingEvents($weekDay, options); 
        
                    options.eventNew(eventDuration, $renderedCalEvent);
                 }
            //}
        });
    }
    
    
    function loadCalEvents($calendar, dateWithinWeek) {
        
        var options, date, weekStartDate, endDate, $weekDayColumns;
        
        options = $calendar.data("options");
        date = dateWithinWeek || options.date;
        weekStartDate = dateFirstDayOfWeek(date);
        weekEndDate = dateLastMilliOfWeek(date);
        
        options.calendarBeforeLoad($calendar);

        $calendar.data("startDate", weekStartDate);
        $calendar.data("endDate", weekEndDate);
        
        $weekDayColumns = $calendar.find(".day-column-inner");
        
        updateDayColumnHeader($calendar, $weekDayColumns, options);
        
        //load events by chosen means        
        if (typeof options.data == 'string') {
            if (options.loading) options.loading(true);
            var jsonOptions = {};
            jsonOptions[options.startParam || 'start'] = Math.round(weekStartDate.getTime() / 1000);
            jsonOptions[options.endParam || 'end'] = Math.round(weekEndDate.getTime() / 1000);
            $.getJSON(options.data, jsonOptions, function(data) {
                renderEvents(data, $weekDayColumns, $calendar);
                if (options.loading) options.loading(false);
            });
        }
        else if ($.isFunction(options.data)) {
            options.data(weekStartDate, weekEndDate,
                function(data) {
                    renderEvents(data, $weekDayColumns, $calendar);
                });
        }
        else if (options.data) {
            renderEvents(options.data, $weekDayColumns, $calendar);
        }
        
        disableTextSelect($weekDayColumns);
       
        
    }
    
    function updateDayColumnHeader($calendar, $weekDayColumns, options) {
        
        var currentDay = cloneDate($calendar.data("startDate"));

        $calendar.find(".week-calendar-header td.day-column-header").each(function(i, val) {
            
                var dayName = options.shortDayNames ? shortDays[i] : longDays[i];
            
                $(this).html(dayName + "<br/>" + formatDate(currentDay, options.dateFormat));
                if(isToday(currentDay)) {
                    $(this).addClass("today");
                } else {
                    $(this).removeClass("today");
                }
                currentDay = addDays(currentDay, 1);
            
        });
        
        currentDay = dateFirstDayOfWeek(cloneDate($calendar.data("startDate")));
        
        $weekDayColumns.each(function(i, val) {
            
            $(this).data("startDate", cloneDate(currentDay));
            $(this).data("endDate", new Date(currentDay.getTime() + (MILLIS_IN_DAY - 1)));          
            if(isToday(currentDay)) {
                $(this).parent().addClass("today");
            } else {
                $(this).parent().removeClass("today");
            }
            
            currentDay = addDays(currentDay, 1);
        });
        
    }
    
    
    function renderEvents(events, $weekDayColumns, $calendar) {
        var options = $calendar.data("options");
        var eventsToRender;
        
        if($.isArray(events)) {
            eventsToRender = cleanEvents(events);
        } else if(events.events) {
             eventsToRender = cleanEvents(events.events);
        }
        if(events.options) {
            
            var updateLayout = false;
            //check if any options have actually changed
            $.each(events.options, function(key, value){
                if(value !== options[key]) {
                    updateLayout = true;
                    return false;
                }
            });
            
            options = $.extend(options, events.options);
            
            if(options.onlyDisplayBusinessHours) {
	            options.timeslotsPerDay = options.timeslotsPerHour * (options.businessHours.end - options.businessHours.start);
	            options.millisToDisplay = (options.businessHours.end - options.businessHours.start) * 60 * 60 * 1000;
	            options.millisPerTimeslot = options.millisToDisplay / options.timeslotsPerDay;
	        } else {
	            options.timeslotsPerDay = options.timeslotsPerHour * 24;
                options.millisToDisplay = MILLIS_IN_DAY;
	            options.millisPerTimeslot = MILLIS_IN_DAY / options.timeslotsPerDay;
	        }
            
            if(updateLayout) {
                $calendar.empty();
                renderCalendar($calendar);
                $weekDayColumns = $calendar.find(".week-calendar-time-slots .day-column-inner");
                updateDayColumnHeader($calendar, $weekDayColumns, options);
                resizeCalendar($calendar);
            }
            
            $calendar.data("options", options);
        }
        
         
        $.each(eventsToRender, function(i, calEvent){
            
            var $weekDay = findWeekDayForEvent(calEvent, $weekDayColumns);
            
            if($weekDay) {
                renderEvent(calEvent, $weekDay, options);
            }
        });
        
        $weekDayColumns.each(function(){
            adjustOverlappingEvents($(this), options);
        });
        
        options.calendarAfterLoad($calendar);
        
        if(!eventsToRender.length) {
            options.noEvents();
        }
        
    }
    
    function renderEvent(calEvent, $weekDay, options) {
        
        if(calEvent.start.getTime() > calEvent.end.getTime()) {
            return; // can't render a negative height
        }
        
        var eventClass, eventHtml, $calEvent, $modifiedEvent;
        
        eventClass = calEvent.id ? "cal-event" : "cal-event new-cal-event";
        eventHtml = "<div class=\"" + eventClass + " ui-corner-all\">\
            <div class=\"time ui-corner-all\"></div>\
            <div class=\"title\"></div></div>";
            
        $calEvent = $(eventHtml);
        $modifiedEvent = options.eventRender(calEvent, $calEvent);
        $calEvent = $modifiedEvent ? $modifiedEvent.appendTo($weekDay) : $calEvent.appendTo($weekDay);
        $calEvent.css({lineHeight: (options.timeslotHeight - 2) + "px", fontSize: (options.timeslotHeight / 2) + "px"});
        
        refreshEventDetails(calEvent, $calEvent, options);
        positionEvent($weekDay, $calEvent, options);
        $calEvent.show();
        
        if(options.resizable(calEvent, $calEvent)) {
            addResizableToCalEvent(calEvent, $calEvent, $weekDay, options)
        }
        if(options.draggable(calEvent, $calEvent)) {
            addDraggableToCalEvent(calEvent, $calEvent, options);
        }
        
        return $calEvent;
        
    }
    
    function adjustOverlappingEvents($weekDay, options) {
        if(options.allowCalEventOverlap) {
            groupOverlappingEventElements($weekDay);
        }
    }
    
    
    function groupOverlappingEventElements($weekDay) {
        
        var $events = $weekDay.find(".cal-event");
        var sortedEvents = $events.sort(function(a, b){
            return $(a).data("calEvent").start.getTime() - $(b).data("calEvent").start.getTime();
        });
        
        var $lastEvent;
        var groups = [];
        var currentGroup = [];
        $.each(sortedEvents, function(){
            $(this).css({width: "100%", left: "", right: ""});
            if($lastEvent && $lastEvent.data("calEvent").end.getTime() > $(this).data("calEvent").start.getTime()) {
                if(!currentGroup.length) {
                   currentGroup.push($lastEvent);
                }
                currentGroup.push($(this));
            } else if(currentGroup.length) {
                    groups.push(currentGroup);
                    currentGroup = [];
            } 
            
            $lastEvent = $(this);
        });
        
        if(currentGroup.length) {
            groups.push(currentGroup);
        }
        
        $.each(groups, function(){
            $.each(this, function(i){
                if(i % 2 === 0) {
                    $(this).css({width: "70%", left: 0, right: ""});
                } else {
                    $(this).css({width: "70%", left: "", right: 0});
                }
            });
        })
        
    }
    
     function eventsOverlap(thisEvent, thatEvent) {
        
        //overlapping end time
        if(thisEvent.start.getTime() < currentCalEvent.end.getTime() 
                && thisEvent.end.getTime() >= thatEvent.end.getTime()) {
              
          return true;
        }
            
        //overlapping the start time
        if(thisEvent.end.getTime() > thatEvent.start.getTime() 
            && thisEvent.start.getTime() <= thatEvent.start.getTime()) {
          
          return true;
        }
        //has been dropped inside existing event with same or larger duration
        if(thisEvent.end.getTime() <= thatEvent.end.getTime() 
            && thisEvent.start.getTime() >= thatEvent.start.getTime()) {
               
           return true;
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
    
    
    function updateEventInCalendar(calEvent, $calendar) {
        var options = $calendar.data("options");
        cleanEvent(calEvent);
        var $calEvent;
        if(calEvent.id) {
            $calendar.find(".cal-event").each(function(){
                if($(this).data("calEvent").id === calEvent.id || $(this).hasClass("new-cal-event")) {
                    $(this).remove();
                    return false;
                }
            });
        }
        
        var $weekDay = findWeekDayForEvent(calEvent, $calendar.find(".week-calendar-time-slots .day-column-inner"));
        if($weekDay) {
            renderEvent(calEvent, $weekDay, options);
            adjustOverlappingEvents($weekDay, options);
        }
    }
    
    
    
    
    
    function positionEvent($weekDay, $calEvent, options) {
        
        var calEvent = $calEvent.data("calEvent");
        var pxPerMillis = $weekDay.height() / options.millisToDisplay;
        var firstHourDisplayed = options.onlyDisplayBusinessHours ? options.businessHours.start : 0;
        var startMillis = calEvent.start.getTime() - new Date(calEvent.start.getFullYear(), calEvent.start.getMonth(), calEvent.start.getDate(), firstHourDisplayed).getTime();
        var eventMillis = calEvent.end.getTime() - calEvent.start.getTime();    
        var pxTop = pxPerMillis * startMillis;
        var pxHeight = pxPerMillis * eventMillis;
        $calEvent.css({top: pxTop, height: pxHeight});
    }

    function getEventDurationFromPositionedEventElement($weekDay, $calEvent, top, options) {
        
         var startOffsetMillis = options.onlyDisplayBusinessHours ? options.businessHours.start * 60 *60 * 1000 : 0;
         var start = new Date($weekDay.data("startDate").getTime() + startOffsetMillis + Math.round(top / options.timeslotHeight) * options.millisPerTimeslot);
         var end = new Date(start.getTime() + ($calEvent.height() / options.timeslotHeight) * options.millisPerTimeslot);
         return {start: start, end: end};
    }
    
    
    function adjustForEventCollisions($weekDay, $calEvent, newCalEvent, oldCalEvent, options, maintainEventDuration) {
        if(options.allowCalEventOverlap) {
            return;
        }
        var adjustedStart, adjustedEnd;

        $weekDay.find(".cal-event").not($calEvent).each(function(){
            var currentCalEvent = $(this).data("calEvent");
            
            //has been dropped onto existing event overlapping the end time
            if(newCalEvent.start.getTime() < currentCalEvent.end.getTime() 
                && newCalEvent.end.getTime() >= currentCalEvent.end.getTime()) {
              
              adjustedStart = currentCalEvent.end; 
            }
            
            //has been dropped onto existing event overlapping the start time
            if(newCalEvent.end.getTime() > currentCalEvent.start.getTime() 
                && newCalEvent.start.getTime() <= currentCalEvent.start.getTime()) {
              
              adjustedEnd = currentCalEvent.start;  
            }
            //has been dropped inside existing event with same or larger duration
            if(newCalEvent.end.getTime() <= currentCalEvent.end.getTime() 
                && newCalEvent.start.getTime() >= currentCalEvent.start.getTime()) {
                   
                adjustedStart = oldCalEvent.start;
                adjustedEnd = oldCalEvent.end;
                return false;
            }
            
        });
        
        
        newCalEvent.start = adjustedStart || newCalEvent.start;
        
        if(adjustedStart && maintainEventDuration) {
            newCalEvent.end = new Date(adjustedStart.getTime() + (oldCalEvent.end.getTime() - oldCalEvent.start.getTime()));
            adjustForEventCollisions($weekDay, $calEvent, newCalEvent, oldCalEvent, options);
        } else {
            newCalEvent.end = adjustedEnd || newCalEvent.end;
        }
        
        
        
        //reset if new cal event has been forced to zero size
        if(newCalEvent.start.getTime() >= newCalEvent.end.getTime()) {
            newCalEvent.start = oldCalEvent.start;
            newCalEvent.end = oldCalEvent.end;
        }
        
        $calEvent.data("calEvent", newCalEvent);
    }
    
    
    function addDraggableToCalEvent(calEvent, $calEvent, options) {

        $calEvent.draggable({
            handle : ".time",
            containment: ".calendar-scrollable-grid",
            opacity: 0.5,
            grid : [$calEvent.outerWidth() + 1, options.timeslotHeight ]
        });
        
    }
    
    function addDroppableToWeekDay($calendar, $weekDay, options) {
        $weekDay.droppable({
            accept: ".cal-event",
            drop: function(event, ui) {
                var $calEvent = ui.draggable;
                var top = Math.round(parseInt(ui.position.top));
                var eventDuration = getEventDurationFromPositionedEventElement($weekDay, $calEvent, top, options);
                var calEvent = $calEvent.data("calEvent");
                var newCalEvent = $.extend(true, {start: eventDuration.start, end: eventDuration.end}, calEvent);
                adjustForEventCollisions($weekDay, $calEvent, newCalEvent, calEvent, options, true);
                var $weekDayColumns = $calendar.find(".day-column-inner");
                var $newEvent = renderEvent(newCalEvent, findWeekDayForEvent(newCalEvent, $weekDayColumns), options);
                $calEvent.hide();
                
                //trigger drop callback
                options.eventDrop(newCalEvent, calEvent, $newEvent);
                $calEvent.data("preventClick", true);
                setTimeout(function(){
                    $calEvent.remove();
                    adjustOverlappingEvents($weekDay, options);
                }, 500);
                                
            }
        });
    }
    
    function addResizableToCalEvent(calEvent, $calEvent, $weekDay, options) {
        $calEvent.resizable({
            grid: options.timeslotHeight,
            containment : $weekDay,
            handles: "s",
            minHeight: options.timeslotHeight,
            stop :function(event, ui){
                var $calEvent = ui.element;  
                var newEnd = new Date($calEvent.data("calEvent").start.getTime() + ($calEvent.height() / options.timeslotHeight) * options.millisPerTimeslot);
                var newCalEvent = $.extend(true, {start: calEvent.start, end: newEnd}, calEvent);
                adjustForEventCollisions($weekDay, $calEvent, newCalEvent, calEvent, options);
                
                refreshEventDetails(newCalEvent, $calEvent, options);
                positionEvent($weekDay, $calEvent, options);
                
                //trigger resize callback
                options.eventResize(newCalEvent, calEvent, $calEvent);
                $calEvent.data("preventClick", true);
                setTimeout(function(){
                    $calEvent.removeData("preventClick");
                }, 500);
            }
        });
    }
    
    
    function refreshEventDetails(calEvent, $calEvent, options) {
        
        $calEvent.find(".time").text(formatDate(calEvent.start, options.timeFormat) + options.fromToTimeSeparator + formatDate(calEvent.end, options.timeFormat));
        
        $calEvent.find(".title").text(calEvent.title);
        $calEvent.data("calEvent", calEvent);
    }
    
    function clearCalendar($calendar) {
        $calendar.find(".day-column-inner div").remove();
    }
    
    function scrollToHour($calendar, hour) {
        var options = $calendar.data("options");
        var $scrollable = $calendar.find(".calendar-scrollable-grid");
        var $target = $calendar.find(".grid-timeslot-header .hour-header:eq(" + hour + ")");
        
        $scrollable.animate({scrollTop: 0}, 0, function(){
            var targetOffset = $target.offset().top;
            var scroll = targetOffset - $scrollable.offset().top - $target.outerHeight();
            $scrollable.animate({scrollTop: scroll}, options.scrollToHourMillis);
        });
    }
    /*
    function formatAsTime(date) {
        return zeroPad(hourForIndex(date.getHours()), 2) + ":" + zeroPad(date.getMinutes(), 2) + " " + amOrPm(date.getHours());
    }*/

    function hourForIndex(index) {
        if(index === 0 ) { //midnight
            return 12; 
        } else if(index < 13) { //am
            return index;
        } else { //pm
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
    /*
    function zeroPad(number, size) {
        var length = ("" + number).length;
        var strNumber = "" + number;
        for(var i = 0; i<size - length; i++) {
            strNumber = "0" + strNumber;
        }
        return strNumber;
    }*/
    
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
            return parseISO8601(d, true) || Date.parse(d) || new Date(parseInt(d));
        if (typeof d == 'number')
            return new Date(d);
        return d;
    }
    
    function parseISO8601(s, ignoreTimezone) {
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
    
    
    /*
     * date formatting is adapted from 
     * http://jacwright.com/projects/javascript/date_format
     */
    function formatDate(date, format) {
        var returnStr = '';
        for (var i = 0; i < format.length; i++) {
            var curChar = format.charAt(i);
            if ($.isFunction(replaceChars[curChar])) {
                returnStr += replaceChars[curChar](date);
            } else {
                returnStr += curChar;
            }
        }
        return returnStr;
    }
    
	var replaceChars = {
	    
	    
	    // Day
	    d: function(date) { return (date.getDate() < 10 ? '0' : '') + date.getDate(); },
	    D: function(date) { return shortDays[date.getDay()]; },
	    j: function(date) { return date.getDate(); },
	    l: function(date) { return longDays[date.getDay()]; },
	    N: function(date) { return date.getDay() + 1; },
	    S: function(date) { return (date.getDate() % 10 == 1 && date.getDate() != 11 ? 'st' : (date.getDate() % 10 == 2 && date.getDate() != 12 ? 'nd' : (date.getDate() % 10 == 3 && date.getDate() != 13 ? 'rd' : 'th'))); },
	    w: function(date) { return date.getDay(); },
	    z: function(date) { return "Not Yet Supported"; },
	    // Week
	    W: function(date) { return "Not Yet Supported"; },
	    // Month
	    F: function(date) { return longMonths[date.getMonth()]; },
	    m: function(date) { return (date.getMonth() < 11 ? '0' : '') + (date.getMonth() + 1); },
	    M: function(date) { return shortMonths[date.getMonth()]; },
	    n: function(date) { return date.getMonth() + 1; },
	    t: function(date) { return "Not Yet Supported"; },
	    // Year
	    L: function(date) { return "Not Yet Supported"; },
	    o: function(date) { return "Not Supported"; },
	    Y: function(date) { return date.getFullYear(); },
	    y: function(date) { return ('' + date.getFullYear()).substr(2); },
	    // Time
	    a: function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
	    A: function(date) { return date.getHours() < 12 ? 'AM' : 'PM'; },
	    B: function(date) { return "Not Yet Supported"; },
	    g: function(date) { return date.getHours() % 12 || 12; },
	    G: function(date) { return date.getHours(); },
	    h: function(date) { return ((date.getHours() % 12 || 12) < 10 ? '0' : '') + (date.getHours() % 12 || 12); },
	    H: function(date) { return (date.getHours() < 10 ? '0' : '') + date.getHours(); },
	    i: function(date) { return (date.getMinutes() < 10 ? '0' : '') + date.getMinutes(); },
	    s: function(date) { return (date.getSeconds() < 10 ? '0' : '') + date.getSeconds(); },
	    // Timezone
	    e: function(date) { return "Not Yet Supported"; },
	    I: function(date) { return "Not Supported"; },
	    O: function(date) { return (date.getTimezoneOffset() < 0 ? '-' : '+') + (date.getTimezoneOffset() / 60 < 10 ? '0' : '') + (date.getTimezoneOffset() / 60) + '00'; },
	    T: function(date) { return "Not Yet Supported"; },
	    Z: function(date) { return date.getTimezoneOffset() * 60; },
	    // Full Date/Time
	    c: function(date) { return "Not Yet Supported"; },
	    r: function(date) { return date.toString(); },
	    U: function(date) { return date.getTime() / 1000; }
	};
    
    
    

    /*
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
    */
    

})(jQuery);
