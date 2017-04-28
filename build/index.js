// https://github.com/adcirc-io/adcirc.io Version 0.0.1. Copyright 2017 Tristan Dyer.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

function dispatcher ( object ) {

    object = object || Object.create( null );

    var _listeners = {};
    var _oneoffs = {};

    object.on = function ( type, listener ) {

        if ( !arguments.length ) return object;
        if ( arguments.length == 1 ) return _listeners[ type ];

        if ( _listeners[ type ] === undefined ) {

            _listeners[ type ] = [];

        }

        if ( _listeners[ type ].indexOf( listener ) === - 1 ) {

            _listeners[ type ].push( listener );

        }

        return object;

    };

    object.once = function ( type, listener ) {

        if ( !arguments.length ) return object;
        if ( arguments.length == 1 ) return _oneoffs[ type ];

        if ( _oneoffs[ type ] === undefined ) {

            _oneoffs[ type ] = [];

        }

        if ( _oneoffs[ type ].indexOf( listener ) === - 1 ) {

            _oneoffs[ type ].push( listener );

        }

        return object;

    };

    object.off = function ( type, listener ) {

        var listenerArray = _listeners[ type ];
        var oneoffArray = _oneoffs[ type ];
        var index;

        if ( listenerArray !== undefined ) {

            index = listenerArray.indexOf( listener );

            if ( index !== - 1 ) {

                listenerArray.splice( index, 1 );

            }

        }

        if ( oneoffArray !== undefined ) {

            index = oneoffArray.indexOf( listener );

            if ( index !== -1 ) {

                oneoffArray.splice( index, 1 );

            }

        }

        return object;

    };

    object.dispatch = function ( event ) {

        var listenerArray = _listeners[ event.type ];
        var oneoffArray = _oneoffs[ event.type ];

        var array = [], i, length;

        if ( listenerArray !== undefined ) {

            if ( event.target === undefined )
                event.target = object;

            length = listenerArray.length;

            for ( i = 0; i < length; i ++ ) {

                array[ i ] = listenerArray[ i ];

            }

            for ( i = 0; i < length; i ++ ) {

                array[ i ].call( object, event );

            }

        }

        if ( oneoffArray !== undefined ) {

            if ( event.target === undefined )
                event.target = object;

            length = oneoffArray.length;

            for ( i = 0; i < length; i ++ ) {

                array[ i ] = oneoffArray[ i ];

            }

            for ( i = 0; i < length; i ++ ) {

                array[ i ].call( object, event );

            }

            _oneoffs[ event.type ] = [];

        }

        return object;

    };

    return object;

}

