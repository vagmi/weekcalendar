/*
 * jQuery.weekCalendar v1.0-alpha-3
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
        *   Other options not in list below
        *   @height - function to calculate height of calendar - called on load and on window resize
        */
        
        options = $.extend({
            date: new Date(),
            businessHours : {start: 8, end: 18},
            startParam : "start",
            endParam : "end",
            newEventText : "New Event",
            timeslotHeight: 20,
            defaultEventLength : 2,
            timeslotsPerHour : 4,
            buttons : true,
            scrollToHourMillis : 500,
            buttonText : {
                today : "today",
                lastWeek : "&nbsp;&lt;&nbsp;",
                nextWeek : "&nbsp;&gt;&nbsp;"
            },
            draggable : function(calEvent, element) { return true;},
            resizable : function(calEvent, element) { return true;},
            eventClick : function(){},
            eventRender : function(calEvent, element) { return element;},
            eventDrop : function(calEvent, element){},
            eventResize : function(calEvent, element){},
            eventNew : function(calEvent, element) {},
            calendarBeforeLoad : function(calendar) {},
            calendarAfterLoad : function(calendar) {},
            noEvents : function() {}
            
            
        }, options);
        
        options.timeslotsPerDay = options.timeslotsPerHour * 24;
        options.millisPerTimeslot = MILLIS_IN_DAY / options.timeslotsPerDay;

        return this.each(function() {
        
            var $calendar = $(this);
            
            function refreshWeek() {
                clearCalendar($calendar);
                loadCalendar($calendar, $calendar.data("startDate")); //reload with existing week
            }
        
            function today() {
                clearCalendar($calendar);
                loadCalendar($calendar, new Date()); 
            }
        
            function prevWeek() {
                //minus more than 1 day to be sure we're in previous week - account for daylight savings or other anomolies
                var newDate = new Date($calendar.data("startDate").getTime() - (MILLIS_IN_WEEK / 6));
                clearCalendar($calendar);   
                loadCalendar($calendar, newDate);
            }
        
            function nextWeek() {
                //add 8 days to be sure of being in prev week - allows for daylight savings or other anomolies
                var newDate = new Date($calendar.data("startDate").getTime() + MILLIS_IN_WEEK + (MILLIS_IN_WEEK / 7));
                clearCalendar($calendar);
                loadCalendar($calendar, newDate); 
            }
        
            function gotoWeek(date) {
                clearCalendar($calendar);
                loadCalendar($calendar, date);
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
    
            renderCalendar($calendar);
            loadCalendar($calendar);
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


    
    function renderCalendar($calendar) {
        var options = $calendar.data("options");
        var $calendarContainer = $("<div class=\"week-calendar\">").appendTo($calendar);
        
        if(options.buttons) {
            var calendarNavHtml = "<div class=\"calendar-nav\">\
                <button class=\"today\">" + options.buttonText.today + "</button>\
                <button class=\"prev\">" + options.buttonText.lastWeek + "</button>\
                <button class=\"next\">" + options.buttonText.nextWeek + "</button>\
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
        
        var $weekDayColumns = $calendarContainer.find(".week-calendar-time-slots .day-column-inner");
        //var timeslotHeight = 20;
        var columnHeight = (options.timeslotHeight * options.timeslotsPerDay);
        $weekDayColumns.each(function(i, val) {
            $(this).height(columnHeight);   
        });
        $calendarContainer.find(".time-slot").height(options.timeslotHeight -1); //account for border
        
        var headerHeight = (options.timeslotHeight * options.timeslotsPerHour) - 11;
        
        $calendarContainer.find(".time-header-cell").css({
                height :  headerHeight,
                padding: 5
                });

        
        
    }
    
    function loadCalendar($calendar, date) {
        var options = $calendar.data("options");
        var events = [];
        var date = date || options.date;
        var firstDayOfWeek = dateFirstDayOfWeek(date);
        
        options.calendarBeforeLoad($calendar);

        $calendar.data("startDate", dateFirstDayOfWeek(firstDayOfWeek));
        var endDate = dateLastDayOfWeek(date)
        $calendar.data("endDate", dateLastMilliOfWeek(date));
        
        var currentDay = firstDayOfWeek;
        
        $calendar.find(".week-calendar-header td.day-column-header").each(function(i, val) {
                $(this).html(dayNames[i] + "<br/>" + monthNames[currentDay.getMonth()] + ", " + currentDay.getDate() + ", " + currentDay.getFullYear());
                if(isToday(currentDay)) {
                    $(this).addClass("today");
                } else {
                    $(this).removeClass("today");
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
            } else {
                $(this).parent().removeClass("today");
            }
            
            addDroppableToWeekDay($(this), $weekDayColumns, options);
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
                renderEvents(events, $weekDayColumns, $calendar);
                if (options.loading) options.loading(false);
            });
        }
        else if ($.isFunction(options.events)) {
            options.events(start, end,
                function(data) {
                    events = cleanEvents(data);
                    renderEvents(events, $weekDayColumns, $calendar);
                });
        }
        else if (options.events) {
            events = cleanEvents(options.events);
            renderEvents(events, $weekDayColumns, $calendar);
        }
        
        disableTextSelect($weekDayColumns);
        scrollToHour($calendar, new Date().getHours());
        
    }
    
    
    function renderEvents(events, $weekDayColumns, $calendar) {
        var options = $calendar.data("options");
        
        $.each(events, function(i, calEvent){
            var $weekDay = findWeekDayForEvent(calEvent, $weekDayColumns);
            if($weekDay) {
                renderEvent(calEvent, $weekDay, options);
            }
        }); 
        
        options.calendarAfterLoad($calendar);
        
        if(!events.length) {
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
        }
    }
    
    
    
    function renderEvent(calEvent, $weekDay, options) {

        var eventClass = calEvent.id ? "cal-event" : "cal-event new-cal-event";
        var eventHtml = "<div class=\"" + eventClass + " ui-corner-all\">\
            <div class=\"time ui-corner-all\"></div>\
            <div class=\"title\"><p></p></div></div>";
            
        var $calEvent = $(eventHtml);
        var $modEvent = options.eventRender(calEvent, $calEvent);
        $calEvent = $modEvent ? $modEvent.appendTo($weekDay) : $calEvent.appendTo($weekDay);
        $calEvent.css({lineHeight: (options.timeslotHeight - 2) + "px", fontSize: (options.timeslotHeight / 2) + "px"});
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
        
        return $calEvent;
        
    }
    
    function addDraggableSelectionToWeekDay($weekDay, options) {
        
         //var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
        
        $weekDay.mousedown(function(event){
            if($(this).data("mousedown.preventCreate")) {
                return;
            }

            var $newEvent = $("<div class=\"new-cal-event\"></div>");
            
            $newEvent.css({lineHeight: (options.timeslotHeight - 2) + "px", fontSize: (options.timeslotHeight / 2) + "px"});
            $(this).append($newEvent);

            var columnOffset = $(this).offset().top;
            var clickVerticalPosition = event.pageY - columnOffset;
            var rounded = (clickVerticalPosition - (clickVerticalPosition % options.timeslotHeight)) / options.timeslotHeight;
            var topPosition = rounded * options.timeslotHeight;
            $newEvent.css({top: topPosition});

            $(this).bind("mousemove.newevent", function(event){
                $newEvent.show();
                $newEvent.data("dragged", true);
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
                $(this).unbind("mousemove.newevent");
                $newEvent.addClass("ui-corner-all");
             });

          }).mouseup(function(){
             if($(this).data("mouseup.preventCreate") || $(this).data("preventClickEvent")) {
                return;
             }
             var $newEvent = $(this).find(".new-cal-event");
             //if even created from a single click only, default height
             if(!$newEvent.data("dragged")) {
                $newEvent.css({height: options.timeslotHeight * options.defaultEventLength}).show();
             }

             if($newEvent.length) {
                var top = parseInt($newEvent.css("top"));
                var eventDuration = getEventDurationFromPositionedEventElement($weekDay, $newEvent, top, options);
                $newEvent.remove();
                var newCalEvent = {start: eventDuration.start, end: eventDuration.end, title: options.newEventText};
                var $newEventEl = renderEvent(newCalEvent, $weekDay, options);
                
                options.eventNew(eventDuration, $newEventEl);
             }
         });
        
    }
    
    function getEventDurationFromPositionedEventElement($weekDay, $calEvent, top, options) {
         //var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
         var start = new Date($weekDay.data("startDate").getTime() + Math.round(top / options.timeslotHeight) * options.millisPerTimeslot);
         var end = new Date(start.getTime() + ($calEvent.height() / options.timeslotHeight) * options.millisPerTimeslot);
         return {start: start, end: end};
    }
    
    
    function addDroppableToWeekDay($weekDay, $weekDayColumns, options) {
        $weekDay.droppable({
            accept: ".cal-event",
            drop: function(event, ui) {
                var $calEvent = ui.draggable;
                //var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
                var top = Math.round(parseInt(ui.position.top));
                var eventDuration = getEventDurationFromPositionedEventElement($weekDay, $calEvent, top, options);
                var calEvent = $calEvent.data("calEvent");
                var newCalEvent = $.extend(true, {start: eventDuration.start, end: eventDuration.end}, calEvent);
                $calEvent.data("calEvent", newCalEvent);
                $calEvent.hide();
                
                var $newEvent = renderEvent(newCalEvent, $weekDay, options);
                
                options.eventDrop(newCalEvent, calEvent, $newEvent);
                            

                $newEvent.data("preventClickEvent", true);
                setTimeout(function(){
                    $newEvent.removeData("preventClickEvent");
                    $calEvent.remove(); // not sure why but delaying the remove fixes a bug in IE7
                }, 500);


                                
            }
        });
    }
    
    function addDraggableToCalEvent(calEvent, $calEvent, $weekDay, options) {
        //var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
        $calEvent.draggable({
            handle : ".time",
            containment: ".calendar-scrollable-grid",
            opacity: 0.5,
            grid : [$calEvent.outerWidth() + 1, options.timeslotHeight ]
        });
        
    }
    
    function addResizableToCalEvent(calEvent, $calEvent, $weekDay, options) {
        //var timeslotHeight = $weekDay.height() / options.timeslotsPerDay;
        $calEvent.resizable({
            grid: options.timeslotHeight,
            containment : $weekDay,
            handles: "s",
            minHeight: options.timeslotHeight,
            stop :function(event, ui){
                var $calEvent = ui.element;  
                var newEnd = new Date($calEvent.data("calEvent").start.getTime() + ($calEvent.height() / options.timeslotHeight) * options.millisPerTimeslot);
                var newCalEvent = $.extend(true, {start: calEvent.start, end: newEnd}, calEvent);
                refeshEventDetails(newCalEvent, $calEvent)
                options.eventResize(newCalEvent, calEvent, $calEvent);
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
            return new Date(d);
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
