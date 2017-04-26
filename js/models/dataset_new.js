import { dispatcher } from '../../../../adcirc-events/index'

function dataset ( gl ) {

    var _dataset = dispatcher();
    var _views = [];

    var _mesh = adcirc.mesh();
    var _geometry;

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

        var f63 = adcirc.fort63_cached( 25 )
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

                _mesh.nodal_value( 'elevation timeseries', event.timestep.data() );

                _dataset.dispatch({
                    type: 'timestep',
                    time: event.timestep.model_time(),
                    index: event.timestep.model_timestep()
                });


            })
            .on( 'finish', _dataset.dispatch )
            .open( file );

        return _dataset;

    };

    _dataset.view = function ( name ) {

        console.log( name );

        for ( var i=0; i<_views.length; ++i ) {

            var view = _views[i];

            if ( view.name === name ) {

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

}

export { dataset }