function dataset ( gl ) {

    var _dataset = dispatcher();
    var _views = [];

    var _mesh = adcirc.mesh();
    var _geometry;

    var _current_view;
    var _timestep_index = 0;
    var _timeseries_data = [];

    _dataset.mesh = function () {

        return _mesh;

    };


    _dataset.load_fort_14 = function ( file ) {

        var f14 = adcirc.fort14()
            .on( 'progress', _dataset.dispatch )
            .on( 'nodes', function ( event ) {

                _mesh.nodes( event.nodes );

            })
            .on( 'elements', function ( event ) {

                _mesh.elements( event.elements );

            })
            .on( 'ready', _dataset.dispatch )
            .on( 'ready', function () {

                // Create the geometry
                _geometry = adcirc.geometry( gl, _mesh );

                // Get the depth bounds
                var bounds = _mesh.bounds( 'depth' );

                // Create the shader to go with depth
                var shader = depth_shader( bounds[0], bounds[1] );

                // Add depth as a new view
                var view = adcirc.view( gl, _geometry, shader ).nodal_value( 'depth' );
                add_view( 'depth', view );

            })
            .read( file );

        return _dataset;

    };

    _dataset.load_fort_63 = function ( file ) {

        var f63 = adcirc.fort63_cached( 50 )
            .on( 'progress', _dataset.dispatch )
            .on( 'ready', _dataset.dispatch )
            .on( 'ready', function () {

                // Get the first timestep
                var timestep = f63.timestep( 0 );

                // Get the bounds
                var bounds = timestep.data_range()[0];

                // Create the shader
                var shader = elevation_shader( bounds[0], bounds[1] );

                // Create the view
                var view = adcirc.view( gl, _geometry, shader );
                add_view( 'elevation timeseries', view );


            })
            .on( 'timestep', function ( event ) {

                _timestep_index = event.timestep.index();

                _mesh.nodal_value( 'elevation timeseries', event.timestep.data() );

                _dataset.dispatch({
                    type: 'timestep',
                    time: event.timestep.model_time(),
                    step: event.timestep.model_timestep(),
                    index: event.timestep.index(),
                    num_datasets: event.timestep.num_datasets(),
                    bounds: event.timestep.data_range()[0]
                });

                request_render();

            })
            .on( 'finish', _dataset.dispatch )
            .open( file );

        _timeseries_data.push( f63 );

        return _dataset;

    };

    _dataset.request_timestep = function ( index ) {

        if ( index > _timestep_index ) _dataset.next_timestep();
        if ( index < _timestep_index ) _dataset.previous_timestep();

    };

    _dataset.next_timestep = function () {

        _timeseries_data.forEach( function ( data ) {

            data.next_timestep();

        });

        _dataset.view( _current_view );

    };

    _dataset.previous_timestep = function () {

        _timeseries_data.forEach( function ( data ) {

            data.previous_timestep();

        });

        _dataset.view( _current_view );

    };

    _dataset.view = function ( name ) {

        for ( var i=0; i<_views.length; ++i ) {

            var view = _views[i];

            if ( view.name === name ) {

                _current_view = name;
                _mesh.nodal_value( name );
                view.view.nodal_value( name );

                _dataset.dispatch({
                    type: 'view',
                    view: view.view
                });

                return;

            }

        }

    };

    return _dataset;

    function add_view ( name, view ) {

        _views.push({
            name: name,
            view: view
        });

        _dataset.dispatch({
            type: 'view_created',
            name: name,
            view: view
        });

    }

    function depth_shader ( lower_bound, upper_bound ) {

        var shader = adcirc.gradient_shader( gl, 6 );

        shader.gradient_stops([ lower_bound, -1.75, -0.5, 0.0, 0.5, upper_bound ]);
        shader.gradient_colors([
            d3.rgb( 0, 100, 0 ),
            d3.rgb( 0, 175, 0 ),
            d3.rgb( 0, 255, 0 ),
            d3.rgb( 255, 255, 255 ),
            d3.rgb( 0, 255, 255 ),
            d3.rgb( 0, 0, 255 )
        ]);

        return shader;

    }

    function elevation_shader ( lower_bound, upper_bound ) {

        var shader = adcirc.gradient_shader ( gl, 3 );

        shader.gradient_stops([ lower_bound, 0.0, upper_bound ]);
        shader.gradient_colors([
            d3.color( 'steelblue' ).rgb(),
            d3.color( 'white' ).rgb(),
            d3.color( 'lightsteelblue' ).rgb()
        ]);

        return shader;

    }

    function request_render () {

        _dataset.dispatch({
            type: 'render'
        });

    }

}

