/*
 * jQuery.weekCalendar v1.2.0
 * http://www.redredred.com.au/
 *
 * Requires:
 * - jquery.weekcalendar.css
 * - jquery 1.3.x
 * - jquery-ui 1.7.x (widget, drag, drop, resize)
 *
 * Copyright (c) 2009 Rob Monie
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *   
 *   If you're after a monthly calendar plugin, check out http://arshaw.com/fullcalendar/
 */

(function($) {

	$.widget("ui.weekCalendar", {
		
        /***********************
         * Initialise calendar *
         ***********************/
	    _init : function() {
            var self = this;
            self._computeOptions();
            self._setupEventDelegation();
            self._renderCalendar();
            self._scrollToHour(new Date().getHours());
            self._loadCalEvents();
            self._resizeCalendar();
            
            $(window).unbind("resize.weekcalendar");
            $(window).bind("resize.weekcalendar", function(){
                self._resizeCalendar();
            });
            
        },
        
        /********************
         * public functions *
         ********************/
        /*
         * Refresh the events for the currently displayed week.
         */
        refresh : function() {
            this._clearCalendar();
            this._loadCalEvents(this.element.data("startDate")); //reload with existing week
        },
    
        /*
         * Go to this week
         */
        today : function() {
            this._clearCalendar();
            this._loadCalEvents(new Date()); 
        },
    
        /*
         * Go to the previous week relative to the currently displayed week
         */
        prevWeek : function() {
            //minus more than 1 day to be sure we're in previous week - account for daylight savings or other anomolies
            var newDate = new Date(this.element.data("startDate").getTime() - (MILLIS_IN_WEEK / 6));
            this._clearCalendar();   
            this._loadCalEvents(newDate);
        },
    
        /*
         * Go to the next week relative to the currently displayed week
         */
        nextWeek : function() {
            //add 8 days to be sure of being in prev week - allows for daylight savings or other anomolies
            var newDate = new Date(this.element.data("startDate").getTime() + MILLIS_IN_WEEK + (MILLIS_IN_WEEK / 7));
            this._clearCalendar();
            this._loadCalEvents(newDate); 
        },
    
        /*
         * Reload the calendar to whatever week the date passed in falls on.
         */
        gotoWeek : function(date) {
            this._clearCalendar();
            this._loadCalEvents(date);
        },
        
        /*
         * Remove an event based on it's id
         */
        removeEvent : function(eventId) {
            this.element.find(".cal-event").each(function(){
                if($(this).data("calEvent").id === eventId) {
                    $(this).fadeOut(function(){
                        $(this).remove();
                    });
                    return false;
                }
            });
        },
        
        /*
         * Removes any events that have been added but not yet saved (have no id). 
         * This is useful to call after adding a freshly saved new event.
         */
        removeUnsavedEvents : function() {
            this.element.find(".new-cal-event").fadeOut(function(){
                $(this).remove();
            });
        },
        
        /*
         * update an event in the calendar. If the event exists it refreshes 
         * it's rendering. If it's a new event that does not exist in the calendar
         * it will be added.
         */
        updateEvent : function (calEvent) {
            this._updateEventInCalendar(calEvent);
        },
        
        /*
         * Returns an array of timeslot start and end times based on 
         * the configured grid of the calendar. Returns in both date and
         * formatted time based on the 'timeFormat' config option.
         */
        getTimeslotTimes : function(date) {
            var options = this.options;
            var firstHourDisplayed = options.businessHours.limitDisplay ? options.businessHours.start : 0;
            var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), firstHourDisplayed);
            
            var times = []
            var startMillis = startDate.getTime();
            for(var i=0; i < options.timeslotsPerDay; i++) {
                var endMillis = startMillis + options.millisPerTimeslot;
                times[i] = {
                    start: new Date(startMillis),
                    startFormatted: this._formatDate(new Date(startMillis), options.timeFormat),
                    end: new Date(endMillis),
                    endFormatted: this._formatDate(new Date(endMillis), options.timeFormat)
                 };
                startMillis = endMillis;
            }
            return times;
        }, 
        
        
        /*********************
         * private functions *
         *********************/
	    // compute dynamic options based on other config values    
        _computeOptions : function() {
            
            var options = this.options;
            
            if(options.businessHours.limitDisplay) {
                options.timeslotsPerDay = options.timeslotsPerHour * (options.businessHours.end - options.businessHours.start);
                options.millisToDisplay = (options.businessHours.end - options.businessHours.start) * 60 * 60 * 1000;
                options.millisPerTimeslot = options.millisToDisplay / options.timeslotsPerDay;
            } else {
                options.timeslotsPerDay = options.timeslotsPerHour * 24;
                options.millisToDisplay = MILLIS_IN_DAY;
                options.millisPerTimeslot = MILLIS_IN_DAY / options.timeslotsPerDay;
            }  
        },
        
        /*
         * Resize the calendar scrollable height based on the provided function in options.
         */
	    _resizeCalendar : function () {
            
	        var options = this.options;
	        if(options && $.isFunction(options.height)) {
	            var calendarHeight = options.height(this.element);
	            var headerHeight = this.element.find(".week-calendar-header").outerHeight();
	            var navHeight = this.element.find(".calendar-nav").outerHeight();
	            this.element.find(".calendar-scrollable-grid").height(calendarHeight - navHeight - headerHeight);
	        }
	    },
	    
	    /*
         * configure calendar interaction events that are able to use event 
         * delegation for greater efficiency 
         */
	    _setupEventDelegation : function() {
	        var self = this;
            var options = this.options;
	        this.element.click(function(event) {
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
	            var $target = $(event.target);
	            
	            if(self._isDraggingOrResizing($target)) {
	                return;
	            }
	            
	            if($target.hasClass("cal-event") ) {
	                options.eventMouseover($target.data("calEvent"), $target, event);
	            } 
	        }).mouseout(function(event){
	            var $target = $(event.target);
	            if(self._isDraggingOrResizing($target)) {
	                return;
	            }
	            if($target.hasClass("cal-event")) {
	                if($target.data("sizing")) return;
	                options.eventMouseout($target.data("calEvent"), $target, event);
	               
	            } 
	        });
	    }, 
	    
        /*
         * check if a ui draggable or resizable is currently being dragged or resized
         */
	    _isDraggingOrResizing : function ($target) {
	        return $target.hasClass("ui-draggable-dragging") || $target.hasClass("ui-resizable-resizing");
	    },
	    
	    /*
         * Render the main calendar layout
         */
	    _renderCalendar : function() {
	        
	        var $calendarContainer, calendarNavHtml, calendarHeaderHtml, calendarBodyHtml, $weekDayColumns;
	        var self = this;
	        var options = this.options;
	        
	        $calendarContainer = $("<div class=\"week-calendar\">").appendTo(self.element);
	        
	        if(options.buttons) {
	            calendarNavHtml = "<div class=\"calendar-nav\">\
	                <button class=\"today\">" + options.buttonText.today + "</button>\
	                <button class=\"prev\">" + options.buttonText.lastWeek + "</button>\
	                <button class=\"next\">" + options.buttonText.nextWeek + "</button>\
	                </div>";
	                
	            $(calendarNavHtml).appendTo($calendarContainer);
	            
	            $calendarContainer.find(".calendar-nav .today").click(function(){
	                self.element.weekCalendar("today");
	                return false;
	            });
	            
	            $calendarContainer.find(".calendar-nav .prev").click(function(){
	                self.element.weekCalendar("prevWeek");
	                return false;
	            });
	            
	            $calendarContainer.find(".calendar-nav .next").click(function(){
	                self.element.weekCalendar("nextWeek");
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
	        
	        var start = options.businessHours.limitDisplay ? options.businessHours.start : 0;
	        var end = options.businessHours.limitDisplay ? options.businessHours.end : 24;    
	            
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
	                    <div class=\"time-header-cell\">" + self._hourForIndex(i) + "<span class=\"am-pm\">" + self._amOrPm(i) + "</span></div></div>";
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
                if(!options.readonly) {
	               self._addDroppableToWeekDay($(this));
	               self._setupEventCreationForWeekDay($(this));
                }
	        });
	        
	        $calendarContainer.find(".time-slot").height(options.timeslotHeight -1); //account for border
	        
	        $calendarContainer.find(".time-header-cell").css({
	                height :  (options.timeslotHeight * options.timeslotsPerHour) - 11,
	                padding: 5
	                });
	
	        
	        
	    },
        
        /*
         * setup mouse events for capturing new events
         */
	    _setupEventCreationForWeekDay : function($weekDay) {
            var self = this;
            var options = this.options;
	        $weekDay.mousedown(function(event) {
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
	            var $target = $(event.target);
	           
	                 var $weekDay = $target.closest(".day-column-inner");
	                 var $newEvent = $weekDay.find(".new-cal-event-creating");
	    
	                 if($newEvent.length) {
	                     //if even created from a single click only, default height
	                    if(!$newEvent.hasClass("ui-resizable-resizing")) {
	                        $newEvent.css({height: options.timeslotHeight * options.defaultEventLength}).show();
	                    }
	                    var top = parseInt($newEvent.css("top"));
	                    var eventDuration = self._getEventDurationFromPositionedEventElement($weekDay, $newEvent, top);
	                    
	                    $newEvent.remove();
	                    var newCalEvent = {start: eventDuration.start, end: eventDuration.end, title: options.newEventText};
	                    var $renderedCalEvent = self._renderEvent(newCalEvent, $weekDay);
	                    self._adjustOverlappingEvents($weekDay); 
	                    options.eventNew(eventDuration, $renderedCalEvent);
	                 }
	        });
	    },
	    
	    /*
         * load calendar events for the week based on the date provided
         */
	    _loadCalEvents : function(dateWithinWeek) {
	        
	        var date, weekStartDate, endDate, $weekDayColumns;
	        var self = this;
            var options = this.options;
	        date = dateWithinWeek || options.date;
	        weekStartDate = self._dateFirstDayOfWeek(date);
	        weekEndDate = self._dateLastMilliOfWeek(date);
	        
	        options.calendarBeforeLoad(self.element);
	
	        self.element.data("startDate", weekStartDate);
	        self.element.data("endDate", weekEndDate);
	        
	        $weekDayColumns = self.element.find(".day-column-inner");
	        
	        self._updateDayColumnHeader($weekDayColumns);
	        
	        //load events by chosen means        
	        if (typeof options.data == 'string') {
	            if (options.loading) options.loading(true);
	            var jsonOptions = {};
	            jsonOptions[options.startParam || 'start'] = Math.round(weekStartDate.getTime() / 1000);
	            jsonOptions[options.endParam || 'end'] = Math.round(weekEndDate.getTime() / 1000);
	            $.getJSON(options.data, jsonOptions, function(data) {
	                self._renderEvents(data, $weekDayColumns);
	                if (options.loading) options.loading(false);
	            });
	        }
	        else if ($.isFunction(options.data)) {
	            options.data(weekStartDate, weekEndDate,
	                function(data) {
	                    self._renderEvents(data, $weekDayColumns);
	                });
	        }
	        else if (options.data) {
	            self._renderEvents(options.data, $weekDayColumns);
	        }
	        
	        self._disableTextSelect($weekDayColumns);
	       
	        
	    },
	    
        /*
         * update the display of each day column header based on the calendar week
         */
	    _updateDayColumnHeader : function ($weekDayColumns) {
	        var self = this;
            var options = this.options;            
	        var currentDay = self._cloneDate(self.element.data("startDate"));
	
	        self.element.find(".week-calendar-header td.day-column-header").each(function(i, val) {
	            
	                var dayName = options.useShortDayNames ? options.shortDays[i] : options.longDays[i];
	            
	                $(this).html(dayName + "<br/>" + self._formatDate(currentDay, options.dateFormat));
	                if(self._isToday(currentDay)) {
	                    $(this).addClass("today");
	                } else {
	                    $(this).removeClass("today");
	                }
	                currentDay = self._addDays(currentDay, 1);
	            
	        });
	        
	        currentDay = self._dateFirstDayOfWeek(self._cloneDate(self.element.data("startDate")));
	        
	        $weekDayColumns.each(function(i, val) {
	            
	            $(this).data("startDate", self._cloneDate(currentDay));
	            $(this).data("endDate", new Date(currentDay.getTime() + (MILLIS_IN_DAY - 1)));          
	            if(self._isToday(currentDay)) {
	                $(this).parent().addClass("today");
	            } else {
	                $(this).parent().removeClass("today");
	            }
	            
	            currentDay = self._addDays(currentDay, 1);
	        });
	        
	    },
	    
	    /*
         * Render the events into the calendar
         */
	    _renderEvents : function (events, $weekDayColumns) {
            var self = this;
	        var options = this.options;
	        var eventsToRender;
	        
	        if($.isArray(events)) {
	            eventsToRender = self._cleanEvents(events);
	        } else if(events.events) {
	             eventsToRender = self._cleanEvents(events.events);
	        }
	        if(events.options) {
	            
	            var updateLayout = false;
	            //update options
	            $.each(events.options, function(key, value){
	                if(value !== options[key]) {
                        options[key] = value;
	                    updateLayout = true;
	                }
	            });
                
                self._computeOptions();
	            
	            if(updateLayout) {
	                self.element.empty();
	                self._renderCalendar();
	                $weekDayColumns = self.element.find(".week-calendar-time-slots .day-column-inner");
	                self._updateDayColumnHeader($weekDayColumns);
	                self._resizeCalendar();
	            }
	            
	        }
	        
	         
	        $.each(eventsToRender, function(i, calEvent){
	            
	            var $weekDay = self._findWeekDayForEvent(calEvent, $weekDayColumns);
	            
	            if($weekDay) {
	                self._renderEvent(calEvent, $weekDay);
	            }
	        });
	        
	        $weekDayColumns.each(function(){
	            self._adjustOverlappingEvents($(this));
	        });
	        
	        options.calendarAfterLoad(self.element);
	        
	        if(!eventsToRender.length) {
	            options.noEvents();
	        }
	        
	    },
	    
        /*
         * Render a specific event into the day provided. Assumes correct 
         * day for calEvent date
         */
	    _renderEvent: function (calEvent, $weekDay) {
	        var self = this;
            var options = this.options;
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
	        
	        self._refreshEventDetails(calEvent, $calEvent);
	        self._positionEvent($weekDay, $calEvent);
	        $calEvent.show();
	        
	        if(!options.readonly && options.resizable(calEvent, $calEvent)) {
	            self._addResizableToCalEvent(calEvent, $calEvent, $weekDay)
	        }
	        if(!options.readonly && options.draggable(calEvent, $calEvent)) {
	            self._addDraggableToCalEvent(calEvent, $calEvent);
	        } 
	        
	        return $calEvent;
	        
	    },
	    
        /*
         * If overlapping is allowed, check for overlapping events and format 
         * for greater readability
         */
	    _adjustOverlappingEvents : function($weekDay) {
	        if(this.options.allowCalEventOverlap) {
	            var groups = this._groupOverlappingEventElements($weekDay);
                
                $.each(groups, function(){
	                $.each(this, function(i){
	                    if(i % 2 === 0) {
	                        $(this).css({width: "70%", left: 0, right: ""});
	                    } else {
	                        $(this).css({width: "70%", left: "", right: 0});
	                    }
	                });
	            });
	        }
	    },
	    
	    /*
         * Find groups of overlapping events
         */
	    _groupOverlappingEventElements : function($weekDay) {
	        
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
            
            return groups;
	        
	    },
        
	    /*
         * Check if the events provided overlap in time
         */
	    _eventsOverlap : function(thisEvent, thatEvent) {
	        
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
	        
	     },
	    
	    /*
         * find the weekday in the current calendar that the calEvent falls within
         */
	    _findWeekDayForEvent : function(calEvent, $weekDayColumns) {
	    
	        var $weekDay;
	        $weekDayColumns.each(function(){
	            if($(this).data("startDate").getTime() <= calEvent.start.getTime() && $(this).data("endDate").getTime() >= calEvent.end.getTime()) {
	                $weekDay = $(this);
	                return false;
	            } 
	        }); 
	        return $weekDay;
	    },
	    
        /*
         * update the events rendering in the calendar. Add if does not yet exist.
         */
	    _updateEventInCalendar : function (calEvent) {
            var self = this;
	        var options = this.options;
	        self._cleanEvent(calEvent);
            
	        if(calEvent.id) {
	            self.element.find(".cal-event").each(function(){
	                if($(this).data("calEvent").id === calEvent.id || $(this).hasClass("new-cal-event")) {
	                    $(this).remove();
	                    return false;
	                }
	            });
	        }
	        
	        var $weekDay = self._findWeekDayForEvent(calEvent, self.element.find(".week-calendar-time-slots .day-column-inner"));
	        if($weekDay) {
	            self._renderEvent(calEvent, $weekDay);
	            self._adjustOverlappingEvents($weekDay);
	        }
	    },
        
	    /*
         * Position the event element within the weekday based on it's start / end dates.
         */
	    _positionEvent : function($weekDay, $calEvent) {
	        var options = this.options;
	        var calEvent = $calEvent.data("calEvent");
	        var pxPerMillis = $weekDay.height() / options.millisToDisplay;
	        var firstHourDisplayed = options.businessHours.limitDisplay ? options.businessHours.start : 0;
	        var startMillis = calEvent.start.getTime() - new Date(calEvent.start.getFullYear(), calEvent.start.getMonth(), calEvent.start.getDate(), firstHourDisplayed).getTime();
	        var eventMillis = calEvent.end.getTime() - calEvent.start.getTime();    
	        var pxTop = pxPerMillis * startMillis;
	        var pxHeight = pxPerMillis * eventMillis;
	        $calEvent.css({top: pxTop, height: pxHeight});
	    },
	
        /*
         * Determine the actual start and end times of a calevent based on it's 
         * relative position within the weekday column and the starting hour of the
         * displayed calendar.
         */
	    _getEventDurationFromPositionedEventElement : function($weekDay, $calEvent, top) {
	         var options = this.options;
	         var startOffsetMillis = options.businessHours.limitDisplay ? options.businessHours.start * 60 *60 * 1000 : 0;
	         var start = new Date($weekDay.data("startDate").getTime() + startOffsetMillis + Math.round(top / options.timeslotHeight) * options.millisPerTimeslot);
	         var end = new Date(start.getTime() + ($calEvent.height() / options.timeslotHeight) * options.millisPerTimeslot);
	         return {start: start, end: end};
	    },
	    
        /*
         * If the calendar does not allow event overlap, adjust the start or end date if necessary to 
         * avoid overlapping of events. Typically, shortens the resized / dropped event to it's max possible
         * duration  based on the overlap. If no satisfactory adjustment can be made, the event is reverted to
         * it's original location.
         */
	    _adjustForEventCollisions : function($weekDay, $calEvent, newCalEvent, oldCalEvent, maintainEventDuration) {
            var options = this.options;
            
            if(options.allowCalEventOverlap) {
	            return;
	        }
	        var adjustedStart, adjustedEnd;
            var self = this;
	
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
	            self._adjustForEventCollisions($weekDay, $calEvent, newCalEvent, oldCalEvent);
	        } else {
	            newCalEvent.end = adjustedEnd || newCalEvent.end;
	        }
	        
	        
	        
	        //reset if new cal event has been forced to zero size
	        if(newCalEvent.start.getTime() >= newCalEvent.end.getTime()) {
	            newCalEvent.start = oldCalEvent.start;
	            newCalEvent.end = oldCalEvent.end;
	        }
	        
	        $calEvent.data("calEvent", newCalEvent);
	    },
	    
        /*
         * Add draggable capabilities to an event
         */
	    _addDraggableToCalEvent : function(calEvent, $calEvent) {
	        var options = this.options;
	        $calEvent.draggable({
	            handle : ".time",
	            containment: ".calendar-scrollable-grid",
	            opacity: 0.5,
	            grid : [$calEvent.outerWidth() + 1, options.timeslotHeight ]
	        });
	        
	    },
	    
        /*
         * Add droppable capabilites to weekdays to allow dropping of calEvents only
         */
	    _addDroppableToWeekDay : function($weekDay) {
            var self = this;
            var options = this.options;
	        $weekDay.droppable({
	            accept: ".cal-event",
	            drop: function(event, ui) {
	                var $calEvent = ui.draggable;
	                var top = Math.round(parseInt(ui.position.top));
	                var eventDuration = self._getEventDurationFromPositionedEventElement($weekDay, $calEvent, top);
	                var calEvent = $calEvent.data("calEvent");
	                var newCalEvent = $.extend(true, {start: eventDuration.start, end: eventDuration.end}, calEvent);
	                self._adjustForEventCollisions($weekDay, $calEvent, newCalEvent, calEvent, true);
	                var $weekDayColumns = self.element.find(".day-column-inner");
	                var $newEvent = self._renderEvent(newCalEvent, self._findWeekDayForEvent(newCalEvent, $weekDayColumns));
	                $calEvent.hide();
	                
	                //trigger drop callback
	                options.eventDrop(newCalEvent, calEvent, $newEvent);
	                $calEvent.data("preventClick", true);
	                setTimeout(function(){
	                    $calEvent.remove();
	                    self._adjustOverlappingEvents($weekDay);
	                }, 500);
	                                
	            }
	        });
	    },
	    
        /*
         * Add resizable capabilities to a calEvent
         */
	    _addResizableToCalEvent : function(calEvent, $calEvent, $weekDay) {
            var self = this;
            var options = this.options;
	        $calEvent.resizable({
	            grid: options.timeslotHeight,
	            containment : $weekDay,
	            handles: "s",
	            minHeight: options.timeslotHeight,
	            stop :function(event, ui){
	                var $calEvent = ui.element;  
	                var newEnd = new Date($calEvent.data("calEvent").start.getTime() + ($calEvent.height() / options.timeslotHeight) * options.millisPerTimeslot);
	                var newCalEvent = $.extend(true, {start: calEvent.start, end: newEnd}, calEvent);
	                self._adjustForEventCollisions($weekDay, $calEvent, newCalEvent, calEvent);
	                
	                self._refreshEventDetails(newCalEvent, $calEvent);
	                self._positionEvent($weekDay, $calEvent);
	                
	                //trigger resize callback
	                options.eventResize(newCalEvent, calEvent, $calEvent);
	                $calEvent.data("preventClick", true);
	                setTimeout(function(){
	                    $calEvent.removeData("preventClick");
	                }, 500);
	            }
	        });
	    },
	    
	    /*
         * Refresh the displayed details of a calEvent in the calendar
         */
	    _refreshEventDetails : function(calEvent, $calEvent) {
	        var self = this;
            var options = this.options;
	        $calEvent.find(".time").text(self._formatDate(calEvent.start, options.timeFormat) + options.timeSeparator + self._formatDate(calEvent.end, options.timeFormat));
	        $calEvent.find(".title").text(calEvent.title);
	        $calEvent.data("calEvent", calEvent);
	    },
	    
        /*
         * Clear all cal events from the calendar
         */
	    _clearCalendar : function() {
	        this.element.find(".day-column-inner div").remove();
	    },
	    
        /*
         * Scroll the calendar to a specific hour
         */
	    _scrollToHour : function(hour) {
            var self = this;
	        var options = this.options;
	        var $scrollable = this.element.find(".calendar-scrollable-grid");
	        var $target = this.element.find(".grid-timeslot-header .hour-header:eq(" + hour + ")");
	        
	        $scrollable.animate({scrollTop: 0}, 0, function(){
	            var targetOffset = $target.offset().top;
	            var scroll = targetOffset - $scrollable.offset().top - $target.outerHeight();
	            $scrollable.animate({scrollTop: scroll}, options.scrollToHourMillis);
	        });
	    },
	
        /*
         * find the hour (12 hour day) for a given hour index
         */
	    _hourForIndex : function(index) {
	        if(index === 0 ) { //midnight
	            return 12; 
	        } else if(index < 13) { //am
	            return index;
	        } else { //pm
	            return index - 12;
	        }
	    },
	    
	    _amOrPm : function (hourOfDay) {
	        return hourOfDay < 12 ? "AM" : "PM";
	    },
	    
	    _isToday : function(date) {
	        var clonedDate = this._cloneDate(date);
	        this._clearTime(clonedDate);
	        var today = new Date();
	        this._clearTime(today);
	        return today.getTime() === clonedDate.getTime();
	    },
	
        /*
         * Clean events to ensure correct format
         */
	    _cleanEvents : function(events) {
            var self = this;
	        $.each(events, function(i, event) {
	            self._cleanEvent(event);
	        });
	        return events;
	    },
        
	    /*
         * Clean specific event
         */
	    _cleanEvent : function (event) {
	        if (event.date) {
                event.start = event.date;
            }
	        event.start = this._cleanDate(event.start);
	        event.end = this._cleanDate(event.end);
	        if (!event.end) {
                event.end = this._addDays(this._cloneDate(event.start), 1);
            }
	    },
	
        /*
         * Disable text selection of the elements in different browsers
         */
	    _disableTextSelect : function($elements) {
	        $elements.each(function(){
	            if($.browser.mozilla){//Firefox
	                $(this).css('MozUserSelect','none');
	            }else if($.browser.msie){//IE
	                $(this).bind('selectstart',function(){return false;});
	            }else{//Opera, etc.
	                $(this).mousedown(function(){return false;});
	            }
	        });
	    }, 
	
	   /*
        * returns the date on the first millisecond of the week
        */
	    _dateFirstDayOfWeek : function(date) {
	        
	        var midnightCurrentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	        var currentDayOfWeek = midnightCurrentDate.getDay();
	        var millisToSubtract = currentDayOfWeek * 86400000;
	        return new Date(midnightCurrentDate.getTime() - millisToSubtract);
	        
	    },
	    
        /*
        * returns the date on the first millisecond of the last day of the week
        */
	    _dateLastDayOfWeek : function(date) {
	        var midnightCurrentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	        var currentDayOfWeek = midnightCurrentDate.getDay();
	        var millisToAdd = (6 - currentDayOfWeek) * MILLIS_IN_DAY;
	        return new Date(midnightCurrentDate.getTime() + millisToAdd);
	    },
	    
        /*
        * returns the date on the last millisecond of the week
        */
	    _dateLastMilliOfWeek : function(date) {
	        var lastDayOfWeek = this._dateLastDayOfWeek(date);
	        return new Date(lastDayOfWeek.getTime() + (MILLIS_IN_DAY - 1));
	        
	    },
	    
        /*
        * Clear the time components of a date leaving the date 
        * of the first milli of day
        */
	    _clearTime : function(d) {
	        d.setHours(0); 
	        d.setMinutes(0);
	        d.setSeconds(0); 
	        d.setMilliseconds(0);
	        return d;
	    },
	    
        /*
        * add specific number of days to date
        */
	    _addDays : function(d, n, keepTime) {
	        d.setDate(d.getDate() + n);
	        if (keepTime) {
                return d
            }
	        return this._clearTime(d);
	    },
	    
	    _cloneDate : function(d) {
	        return new Date(+d);
	    },
	    
        /*
         * return a date for different representations
         */
	    _cleanDate : function(d) {
	        if (typeof d == 'string') {
	            return this._parseISO8601(d, true) || Date.parse(d) || new Date(parseInt(d));
            }
	        if (typeof d == 'number') {
	            return new Date(d);
            }
	        return d;
	    },
	    
	    _parseISO8601 : function(s, ignoreTimezone) {
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
	    },
	    
	    
	    /*
	     * date formatting is adapted from 
	     * http://jacwright.com/projects/javascript/date_format
	     */
	    _formatDate : function(date, format) {
            var options = this.options;
	        var returnStr = '';
	        for (var i = 0; i < format.length; i++) {
	            var curChar = format.charAt(i);
	            if ($.isFunction(this._replaceChars[curChar])) {
	                returnStr += this._replaceChars[curChar](date, options);
	            } else {
	                returnStr += curChar;
	            }
	        }
	        return returnStr;
	    },
	    
	    _replaceChars : {
	       
		        // Day
		        d: function(date) { return (date.getDate() < 10 ? '0' : '') + date.getDate(); },
		        D: function(date, options) { return options.shortDays[date.getDay()]; },
		        j: function(date) { return date.getDate(); },
		        l: function(date, options) { return options.longDays[date.getDay()]; },
		        N: function(date) { return date.getDay() + 1; },
		        S: function(date) { return (date.getDate() % 10 == 1 && date.getDate() != 11 ? 'st' : (date.getDate() % 10 == 2 && date.getDate() != 12 ? 'nd' : (date.getDate() % 10 == 3 && date.getDate() != 13 ? 'rd' : 'th'))); },
		        w: function(date) { return date.getDay(); },
		        z: function(date) { return "Not Yet Supported"; },
		        // Week
		        W: function(date) { return "Not Yet Supported"; },
		        // Month
		        F: function(date, options) { return options.longMonths[date.getMonth()]; },
		        m: function(date) { return (date.getMonth() < 11 ? '0' : '') + (date.getMonth() + 1); },
		        M: function(date, options) { return options.shortMonths[date.getMonth()]; },
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
	    }
        
    });
   
    $.extend($.ui.weekCalendar, {
	    version: '1.2.0',
	    getter: ['getTimeslotTimes'],
	    defaults: {
	        date: new Date(),
            timeFormat : "h:i a",
            dateFormat : "M d, Y",
            useShortDayNames: false,
            timeSeparator : " to ",
            startParam : "start",
            endParam : "end",
            businessHours : {start: 8, end: 18, limitDisplay : false},
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
            readonly: false,
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
            noEvents : function() {},
            shortMonths : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            longMonths : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            shortDays : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            longDays : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
	    }
	});
    
    var MILLIS_IN_DAY = 86400000;
    var MILLIS_IN_WEEK = MILLIS_IN_DAY * 7;
    
})(jQuery);