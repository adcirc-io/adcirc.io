import { dispatcher } from '../../../../adcirc-events/index'

function dataset ( gl ) {

    var _mesh = adcirc.mesh();
    var _geometry;
    var _view;
    var _shader;

    var _dataset = dispatcher();
    var _fields = [];

    var _timeseries;
    var _timeseries_name;

    _dataset.fields = function () {

        return _fields;

    };

    _dataset.gradient = function ( event ) {

        if ( _shader ) {

            _shader
                .gradient_stops( event.stops )
                .gradient_colors( event.colors );

            _dataset.dispatch({ type: 'render' } );

        }

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

                _geometry = adcirc
                    .geometry( gl, _mesh );

                var _bounds = _mesh.bounds( 'depth' );

                _shader = adcirc
                    .gradient_shader( gl, 6, _bounds[1], _bounds[0] );

                _shader.gradient_colors([
                    d3.rgb( 0, 100, 0 ),
                    d3.rgb( 0, 175, 0 ),
                    d3.rgb( 0, 255, 0 ),
                    d3.rgb( 255, 255, 255 ),
                    d3.rgb( 0, 255, 255 ),
                    d3.rgb( 0, 0, 255 )
                ]);

                _shader.gradient_stops([
                    _bounds[0], -1.75, -0.5, 0.0, 0.5, _bounds[1]
                ]);

                _view = adcirc
                    .view( gl, _geometry, _shader )
                    .nodal_value( 'depth' );

                _dataset.dispatch({
                    type: 'gradient',
                    values: _shader.gradient_stops(),
                    colors: _shader.gradient_colors()
                });

                _dataset.dispatch({
                    type: 'has_view',
                    view: _view
                });

            })
            .read( file );

        return _dataset;

    };

    _dataset.load_fort_63 = function ( file ) {

        var f63 = adcirc.fort63_cached( 20 )
            .on( 'progress', _dataset.dispatch )
            .on( 'timestep', function ( event ) {

                _timeseries = f63;
                var data_range = event.timestep.data_range()[0];
                _shader.gradient_stops( data_range );
                _mesh.nodal_value( 'elevation', event.timestep.data() );
                _view.nodal_value( 'elevation' );
                // _mesh.nodal_value( 'elevation', event.timestep.data() );

            } )
            .open( file );

    };

    _dataset.load_residuals = function ( file ) {

        var residuals = adcirc.fort63_cached( 20 )

            .on( 'timestep', function ( event ) {

                var index = event.timestep.index();
                console.log( index );

                if ( index == 0 ) {

                    _timeseries = residuals;

                    var data_range = event.timestep.data_range()[0];
                    _shader.gradient_stops( [ data_range[0], data_range[1] ] );

                }


                _mesh.elemental_value( 'residuals', event.timestep.data() );
                _view.elemental_value( 'residuals' );

            } )
            .on( 'progress', _dataset.dispatch )
            .open( file );

    };

    _dataset.mesh = function () {
        return _mesh;
    };

    _dataset.next_timestep = function () {

        if ( _timeseries ) _timeseries.next_timestep();

    };

    _dataset.previous_timestep = function () {

        if ( _timeseries ) _timeseries.previous_timestep()

    };

    _dataset.view = function ( value ) {

        if ( _mesh.nodal_value( value ) ) {

            _view.nodal_value( value );

        } else if ( _mesh.elemental_value( value ) ) {

            _view.elemental_value( value );

        }

        return _view;

    };

    return _dataset;

    function set_current_timeseries ( name, timeseries ) {

        if ( _timeseries ) {

            _timeseries.off( 'timestep', update_timeseries );

        }

        _timeseries = timeseries;
        _timeseries_name = name;



    }

    function update_timeseries ( event ) {

    }

}

export { dataset }