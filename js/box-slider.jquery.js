;(function (w, $, undefined) {

  var methods = {} // external method api
    , supports3D = true // set during vendorPrefix determination
    , slideAnimators = {} // map of animation effect objects
    , defaults = { // default required settings
        speed: 800
      , timeout: 5000
      , autoScroll: false
      , pauseOnHover: false
      , effect: 'scrollVert3d'
      , perspective: 1000
    };

  w.jqBoxSlider = methods; // Global alias for easy extension

  // API methods ---------------------------------------------------------------

  // sets up all selected boxes with applied options
  methods.init = function (opts) {
    var defaultSettings = $.extend({}, defaults, opts)
      , animator = methods.slideAnimator(defaultSettings.effect);

    return this.each(function () {
      var $this = $(this)
        , $slides = $this.children()
        , settings = $.extend({}, defaultSettings);

      $this.data('bssettings', settings);
      settings.slideAnimator = animator;
      settings.slideAnimator.initialize($this, $slides, settings);
      setupControls($this, settings);

      if (settings.autoScroll) {
        settings.autointv = setInterval(function () {
          showNextSlide($this);
        }, settings.timeout + settings.speed);

        if (settings.pauseOnHover) {
          $this.on('hover', togglePlayPause);
        }
      }
    });
  };

  // toggles the autoplay state for each slider
  methods.playPause = function () {
    return this.each(function (i, el) {
      togglePlayPause.call($(this));
    });
  };

  // show the slide at the given index
  methods.showSlide = function (index) {
    index = parseInt(index, 10);
    return this.each(function () { 
      var $box = $(this);

      resetAutoScroll($box);
      showNextSlide($box, index);
    });
  };

  // registers and configures a slide animator
  methods.registerAnimator = function (name, animator) {
    slideAnimators[name] = animator;
    if (typeof animator.configure === 'function') {
      animator.configure(supports3D, vendorPrefix);
    }
  };

  // returns a slide animation adaptor
  methods.slideAnimator = function (effect) {
    if (typeof slideAnimators[effect] === 'object') {
      return slideAnimators[effect];
    }
    throw new Error(
      'The slide animator for the ' + effect +
      ' effect has not been registered'
    );
  };

  // sets or gets an option for the set of matched sliders
  methods.option = function (setting, newValue) {

    if (typeof newValue === 'undefined') {
      return (this.data('bssettings') || {})[setting];
    }

    return this.each(function (i, el) {
      var $box = $(this)
        , settings = $box.data('bssettings') || {};

      settings[setting] = newValue;
      resetAutoScroll($box, settings);

      if (typeof settings.slideAnimator.reset === 'function') {
        settings.slideAnimator.reset($box, settings);
      }
    });
  };

  // Event listeners and controls ----------------------------------------------

  // initialise controls for $box
  var setupControls = function ($box, settings) {
    var $controls = $();

    if (settings.next != null) {
      $controls = $controls.add($(settings.next).on(
        'click', { reverse: false }, nextSlideListener
      ));
    }

    if (settings.prev != null) {
      $controls = $controls.add($(settings.prev).on(
        'click', { reverse: true }, nextSlideListener
      ));
    }

    if (settings.pause != null) {
      $controls = $controls.add($(settings.pause).on(
        'click', playPauseListener
      ));
    }

    $controls.data('bsbox', $box);
  };

  // event listener for a next button
  var nextSlideListener = function (ev) {
    var $box = $(this).data('bsbox');

    resetAutoScroll($box);
    showNextSlide($box, undefined, ev.data.reverse);
    ev.preventDefault();
  };

  // event listener for play pause button
  var playPauseListener = function (ev) {
    var $this = $(this)
      , $box = $this.data('bsbox');

    togglePlayPause.call($box);
    $this.toggleClass('paused');
    ev.preventDefault();
  };

  // event listener for pause on hover
  var togglePlayPause = function (ev, reset) {
    var $box = $(this)
      , settings = $box.data('bssettings');

    if (settings.autointv != null || reset) {
      settings.autointv = clearInterval(settings.autointv);
      if (!reset) return;
    }

    settings.autointv = setInterval(function () {
      showNextSlide($box);
    }, settings.timeout + settings.speed);
  };

  // moves the slider to the next or previous slide
  var showNextSlide = function ($box, index, reverse) {
    var settings = $box.data('bssettings')
      , $slides = $box.children()
      , currIndex = settings.bsfaceindex || 0
      , nextIndex = calculateIndex(currIndex, $slides.length, reverse, index)
      , $currSlide
      , $nextSlide;

    // only go forward if not already in motion
    // and user defined index is not out of bounds
    if ($box.hasClass('jbs-in-motion') || nextIndex === -1) return;

    $currSlide = $slides.eq(currIndex);
    $nextSlide = $slides.eq(nextIndex);
    $box.addClass('jbs-in-motion'); // stops user clunking through faces ----- FIXME: queue user clicks and keep rotating the box

    if (typeof settings.onbefore === 'function') {
      settings.onbefore.call($box, $currSlide, $nextSlide);
    }

    // add additional settings for the transition and 
    // call the slide animation
    $.extend(settings, settings.slideAnimator.transition($.extend({
        $box: $box
      , $slides: $slides
      , $currSlide: $currSlide
      , $nextSlide: $nextSlide
      , reverse: reverse
      , currIndex: currIndex
      , nextIndex: nextIndex
    }, settings)));

    setTimeout( // remove the active flag class once transition is complete
        function () {
          $box.removeClass('jbs-in-motion');
          if (typeof settings.onafter === 'function') {
            settings.onafter.call($box, $currSlide, $nextSlide);
          }
        }
      , settings.speed
    );

    // cache settings for next transition
    settings.bsfaceindex = nextIndex;
  };

  // if the box is autoscrolling it is reset
  var resetAutoScroll = function ($box, settings) {
    settings || (settings = $box.data('bssettings') || {});

    if (settings.autoscroll) {
      toggleplaypause.call($box, undefined, true, settings);
    }
  };

  // get the next slides index
  var calculateIndex = function (currIndex, slidesLen, reverse, index) {
    var nextIndex = index;

    if (nextIndex == null) { // came from next button click
      if (reverse) {
        nextIndex = currIndex - 1 < 0 ? slidesLen - 1 : currIndex - 1;
      }
      else {
        nextIndex = currIndex + 1 < slidesLen ? currIndex + 1 : 0;
      }
    }

    if ( // already on selected slide or incorrect index
      nextIndex === currIndex ||
      nextIndex >= slidesLen ||
      nextIndex < 0
    ) { return -1; }

    return nextIndex;
  };

  // set the correct vendor prefix for the css properties
  var vendorPrefix = (function () {
    var bs = document.body.style
      , prefix = '';

    if ('webkitTransition' in bs) {
      prefix = '-webkit-';
    }

    if ('MozTransition' in bs) {
      prefix = '-moz-';
    }

    supports3D = (
      'webkitPerspective' in bs ||
      'MozPerspective' in bs ||
      'perspective' in bs
    );
    return prefix;
  }());


  $.fn.boxSlider = function (m) {
    if (typeof m === 'string' && typeof methods[m] === 'function') {
      return methods[m].apply(this, Array.prototype.slice.call(arguments, 1));
    }

    return methods.init.apply(this, arguments);
  };

}(window, jQuery || Zepto));