function slider () {

    var _selection;
    var _bar;

    var _arrows = 'both';
    var _bar_color = 'dimgray';
    var _color = 'lightgray';
    var _current = 0;
    var _width;
    var _height = 20;

    var _drag_bar = d3.drag().on( 'drag', dragged );
    var _drag_slider = d3.drag().on( 'start', clicked ).on( 'drag', dragged );
    var _draggable = true;
    var _jumpable = true;
    var _request = false;

    var _continuous = false;
    var _step = 1;
    var _domain = [0, 100];
    var _value_to_value = d3.scaleQuantize();
    var _value_to_percent = d3.scaleLinear().range( [0, 100] ).clamp( true );
    var _pixel_to_value = d3.scaleLinear();

    function _slider ( selection ) {

        // Setup
        _selection = selection
            .style( 'position', 'relative' )
            .style( 'width', '100%' )
            .style( 'margin-top', '4px' )
            .style( 'margin-bottom', '4px' )
            .style( 'user-select', 'none' );

        _bar = _selection
            .selectAll( 'div' )
            .data( [ 'slider_bar' ] );

        _bar.exit()
            .remove();

        _bar = _bar.enter()
            .append( 'div' )
            .merge( _bar );

        _bar.style( 'position', 'relative' )
            .style( 'left', 0 )
            .style( 'width', '1px' )
            .style( 'background-clip', 'content-box' )
            .style( 'margin', '-4px' )
            .style( 'border-width', '4px' )
            .style( 'border-style', 'solid' )
            .style( 'user-select', 'none' );

        // Scales
        _width = _selection.node().getBoundingClientRect().width;
        _pixel_to_value.domain( [ 0, _width ] );

        // Events
        _selection
            .on( 'mousedown', clicked )
            .on( 'wheel', scrolled );

        // Initialize
        _slider.arrows( _arrows );
        _slider.bar( _bar_color );
        _slider.color( _color );
        _slider.domain( _domain );
        _slider.draggable( _draggable );
        _slider.height( _height );
        _slider.jumpable( _jumpable );

        return _slider;

    }

    _slider.arrows = function ( _ ) {
        if ( !arguments.length ) return _arrows;
        if ( _ == 'top' || _ == 'bottom' || _ == 'both' || _ == 'none' ) {
            _arrows = _;
            if ( _bar ) {
                switch ( _arrows ) {

                    case 'both':
                        _bar.style( 'border-color', _bar_color + ' transparent ' + _bar_color + ' transparent' );
                        break;

                    case 'top':
                        _bar.style( 'border-color', _bar_color + ' transparent transparent transparent' );
                        break;

                    case 'bottom':
                        _bar.style( 'border-color', 'transparent transparent ' + _bar_color + ' transparent' );
                        break;

                    default:
                        _bar.style( 'border-color', 'transparent transparent transparent transparent' );
                        break;

                }
            }
        }
        return _slider;
    };

    _slider.bar = function ( _ ) {
        if ( !arguments.length ) return _bar_color;
        _bar_color = _;
        if ( _bar ) {
            _bar.style( 'background-color', _bar_color );
            _slider.arrows( _arrows );
        }
        return _slider;
    };

    _slider.color = function ( _ ) {
        if ( !arguments.length ) return _color;
        _color = _;
        if ( _selection ) _selection.style( 'background-color', _color );
        return _slider;
    };

    _slider.continuous = function ( _ ) {
        return arguments.length ? ( _continuous = !!_, _slider ) : _continuous;
    };

    _slider.current = function ( _ ) {
        return arguments.length ? ( set_current( _ ), _slider ) : _current;
    };

    _slider.domain = function ( _ ) {
        if ( !arguments.length ) return _value_to_percent.domain();

        _domain = _;
        var _range = [];
        _step = arguments.length == 2 ? arguments[1] : 1;
        for ( var i=_[0]; i<=_[1]; i+=_step ) _range.push( i );

        _value_to_value.domain( _ ).range( _range );
        _value_to_percent.domain( _ );
        _pixel_to_value.range( _ );

        return _slider;
    };

    _slider.draggable = function ( _ ) {
        if ( !arguments.length ) return _draggable;
        _draggable = !!_;
        if ( _bar ) {
            if ( !_draggable ) _bar.style( 'cursor', null ).on( '.drag', null );
            else _bar.style( 'cursor', 'pointer' ).call( _drag_bar );
        }
        return _slider;
    };

    _slider.height = function ( _ ) {
        if ( !arguments.length ) return _height;
        _height = _;
        if ( _selection ) _selection.style( 'min-height', _height + 'px' );
        if ( _bar ) _bar.style( 'min-height', _height + 'px' );
        return _slider;
    };

    _slider.jumpable = function ( _ ) {
        if ( !arguments.length ) return _jumpable;
        _jumpable = !!_;
        if ( _selection ) {
            if ( !_jumpable ) _selection.style( 'cursor', null ).on( '.drag', null );
            else _selection.style( 'cursor', 'pointer' ).call( _drag_slider );
        }
        return _slider;
    };

    _slider.needs_request = function ( _ ) {
        if ( !arguments.length ) return _request;
        _request = !!_;
        return _slider;
    };

    _slider.set = function ( value ) {

        set_current( value );

    };

    return dispatcher( _slider );

    function clamp ( value ) {
        var domain = _value_to_percent.domain();
        if ( value < domain[0] ) return domain[0];
        if ( value > domain[1] ) return domain[1];
        return value;
    }

    function clicked () {

        if ( _jumpable ) {
            var pixel = d3.mouse( this )[ 0 ];
            if ( pixel < 0 ) pixel = 0;
            if ( pixel > _width ) pixel = _width;
            var value = _pixel_to_value( pixel );
            if ( set_current( value ) ) dispatch_current();
        }

    }

    function dispatch_current () {

        _slider.dispatch( {
            type: 'value',
            value: _current
        } );

    }

    function dispatch_request ( value ) {

        var request_value = _current;
        if ( value > _current ) request_value += _step;
        if ( value < _current ) request_value -= _step;

        if ( request_value !== _current ) {

            _slider.dispatch( {
                type: 'request',
                value: request_value
            } );

        }

    }

    function dragged () {

        if ( _draggable ) {
            var pixel = d3.event.x;
            if ( pixel < 0 ) pixel = 0;
            if ( pixel > _width ) pixel = _width;
            var value = _pixel_to_value( pixel );
            if ( _request ) dispatch_request( value );
            else if ( set_current( value ) ) dispatch_current();
        }

    }

    function scrolled () {

        if ( _draggable ) {
            var multiplier = d3.event.shiftKey ? 10*_step : _step;
            var direction = d3.event.deltaX < 0 || d3.event.deltaY < 0 ? 1 : -1;
            if ( set_current( _slider.current() + multiplier * direction ) ) dispatch_current();
        }

    }

    function set_current ( value ) {
        value = _continuous ? clamp( value ) : _value_to_value( value );
        if ( value !== _current ) {
            if ( _jumpable ) _current = value;
            else _current = value > _current ? _current + _step : _current - _step;
            if ( _bar ) _bar.style( 'left', _value_to_percent( _current ) + '%' );
            return true;
        }
        return false;
    }

    

}

