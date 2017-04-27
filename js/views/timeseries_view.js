import { dispatcher } from '../../../../adcirc-events/index'
import { slider } from '../../../../adcirc-ui/index'

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

export { timeseries_view }