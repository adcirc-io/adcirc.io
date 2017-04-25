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

// Step 1 is to select a fort.14 file
ui.fort14.file_picker( function ( file ) {

    var sidebar = d3.select( '#sidebar' );

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

    data.once( 'ready', function () {

        selection.remove();

        data.off( 'progress', update_progress );

        display_mesh( data );

    });

    data.on( 'has_view', function ( event ) {

        renderer.add_view( event.view );

    } );

    // Zoom to the mesh once it's loaded
    mesh.on( 'bounding_box', function ( event ) {

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

    var sidebar = d3.select( '#sidebar' );

    // Add mesh info header
    sidebar.append( 'div' )
        .attr( 'class', 'item' )
        .append( 'div' )
        .attr( 'class', 'header' )
        .text( 'Mesh Properties' );

    var mesh_info = sidebar.append( 'div' )
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
    sidebar.append( 'div' )
        .attr( 'class', 'item' )
        .append( 'div' )
        .attr( 'class', 'header' )
        .text( 'Mesh Data' );

    // Initialize display of mesh datasets
    initialize_mesh_datasets( sidebar.append( 'div' ).attr( 'class', 'item' ), data );

    // Add the fort.63 and residuals buttons
    var fort63_item = sidebar.append( 'div' )
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

        data.load_fort_63( file );

        // Progress bar update function
        function update_progress ( event ) {

            progress.progress( event.progress );

        }

    })( fort63 );

}

function initialize_mesh_datasets ( selection, data ) {

    fields = selection;

    data.on( 'view', function ( event ) {

        renderer.set_view( event.view );
        renderer.render();

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