function vertical_gradient () {

    var _selection;
    var _bar;
    var _track;
    var _sliders;

    var _bar_width = 50;
    var _track_width = 75;
    var _height = 250;

    var _stops = [
        { stop: 0, color: 'lightsteelblue' },
        { stop: 1, color: 'steelblue' }
    ];

    var _percent_to_value = d3.scaleLinear().domain( [ 0, 1 ] ).range( [ 0, 1 ] );
    var _percent_to_pixel = d3.scaleLinear().domain( [ 0, 1 ] ).range( [ _height, 0 ] );


    function _gradient ( selection ) {

        // Keep track of selection that will be the gradient
        _selection = selection;

        // Apply the layout
        layout( _selection );

        // Return the gradient
        return _gradient;

    }

    _gradient.stops = function ( stops, colors ) {

        var extent = d3.extent( stops );

        _percent_to_value.range( extent );

        _stops = [];

        for ( var i=0; i<stops.length; ++i ) {

            _stops.push( { stop: _percent_to_value.invert( stops[i] ), color: colors[i] } );

        }

        _stops = _stops.sort( sort );

        layout( _selection );

        return _gradient;

    };

    function build_css_gradient ( stops ) {

        var css = 'linear-gradient( 0deg, ';

        for ( var i=0; i<stops.length; ++i  ){

            var color = stops[i].color;
            var percent = 100 * stops[i].stop;
            css += color + ' ' + percent + '%';

            if ( i < stops.length-1 ) css += ',';

        }

        return css + ')';

    }

    function dragged ( d ) {

        var y = Math.max( 0, Math.min( _height, d3.event.y ) );

        d3.select( this )
            .style( 'top', y + 'px' );

        d.stop = _percent_to_pixel.invert( y );

        var sorted = _stops.sort( sort );

        _bar.style( 'background', build_css_gradient( sorted ) );
        _sliders.each( slider_text );

        _gradient.dispatch({
            type: 'gradient',
            stops: sorted.map( function ( stop ) { return _percent_to_value( stop.stop ); } ),
            colors: sorted.map( function ( stop ) { return stop.color; } )
        });

    }

    function layout ( selection ) {

        selection
            .style( 'position', 'relative' )
            .style( 'width', ( _bar_width + _track_width ) + 'px' )
            .style( 'user-select', 'none' )
            .style( 'min-height', _height + 'px' );

        _bar = selection
            .selectAll( '.gradient-bar' )
            .data( [ {} ] );

        _bar.exit().remove();

        _bar = _bar.enter()
            .append( 'div' )
            .attr( 'class', 'gradient-bar' )
            .merge( _bar );

        _bar.style( 'position', 'absolute' )
            .style( 'top', 0 )
            .style( 'left', 0 )
            .style( 'width', _bar_width + 'px' )
            .style( 'height', '100%' )
            .style( 'background', build_css_gradient( _stops ) )
            .style( 'user-select', 'none' );

        _track = selection
            .selectAll( '.gradient-track' )
            .data( [ {} ] );

        _track.exit().remove();

        _track = _track.enter()
            .append( 'div' )
            .attr( 'class', 'gradient-track' )
            .merge( _track );

        _track.style( 'position', 'absolute' )
            .style( 'top', 0 )
            .style( 'left', _bar_width + 'px' )
            .style( 'width', _track_width + 'px' )
            .style( 'height', '100%' )
            .style( 'user-select', 'none' );

        position_sliders();

    }

    function position_sliders () {

        _sliders = _track.selectAll( '.slider' )
            .data( _stops );

        _sliders.exit().remove();

        _sliders = _sliders.enter()
            .append( 'div' )
            .attr( 'class', 'slider' )
            .merge( _sliders );

        _sliders
            .style( 'width', '0px' )
            .style( 'height', '1px' )
            .style( 'border-width', '8px' )
            .style( 'border-style', 'solid' )
            .style( 'margin-top', '-8px' )
            .style( 'margin-left', '-8px')
            .style( 'position', 'absolute' )
            .style( 'left', 0 )
            .each( function ( d ) {

                d3.select( this )
                    .style( 'top', ( _height - d.stop * _height ) + 'px' )
                    .style( 'border-color', 'transparent ' + d.color + ' transparent transparent' )
                    .style( 'user-select', 'none' );

            })
            .each( slider_text )
            .call( d3.drag()
                .on( 'drag', dragged )
            );

    }

    function sort ( a, b ) {

        return a.stop > b.stop;

    }

    function slider_text ( d ) {

        var text = d3.select( this )
            .selectAll( 'div' ).data( [ {} ] );

        text.exit().remove();

        text = text.enter()
            .append( 'div' )
            .merge( text );

        text.style( 'position', 'absolute' )
            .style( 'top', '50%' )
            .style( 'left', '8px' )
            .style( 'transform', 'translateY(-50%)' )
            .style( 'padding-left', '4px' )
            .style( 'font-size', '13px' )
            .style( 'font-family', 'serif' )
            .style( 'min-width', ( _track_width - 12 ) + 'px' )
            .style( 'user-select', 'none' )
            .style( 'cursor', 'default' )
            .text( _percent_to_value( d.stop ).toFixed( 5 ) );

    }

    return dispatcher( _gradient );

}

