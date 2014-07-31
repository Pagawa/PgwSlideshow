/**
 * PgwSlideshow - Version 1.2
 *
 * Copyright 2014, Jonathan M. Piat
 * http://pgwjs.com - http://pagawa.com
 * 
 * Released under the GNU GPLv3 license - http://opensource.org/licenses/gpl-3.0
 */
;(function($){
    $.fn.pgwSlideshow = function(options) {

        var defaults = {
            mainClassName : 'pgwSlideshow',
            displayList : true,
            touchControls : true,
            autoSlide : false,
            beforeSlide : false,
            afterSlide : false,
            transitionDuration : 400,
            intervalDuration : 3000
        };

        if (this.length == 0) {
            return this;
        } else if(this.length > 1) {
            this.each(function() {
                $(this).pgwSlideshow(options);
            });
            return this;
        }

        var pgwSlideshow = this;
        pgwSlideshow.plugin = this;
        pgwSlideshow.config = {};
        pgwSlideshow.data = [];
        pgwSlideshow.currentSlide = 0;
        pgwSlideshow.slideCount = 0;
        pgwSlideshow.eventInterval = null;
        pgwSlideshow.touchCurrentFirstPosition = false;
        pgwSlideshow.touchListLastPosition = false;

        // Init
        var init = function() {

            // Merge user options with the default configuration
            pgwSlideshow.config = $.extend({}, defaults, options);

            // Setup
            setup();

            // Check list parameters
            if (pgwSlideshow.config.displayList) {
                pgwSlideshow.checkList();

                $(window).resize(function() {
                    pgwSlideshow.checkList();
                });
            }

            // Activate interval
            if (pgwSlideshow.config.autoSlide) {
                activateInterval();
            }

            return true;
        };

        // Set list width
        var setListWidth = function() {
            var listWidth = 0;

            pgwSlideshow.plugin.find('ul li').each(function() {
                listWidth += $(this).width();
            });

            pgwSlideshow.plugin.find('ul').width(listWidth);
            return true;
        }

        // Setup
        var setup = function() {

            // Create container
            pgwSlideshow.plugin.removeClass(pgwSlideshow.config.mainClassName);
            pgwSlideshow.plugin.wrap('<div class="ps-list"></div>');
            pgwSlideshow.plugin = pgwSlideshow.plugin.parent();

            pgwSlideshow.plugin.wrap('<div class="' + pgwSlideshow.config.mainClassName + '"></div>');
            pgwSlideshow.plugin = pgwSlideshow.plugin.parent();

            pgwSlideshow.plugin.prepend('<div class="ps-current"><img src="" alt=""></div>');
            pgwSlideshow.slideCount = pgwSlideshow.plugin.find('ul li').length;

            // Prev / Next icons
            if (pgwSlideshow.slideCount > 1) {

                pgwSlideshow.plugin.find('.ps-current').prepend('<span class="ps-prev"><span class="ps-prevIcon"></span></span>');
                pgwSlideshow.plugin.find('.ps-current').append('<span class="ps-next"><span class="ps-nextIcon"></span></span>');
                pgwSlideshow.plugin.find('.ps-current').append('<span class="ps-caption"><span></span></span>');
                pgwSlideshow.plugin.find('.ps-current .ps-prev').click(function() {
                    pgwSlideshow.previousSlide();
                });
                pgwSlideshow.plugin.find('.ps-current .ps-next').click(function() {
                    pgwSlideshow.nextSlide();
                });

                // Touch controls for current image
                if (pgwSlideshow.config.touchControls) {

                    pgwSlideshow.plugin.find('.ps-current').on('touchstart', function(e) {
                        try {
                            if (e.originalEvent.touches[0].clientX && pgwSlideshow.touchCurrentFirstPosition == false) {
                                pgwSlideshow.touchCurrentFirstPosition = e.originalEvent.touches[0].clientX;
                            }
                        } catch(e) {
                            pgwSlideshow.touchCurrentFirstPosition = false;
                        }
                    });

                    pgwSlideshow.plugin.find('.ps-current').on('touchmove', function(e) {
                        try {
                            if (e.originalEvent.touches[0].clientX && pgwSlideshow.touchCurrentFirstPosition != false) {
                                if (e.originalEvent.touches[0].clientX > (pgwSlideshow.touchCurrentFirstPosition + 50)) {
                                    pgwSlideshow.touchCurrentFirstPosition = false;
                                    pgwSlideshow.previousSlide();
                                } else if (e.originalEvent.touches[0].clientX < (pgwSlideshow.touchCurrentFirstPosition - 50)) {
                                    pgwSlideshow.touchCurrentFirstPosition = false;
                                    pgwSlideshow.nextSlide();
                                }
                            }
                        } catch(e) {
                            pgwSlideshow.touchCurrentFirstPosition = false;
                        }
                    });

                    pgwSlideshow.plugin.find('.ps-current').on('touchend', function(e) {
                        pgwSlideshow.touchCurrentFirstPosition = false;
                    });
                }
            }

            // Get slideshow elements
            var elementId = 1;
            pgwSlideshow.plugin.find('ul li').each(function() {
                var element = getElement($(this));
                element.id = elementId;
                pgwSlideshow.data.push(element);

                $(this).addClass('elt_' + element.id);
                $(this).wrapInner('<span class="ps-item' + (elementId == 1 ? ' ps-selected' : '') + '"></span>');

                $(this).css('cursor', 'pointer').click(function(event) {
                    event.preventDefault();
                    displayCurrent(element.id);
                });

                elementId++;
            });

            // Set list elements
            if (pgwSlideshow.config.displayList) {
                setListWidth();

                pgwSlideshow.plugin.find('.ps-list').prepend('<span class="ps-prev"><span class="ps-prevIcon"></span></span>');
                pgwSlideshow.plugin.find('.ps-list').append('<span class="ps-next"><span class="ps-nextIcon"></span></span>');
                pgwSlideshow.plugin.find('.ps-list').show();
            } else {
                pgwSlideshow.plugin.find('.ps-list').hide();
            }

            // Attach slide events
            if (pgwSlideshow.config.autoSlide) {
                pgwSlideshow.plugin.on('mouseenter', function() {
                    clearInterval(pgwSlideshow.eventInterval);
                    pgwSlideshow.eventInterval = null;
                }).on('mouseleave', function() {
                    activateInterval();
                });
            }

            // Display the first element
            displayCurrent(1);

            return true;
        };

        // Get element
        var getElement = function(obj) {
            var element = {};

            // Get link
            var elementLink = obj.find('a').attr('href');
            if ((typeof elementLink != 'undefined') && (elementLink != '')) {
                element.link = elementLink;
                var elementLinkTarget = obj.find('a').attr('target');
                if ((typeof elementLinkTarget != 'undefined') && (elementLinkTarget != '')) {
                    element.linkTarget = elementLinkTarget;
                }
            }

            // Get image 
            var elementThumbnail = obj.find('img').attr('src');
            if ((typeof elementThumbnail != 'undefined') && (elementThumbnail != '')) {
                element.thumbnail = elementThumbnail;
            }

            var elementImage = obj.find('img').attr('data-large-src');
            if ((typeof elementImage != 'undefined') && (elementImage != '')) {
                element.image = elementImage;
            }

            // Get title 
            var elementTitle = obj.find('img').attr('alt');
            if ((typeof elementTitle != 'undefined') && (elementTitle != '')) {
                element.title = elementTitle;
            }

            return element;
        };

        // Display current element
        var displayCurrent = function(elementId, apiController) {

            var element = pgwSlideshow.data[elementId - 1];
            var elementContainer = pgwSlideshow.plugin.find('.ps-current');

            if (typeof element == 'undefined') {
                throw new Error('PgwSlideshow - The element ' + elementId + ' is undefined');
                return false;
            }

            pgwSlideshow.currentSlide = elementId;
            
            // Before slide
            if (typeof pgwSlideshow.config.beforeSlide == 'function') {
                pgwSlideshow.config.beforeSlide(elementId);
            }

            // Fix for Zepto
            if (typeof elementContainer.animate == 'undefined') {
                elementContainer.animate = function(css, duration, callback) {
                    elementContainer.css(css);
                    if (callback) {
                        callback();
                    }
                }
            }

            // Opacify the current element
            elementContainer.stop().animate({
                opacity : 0,
            }, pgwSlideshow.config.transitionDuration, function() {
            
                pgwSlideshow.plugin.find('ul li .ps-item').removeClass('ps-selected');
                pgwSlideshow.plugin.find('ul li.elt_' + elementId + ' .ps-item').addClass('ps-selected');

                // Create image
                if (element.image) {
                    elementContainer.find('img').attr('src', element.image);
                    elementContainer.find('img').attr('alt', (element.title ? element.title : ''));
                } else if (element.thumbnail) {
                    elementContainer.find('img').attr('src', element.thumbnail);
                    elementContainer.find('img').attr('alt', (element.title ? element.title : ''));
                } else {
                    elementContainer.html('');
                }

                // Create caption
                if (element.title) {
                    elementContainer.find('.ps-caption span').text(element.title);
                    elementContainer.find('.ps-caption').show();
                } else {
                    elementContainer.find('.ps-caption span').text('');
                    elementContainer.find('.ps-caption').hide();
                }

                // Check selected item
                if (pgwSlideshow.config.displayList) {
                    checkSelectedItem();
                }

                // After slide
                if (typeof pgwSlideshow.config.afterSlide == 'function') {
                    pgwSlideshow.config.afterSlide(elementId);
                }

                // Display the new element
                elementContainer.animate({
                    opacity : 1,
                }, pgwSlideshow.config.transitionDuration);
            });

            // Reset interval to avoid a half interval after an API control
            if (typeof apiController != 'undefined' && pgwSlideshow.config.autoSlide) {
                activateInterval();
            }

            return true;
        };
        
        // Activate interval
        var activateInterval = function() {
            clearInterval(pgwSlideshow.eventInterval);
        
            if (pgwSlideshow.slideCount > 1 && pgwSlideshow.config.autoSlide) {
                pgwSlideshow.eventInterval = setInterval(function() {
                    if (pgwSlideshow.currentSlide + 1 <= pgwSlideshow.slideCount) {
                        var nextItem = pgwSlideshow.currentSlide + 1;
                    } else {
                        var nextItem = 1;
                    }
                    displayCurrent(nextItem);                    
                }, pgwSlideshow.config.intervalDuration);
            }
            
            return true;
        };

        // Check slide list
        pgwSlideshow.checkList = function() {
            if (! pgwSlideshow.config.displayList) return false;

            // Refresh list width
            setListWidth();

            var containerObject = pgwSlideshow.plugin.find('.ps-list');
            var containerWidth = containerObject.width();
            var listObject = pgwSlideshow.plugin.find('.ps-list ul');
            var listWidth = listObject.width();

            if (listWidth > containerWidth) {
                listObject.css('margin', '0 45px');

                var marginLeft = parseInt(listObject.css('margin-left'));
                var marginRight = parseInt(listObject.css('margin-right'));
                containerWidth -= (marginLeft + marginRight);

                // Left button
                containerObject.find('.ps-prev').show().unbind('click').click(function() {
                    var oldPosition = parseInt(listObject.css('left'));
                    var newPosition = oldPosition + containerWidth;

                    if (oldPosition == 0) {
                        newPosition = -(listWidth - containerWidth);
                    } else if (newPosition > 0) {
                        newPosition = 0;
                    }

                    listObject.css('left', newPosition);
                });

                // Right button
                containerObject.find('.ps-next').show().unbind('click').click(function() {
                    var oldPosition = parseInt(listObject.css('left'));
                    var newPosition = oldPosition - containerWidth;
                    var maxPosition = -(listWidth - containerWidth);

                    if (oldPosition == maxPosition) {
                        newPosition = 0;
                    } else if (newPosition < maxPosition) {
                        newPosition = maxPosition;
                    }

                    listObject.css('left', newPosition);
                });

                // Touc controls for the list
                if (pgwSlideshow.config.touchControls) {

                    pgwSlideshow.plugin.find('.ps-list ul').on('touchmove', function(e) {
                        try {
                            if (e.originalEvent.touches[0].clientX) {
                                var lastPosition = (pgwSlideshow.touchListLastPosition == false ? 0 : pgwSlideshow.touchListLastPosition);
                                nbPixels = (pgwSlideshow.touchListLastPosition == false ? 1 : Math.abs(lastPosition - e.originalEvent.touches[0].clientX));
                                pgwSlideshow.touchListLastPosition = e.originalEvent.touches[0].clientX;

                                var touchDirection = '';
                                if (lastPosition > e.originalEvent.touches[0].clientX) {
                                    touchDirection = 'left';
                                } else if (lastPosition < e.originalEvent.touches[0].clientX) {
                                    touchDirection = 'right';
                                }
                            }

                            var oldPosition = parseInt(listObject.css('left'));

                            if (touchDirection == 'left') {
                                var containerWidth = containerObject.width();
                                var listWidth = listObject.width();

                                var marginLeft = parseInt(listObject.css('margin-left'));
                                var marginRight = parseInt(listObject.css('margin-right'));
                                containerWidth -= (marginLeft + marginRight);

                                var maxPosition = -(listWidth - containerWidth);
                                var newPosition = oldPosition - nbPixels;

                                if (newPosition > maxPosition) {
                                    listObject.css('left', newPosition);
                                }

                            } else if (touchDirection == 'right') {
                                var newPosition = oldPosition + nbPixels;

                                if (newPosition < 0) {
                                    listObject.css('left', newPosition);
                                } else {
                                    listObject.css('left', 0);
                                }
                            }

                        } catch(e) {
                            pgwSlideshow.touchListLastPosition = false;
                        }
                    });

                    pgwSlideshow.plugin.find('.ps-list ul').on('touchend', function(e) {
                        pgwSlideshow.touchListLastPosition = false;
                    });
                }

            } else {
                var marginLeft = parseInt((containerWidth - listWidth) / 2);
                listObject.css('left', 0).css('margin-left', marginLeft);
                containerObject.find('.ps-prev').hide();
                containerObject.find('.ps-next').hide();
                pgwSlideshow.plugin.find('.ps-list ul').unbind('touchstart touchmove touchend');
            }

            return true;
        };

        // Check the visibility of the selected item
        var checkSelectedItem = function() {
            var containerWidth = pgwSlideshow.plugin.find('.ps-list').width();
            var listObject = pgwSlideshow.plugin.find('.ps-list ul');
            var listWidth = listObject.width();  

            var marginLeft = parseInt(listObject.css('margin-left'));
            var marginRight = parseInt(listObject.css('margin-right'));
            containerWidth -= (marginLeft + marginRight);

            var visibleZoneStart = Math.abs(parseInt(listObject.css('left')));
            var visibleZoneEnd = visibleZoneStart + containerWidth;
            var elementZoneStart = pgwSlideshow.plugin.find('.ps-list .ps-selected').position().left;
            var elementZoneEnd = elementZoneStart + pgwSlideshow.plugin.find('.ps-list .ps-selected').width();

            if ((elementZoneStart < visibleZoneStart) || (elementZoneEnd > visibleZoneEnd)) {
                var maxPosition = -(listWidth - containerWidth);

                if (-elementZoneStart < maxPosition) {
                    listObject.css('left', maxPosition);
                } else {
                    listObject.css('left', -elementZoneStart);
                }
            }

            return true;
        };

        // Start auto slide
        pgwSlideshow.startSlide = function() {
            pgwSlideshow.config.autoSlide = true;
            activateInterval();
            return true;
        };

        // Stop auto slide
        pgwSlideshow.stopSlide = function() {
            pgwSlideshow.config.autoSlide = false;
            clearInterval(pgwSlideshow.eventInterval);
            return true;
        };

        // Get current slide
        pgwSlideshow.getCurrentSlide = function() {
            return pgwSlideshow.currentSlide;
        };

        // Get slide count
        pgwSlideshow.getSlideCount = function() {
            return pgwSlideshow.slideCount;
        };

        // Display slide
        pgwSlideshow.displaySlide = function(itemId) {
            displayCurrent(itemId, true);
            return true;
        };

        // Next slide
        pgwSlideshow.nextSlide = function() {
            if (pgwSlideshow.currentSlide + 1 <= pgwSlideshow.slideCount) {
                var nextItem = pgwSlideshow.currentSlide + 1;
            } else {
                var nextItem = 1;
            }
            displayCurrent(nextItem, true);
            return true;
        };

        // Previous slide
        pgwSlideshow.previousSlide = function() {
            if (pgwSlideshow.currentSlide - 1 >= 1) {
                var previousItem = pgwSlideshow.currentSlide - 1;
            } else {
                var previousItem = pgwSlideshow.slideCount;
            }
            displayCurrent(previousItem, true);
            return true;
        };
        
        // Destroy slider
        pgwSlideshow.destroy = function(soft) {
            clearInterval(pgwSlideshow.eventInterval);
        
            pgwSlideshow.plugin.find('ul li').each(function() {
                $(this).unbind('click');
            });

            var mainClassName = pgwSlideshow.config.mainClassName;

            pgwSlideshow.data = [];
            pgwSlideshow.config = {};
            pgwSlideshow.currentSlide = 0;
            pgwSlideshow.slideCount = 0;
            pgwSlideshow.eventInterval = null;

            if (typeof soft != 'undefined') {

                if (pgwSlideshow.plugin.find('div').length > 0) {
                    pgwSlideshow.plugin.find('ul').unwrap();
                    pgwSlideshow.plugin.children().not('ul').remove();
                    pgwSlideshow.plugin = pgwSlideshow.plugin.find('ul');
                    pgwSlideshow.plugin.removeClass().attr('style', null);
                    pgwSlideshow.plugin.addClass(mainClassName);
                    pgwSlideshow.plugin.unwrap();
                    pgwSlideshow.plugin.hide();

                    pgwSlideshow.plugin.find('li').each(function() {
                        $(this).find('img').unwrap();
                        $(this).removeClass().attr('style', null);
                    });
                }

            } else {
                pgwSlideshow.parent().parent().remove();
                pgwSlideshow.plugin = null;
                pgwSlideshow = null;
            }

            return true;
        };

        // Reload slider
        pgwSlideshow.reload = function(newOptions) {
            pgwSlideshow.destroy(true);

            pgwSlideshow = this;
            pgwSlideshow.plugin = this;
            pgwSlideshow.plugin.show();

            // Merge new options with the default configuration
            pgwSlideshow.config = $.extend({}, defaults, newOptions);

            // Setup
            setup();

            // Check list parameters
            if (pgwSlideshow.config.displayList) {
                pgwSlideshow.checkList();

                $(window).resize(function() {
                    pgwSlideshow.checkList();
                });
            }

            // Activate interval
            if (pgwSlideshow.config.autoSlide) {
                activateInterval();
            }

            return true;
        };

        // Slideshow initialization
        init();

        return this;
    }
})(window.Zepto || window.jQuery);
