import { dispatcher } from '../../../../adcirc-events/index'
import { gradient } from '../../../../adcirc-ui/index'

function display_view ( dataset ) {

    var _dataset = dataset;

    var _gradient = gradient();
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
        icon_button( left_section.append( 'div' ), 'Lock Gradient', 'fa-lock' )
            .on( 'click', toggle_gradient_lock );
        icon_button( left_section.append( 'div' ), 'Fit Data Bounds', 'fa-expand' )
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

        // Connect to the dataset
        _dataset
            .on( 'view', function ( event ) {

                _view.view( event.view );

            })
            .on( 'timestep', function ( event ) {

                _bounds = event.bounds;

            })
            .on( 'bounds', function ( event ) {

                _bounds = event.bounds;

            });

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

        if ( !_locked && _bounds ) {

            fit_bounds();

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

            var button = d3.select( this );
            if ( !button.classed( 'on' ) )
                d3.select( this ).style( 'background-color', 'lightgray' );

        }).on( 'mouseout', function () {

            var button = d3.select( this );
            if ( !button.classed( 'on' ) )
                d3.select( this ).style( 'background-color', null );

        });

        return div;

    }

    function on_gradient ( event ) {

        if ( _current_view ) {

            _current_view.shader().gradient_stops( event.stops );
            _current_view.shader().gradient_colors( event.colors );
            _dataset.repaint();

        }

    }

    function set_gradient ( shader ) {

        _gradient.stops(
            shader.gradient_stops(),
            shader.gradient_colors()
        );

        _dataset.repaint();

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

        var button = d3.select( this );

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

            toggle_button( button, 'Unlock Gradient', 'Lock Gradient', 'fa-unlock', 'fa-lock' );

        }

    }

}

export { display_view }