function display_view () {

    var _gradient = vertical_gradient();
    var _current_view;

    var _save_shader;
    var _lock_shader;
    var _locked = false;

    var _bounds;

    var _header_text = 'Display Options';

    var _view = function ( selection ) {

        // Set up the header
        var _header = selection.selectAll( '.display-header' )
            .data( [ _header_text ] );

        _header.exit().remove();

        _header = _header.enter()
            .append( 'div' )
            .attr( 'class', 'header display-header' )
            .merge( _header );

        _header.text( function ( d ) {
            return d;
        } );


        // Set up gradient section
        var _gradient_section = selection.selectAll( '.gradient-section' )
            .data( [ {} ] );

        _gradient_section = _gradient_section.enter()
            .append( 'div' )
            .attr( 'class', 'gradient-section two-col' )
            .merge( _gradient_section );

        var left_section = _gradient_section.append( 'div' )
            .attr( 'class', 'left' )
            .style( 'flex', '1 0 auto' )
            .style( 'margin-top', '10px' );
        var right_section = _gradient_section.append( 'div' )
            .attr( 'class', 'right' )
            .style( 'margin', '10px 0 10px 0' )
            .style( 'flex', '0 1 auto');

        // Set up buttons
        var lock_button = icon_button( left_section.append( 'div' ), 'Lock Gradient', 'fa-lock' )
            .on( 'click', toggle_gradient_lock );
        var bounds_button = icon_button( left_section.append( 'div' ), 'Fit Data Bounds', 'fa-expand' )
            .on( 'click', fit_bounds );

        // Set up gradient section
        var _grad = right_section.selectAll( '.display-gradient' )
            .data( [ {} ] );

        _grad.exit().remove();

        _grad = _grad.enter()
            .append( 'div' )
            .attr( 'class', 'display-gradient' )
            .merge( _grad );

        _gradient( _grad );

        _gradient.on( 'gradient', on_gradient );

        return _view;

    };

    _view.bounds = function ( bounds ) {

        if ( !bounds ) return _bounds;
        _bounds = bounds;
        return _view;

    };

    _view.view = function ( view ) {

        if ( _locked && _current_view && _save_shader ) {

            _current_view.shader( _save_shader );

        }

        _current_view = view;

        if ( _locked ) {

            _save_shader = _current_view.shader();
            _current_view.shader( _lock_shader );

        }

        set_gradient( _current_view.shader() );

        return _view;

    };

    dispatcher( _view );

    return _view;

    function fit_bounds () {

        if ( _bounds && _current_view ) {

            var stops = _current_view.shader().gradient_stops();
            stops[ 0 ] = _bounds[0];
            stops[ stops.length - 1 ] = _bounds[1];

            for ( var i=1; i<stops.length-1; ++i  ) {

                if ( stops[i] < _bounds[0] ) stops[i] = _bounds[0];
                if ( stops[i] > _bounds[1] ) stops[i] = _bounds[1];

            }

            _current_view.shader().gradient_stops( stops );

            set_gradient( _current_view.shader() );

        }

    }

    function icon_button ( div, text, icon ) {

        div
            .attr( 'class', 'two-col clickable' )
            .style( 'justify-content', 'space-between' )
            .style( 'margin-bottom', '8px' )
            .style( 'border', '1px solid lightgray')
            .style( 'user-select', 'none' );

        div.append( 'div' )
            .attr( 'class', 'left' )
            .style( 'text-align', 'center' )
            .append( 'i' )
            .attr( 'class', 'button-icon fa ' + icon );

        div.append( 'div' )
            .attr( 'class', 'right button-text' )
            .style( 'flex', '1 0 auto' )
            .style( 'text-align', 'center' )
            .text( text );

        div.on( 'mouseover', function () {

            var button$$1 = d3.select( this );
            if ( !button$$1.classed( 'on' ) )
                d3.select( this ).style( 'background-color', 'lightgray' );

        }).on( 'mouseout', function () {

            var button$$1 = d3.select( this );
            if ( !button$$1.classed( 'on' ) )
                d3.select( this ).style( 'background-color', null );

        });

        return div;

    }

    function on_gradient ( event ) {

        if ( _current_view ) {

            _current_view.shader().gradient_stops( event.stops );
            _current_view.shader().gradient_colors( event.colors );
            _view.dispatch({ type: 'render' });

        }

    }

    function set_gradient ( shader ) {

        _gradient.stops(
            shader.gradient_stops(),
            shader.gradient_colors()
        );

    }

    function toggle_button ( selection, on_text, off_text, on_icon, off_icon ) {

        var toggled = selection.classed( 'on' );

        if ( !toggled ) {

            selection
                .classed( 'on', true )
                .style( 'background-color', 'steelblue' )
                .style( 'color', 'white' );

            selection.select( '.button-icon' )
                .attr( 'class', 'button-icon fa ' + on_icon );

            selection.select( '.button-text' )
                .text( on_text );

        } else {

            selection
                .classed( 'on', false )
                .style( 'background-color', null )
                .style( 'color', null );

            selection.select( '.button-icon' )
                .attr( 'class', 'button-icon fa ' + off_icon );

            selection.select( '.button-text' )
                .text( off_text );


        }

    }

    function toggle_gradient_lock () {

        var button$$1 = d3.select( this );

        if ( _current_view ) {

            if ( !_locked ) {

                _locked = true;
                _lock_shader = _current_view.shader();

            } else {

                _locked = false;
                if ( _save_shader ) {
                    _current_view.shader( _save_shader );
                    _lock_shader = _save_shader;
                    _save_shader = null;
                    set_gradient( _current_view.shader() );
                }

            }

            toggle_button( button$$1, 'Unlock Gradient', 'Lock Gradient', 'fa-unlock', 'fa-lock' );

        }

    }

}

