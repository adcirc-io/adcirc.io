import { dispatcher } from '../../../../adcirc-events/index'

function dataset ( renderer ) {

    var _renderer = renderer;
    var _gl = _renderer.gl_context();

    var _dataset = dispatcher();
    var _views = [];

    var _mesh = adcirc.mesh();
    var _geometry;

    var _current_view;
    var _timestep_index = 0;
    var _timeseries_data = [];

    _dataset.find_node = function ( coordinates ) {

        if ( _mesh ) {

            return _mesh.find_node( coordinates );

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
            .on( 'ready', function () {

                // Create the geometry
                _geometry = adcirc.geometry( _gl, _mesh );

                // Get the depth bounds
                var bounds = _mesh.bounds( 'depth' );

                // Create the shader to go with depth
                var shader = depth_shader( bounds[0], bounds[1] );

                // Add depth as a new view
                var view = adcirc.view( _gl, _geometry, shader ).nodal_value( 'depth' );
                add_view( 'depth', view );

                // Tell everyone the mesh is loaded
                _dataset.dispatch({
                    type: 'mesh_loaded'
                });

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
                var view = adcirc.view( _gl, _geometry, shader );
                add_view( 'elevation timeseries', view );


            })
            .on( 'timestep', function ( event ) {

                _timestep_index = event.timestep.index();

                _mesh.nodal_value( 'elevation timeseries', event.timestep.data() );

                _dataset.dispatch({
                    type: 'has_timeseries'
                });

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
            .on( 'start', _dataset.dispatch )
            .on( 'finish', _dataset.dispatch )
            .open( file );

        _timeseries_data.push( f63 );

        return _dataset;

    };

    _dataset.mesh = function () {

        return _mesh;

    };

    _dataset.repaint = function () {

        _renderer.render();

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

    _dataset.timeseries = function ( node_number, callback ) {

        if ( _timeseries_data.length > 0 ) {
            _timeseries_data[ 0 ].timeseries( node_number, callback );
        }

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
                    name: name,
                    view: view.view
                });

                _dataset.repaint();

                return;

            }

        }

    };

    _dataset.views = function () {

        return _views;

    };

    return _dataset;

    function add_view ( name, view ) {

        _views.push({
            name: name,
            view: view
        });

        _dataset.dispatch({
            type: 'new_view',
            name: name,
            view: view
        });

    }

    function depth_shader ( lower_bound, upper_bound ) {

        var shader = adcirc.gradient_shader( _gl, 6 );

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

        var shader = adcirc.gradient_shader ( _gl, 3 );

        shader.gradient_stops([
            lower_bound,
            0.0,
            upper_bound
        ]);
        shader.gradient_colors([
            d3.color( 'white' ).rgb(),
            d3.color( 'lightsteelblue' ).rgb(),
            d3.color( 'steelblue' ).rgb()
        ]);

        return shader;

    }

    function request_render () {

        _dataset.dispatch({
            type: 'render'
        });

    }

}

export { dataset }