function timeseries_view () {

    var _current_timestep;
    var _timestep_index;
    var _timestep_step;
    var _timestep_time;
    var _timestep_slider = slider()
        .height( 15 )
        .jumpable( false )
        .needs_request( true );

    var _slider;

    var _header_text = 'Timeseries Data';
    var _index_text = 'Dataset:';
    var _step_text = 'Timestep:';
    var _time_text = 'Model Time:';

    var _initialized = false;

    var _view = function ( selection ) {

        // Set up the header
        var _header = selection.selectAll( '.timeseries-header' )
            .data( [ _header_text ] );

        _header.exit().remove();

        _header = _header.enter()
            .append( 'div' )
            .attr( 'class', 'header timeseries-header' )
            .merge( _header );

        _header.text( function ( d ) {
            return d;
        } );


        // Set up info section
        var _info = selection.selectAll( '.timeseries-info' )
            .data( [ {} ] );

        _info.exit().remove();

        _info = _info.enter()
            .append( 'div' )
            .attr( 'class', 'timeseries-info item' )
            .merge( _info );

        var _index = _info.append( 'div' )
            .attr( 'class', 'two-col' );
        var _step = _info.append( 'div' )
            .attr( 'class', 'two-col' );
        var _time = _info.append( 'div' )
            .attr( 'class', 'two-col' );

        _index.append( 'div' ).attr( 'class', 'left' ).text( _index_text );
        _step.append( 'div' ).attr( 'class', 'left' ).text( _step_text );
        _time.append( 'div' ).attr( 'class', 'left' ).text( _time_text );

        _timestep_index = _index.append( 'div' ).attr( 'class', 'right' );
        _timestep_step = _step.append( 'div' ).attr( 'class', 'right' );
        _timestep_time = _time.append( 'div' ).attr( 'class', 'right' );


        // Set up slider
        _slider = selection.selectAll( '.timeseries-slider' )
            .data( [ {} ] );

        _slider.exit().remove();

        _slider = _slider.enter()
            .append( 'div' )
            .attr( 'class', 'timeseries-slider item' )
            .merge( _slider )
            .append( 'div' );

        _timestep_slider( _slider );

        set_timestep( _current_timestep );

    };

    _view.timestep = function ( timestep ) {

        if ( !arguments.length ) return _current_timestep;
        set_timestep( timestep );
        return _view;

    };

    dispatcher( _view );

    _timestep_slider.on( 'request', _view.dispatch );

    return _view;

    function set_timestep ( timestep ) {

        if ( timestep !== undefined ) {

            _current_timestep = timestep;
            _timestep_slider.set( _current_timestep.index );

            if ( !_initialized ) {

                _initialized = true;
                _timestep_slider.domain( [ 0, _current_timestep.num_datasets ] );

            }

            if ( _timestep_index ) _timestep_index.text(
                ( _current_timestep.index + 1 ).toLocaleString() +
                '/' +
                _current_timestep.num_datasets.toLocaleString()
            );
            if ( _timestep_step ) _timestep_step.text( _current_timestep.step.toLocaleString() );
            if ( _timestep_time ) _timestep_time.text( _current_timestep.time.toLocaleString() );

        }

    }

}

// Build the UI
var canvas = d3.select( '#canvas' );

// Initialize the renderer
var renderer = adcirc
    .gl_renderer( canvas )
    .clear_color( d3.color( '#666666' ) );

// Initialize the UI
var ui = adcirc
    .ui( d3.select( 'body' ) );

// The container for available mesh fields
var fields;


//// Sidebar sections

// The sidebar itself
var sidebar = d3.select( '#sidebar' );

// Mesh Properties
var mesh_properties_section = sidebar.append( 'div' ).attr( 'class', 'item' );

// Mesh data
var mesh_data_section= sidebar.append( 'div' ).attr( 'class', 'item' );

// Timeseries things
var timeseries_section = sidebar.append( 'div' ).attr( 'class', 'item' );
var ts_selection;
var ts_view = timeseries_view();

// Display options
var display_options_section = sidebar.append( 'div' ).attr( 'class', 'item' );
var display_options = display_view()
    .on( 'render', renderer.render );

// Step 1 is to select a fort.14 file
ui.fort14.file_picker( function ( file ) {

    // Remove the opening message
    d3.select( '#opening-message' ).remove();

    // Remove the fort.14 button
    d3.select( '#fort14-item' ).remove();

    // Add load bar
    var progress = adcirc.progress()
        .height( 25 );

    var selection = sidebar.append( 'div' )
        .attr( 'class', 'item' );

    progress( selection.append( 'div' ) );

    // Create the dataset
    var data = dataset( renderer.gl_context() );
    var mesh = data.mesh();

    // Connect events
    data.on( 'progress', update_progress );
    data.on( 'render', renderer.render );

    data.once( 'ready', function () {

        selection.remove();

        data.off( 'progress', update_progress );

        display_mesh( data );

    });

    data.on( 'has_view', function ( event ) {

        renderer.add_view( event.view );

    } );

    ts_view.on( 'request', function ( event ) {

        data.request_timestep( event.value );

    });

    // Zoom to the mesh once it's loaded
    mesh.on( 'bounding_box', function () {

        renderer.zoom_to( mesh, 200 );

    });

    // Load the file
    data.load_fort_14( file );

    // The progress bar update function
    function update_progress ( event ) {

        progress.progress( event.progress );

    }

});

// Step 2 is to display fort.14 information and provide options for loading more data
function display_mesh ( data ) {

    // Get the mesh
    var mesh = data.mesh();

    // Add mesh info header
    mesh_properties_section.append( 'div' )
        .attr( 'class', 'header' )
        .text( 'Mesh Properties' );

    var mesh_info = mesh_properties_section
        .attr( 'class', 'item' );

    // Add number of nodes
    var node_info = mesh_info
        .append( 'div' )
        .attr( 'class', 'two-col' );

    node_info.append( 'div' ).attr( 'class', 'left' ).text( 'Nodes:' );
    node_info.append( 'div' ).attr( 'class', 'right' ).text( mesh.num_nodes().toLocaleString() );

    var element_info = mesh_info
        .append( 'div' )
        .attr( 'class', 'two-col' );

    element_info.append( 'div' ).attr( 'class', 'left' ).text( 'Elements:' );
    element_info.append( 'div' ).attr( 'class', 'right' ).text( mesh.num_elements().toLocaleString() );

    // Add the mesh datasets header
    mesh_data_section
        .append( 'div' )
        .attr( 'class', 'header' )
        .text( 'Mesh Data' );

    // Initialize display of mesh datasets
    initialize_mesh_datasets( mesh_data_section.append( 'div' ).attr( 'class', 'item' ), data );

    // Add the fort.63 and residuals buttons
    var fort63_item = mesh_data_section.append( 'div' )
        .attr( 'class', 'item' );

    var fort63 = fort63_item.append( 'div' )
        .attr( 'class', 'button bordered' )
        .text( 'Open fort.63' );

    adcirc.button().file_picker( function ( file ) {

        // Remove the fort.63 button
        fort63.remove();

        // Create load bar
        var progress = adcirc.progress();

        // Add load bar
        progress( fort63_item.append( 'div' ) );

        // Respond to events
        data.on( 'progress', update_progress );

        data.once( 'finish', function ( event ) {

            data.off( 'progress', update_progress );

            fort63_item.remove();

        });

        data.once( 'ready', function () {

            show_timeseries_controls( timeseries_section );

        });

        data.on( 'timestep', function ( event ) {

            ts_view.timestep( event );
            display_options.bounds( event.bounds );

        });

        // Repond to keyboard events
        d3.select( 'body' ).on( 'keydown', function () {

            switch ( d3.event.key ) {

                case 'ArrowRight':
                    data.next_timestep();
                    break;

                case 'ArrowLeft':
                    data.previous_timestep();
                    break;

            }

        });

        data.load_fort_63( file );

        // Progress bar update function
        function update_progress ( event ) {

            progress.progress( event.progress );

        }

    })( fort63 );

    // Add the display options
    display_options( display_options_section );

}

function initialize_mesh_datasets ( selection, data ) {

    fields = selection;

    data.on( 'view', function ( event ) {

        // Tell the renderer to render the view
        renderer.set_view( event.view );
        renderer.render();

        // Tell the display options to show the gradient
        display_options.view( event.view );

    });

    data.on( 'view_created', function ( event ) {

        // Add the field to the list of mesh data
        var field = new_field( event.name );

        // When depth is loaded for the first time, display it
        if ( event.name == 'depth' ) {

            pick_field( 'depth' );
            data.view( 'depth' );

        }

        // Respond to field clicks
        field.on( 'click', function ( d ) {

            pick_field( d );
            data.view( d );

        } );

    });

}

function show_timeseries_controls ( sidebar ) {

    if ( !ts_selection ) ts_selection = sidebar.append( 'div' ).attr( 'class', 'item' );
    ts_view( ts_selection );

}

function new_field ( name ) {

    // Full size clickable item
    var field = fields.append( 'div' )
        .attr( 'class', 'two-col clickable' )
        .data( [ name ] );

    // Left column has field name
    field.append( 'div' ).attr( 'class', 'left' ).text( upper( name ) );

    // Right column has eyeball
    field.append( 'div' ).attr( 'class', 'right' )
        .append( 'i' ).attr( 'class', 'fa fa-fw fa-eye' );

    return field;

}

function pick_field ( name ) {

    fields.selectAll( '.clickable' ).each( function ( d ) {

        var field = d3.select( this );

        if ( d === name ) {

            field.selectAll( '.right' ).style( 'color', 'limegreen' );


        } else {

            field.selectAll( '.right' ).style( 'color', null );

        }

    });

}

function upper ( string ) {

    return string.replace( /\b\w/g, function ( l ) { return l.toUpperCase() } );

}

// var elemental_values = d3.select( '#elemental_values' );
// var nodal_values = d3.select( '#nodal_values' );
// var num_nodes = d3.select( '#num-nodes' );
// var num_elements = d3.select( '#num-elements' );
// var bounding_box = d3.select( '#bounding-box' );
//
// // Set up data views
// var initialized = false;
// var view_mesh = mesh_view()
//     .elemental_values( elemental_values )
//     .nodal_values( nodal_values )
//     .num_nodes( num_nodes )
//     .num_elements( num_elements )
//     .bounding_box( bounding_box );
//
// // There'll only be a single dataset to begin with
// var data = dataset( renderer.gl_context() );
// var mesh = data.mesh();
//
// // Set up file pickers
// ui.fort14.file_picker( data.load_fort_14 );
// ui.fort63.file_picker( data.load_fort_63 );
// ui.residuals.file_picker( data.load_residuals );
//
// // Set up gradient slider
// ui.colorbar.on( 'gradient', data.gradient );
//
// // Connect the views to the data
// view_mesh( data.mesh() );
//
// // Respond to events from the mesh
// mesh.on( 'bounding_box', function () {
//
//     if ( !initialized ) {
//
//         renderer.zoom_to( mesh, 200 );
//         initialized = true;
//
//     }
//
// });
//
// // Respond to events from the dataset
// data.on( 'has_view', function ( event ) {
//
//     renderer.add_view( event.view );
//
// });
//
// data.on( 'progress', function ( event ) {
//
//     ui.progress.progress( event.progress );
//
// });
//
// data.on( 'gradient', function ( event ) {
//
//     ui.colorbar.stops( event.values, event.colors );
//
// });
//
// data.on( 'render', renderer.render );
//
// // Respond to events from views
// view_mesh.on( 'nodal_value', function ( event ) {
//
//     data.view( event.nodal_value );
//
// });
//
// view_mesh.on( 'elemental_value', function ( event ) {
//
//     data.view( event.elemental_value );
//
// });
//
// // Repond to keyboard events
// d3.select( 'body' ).on( 'keydown', function () {
//
//     switch ( d3.event.key ) {
//
//         case 'ArrowRight':
//             data.next_timestep();
//             break;
//
//         case 'ArrowLeft':
//             data.previous_timestep();
//             break;
//
//     }
//
// });

})));
