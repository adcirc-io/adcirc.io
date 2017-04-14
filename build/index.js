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

    var _mesh = adcirc.mesh();
    var _geometry;
    var _view;

    var _dataset = dispatcher();

    _dataset.load_fort_14 = function ( file ) {

        var f14 = adcirc.fort14()
            .on( 'nodes', function ( event ) {
                _mesh.nodes( event.nodes );
            })
            .on( 'elements', function ( event ) {
                _mesh.elements( event.elements );
            })
            .on( 'ready', function () {

                _geometry = adcirc
                    .geometry( gl, _mesh );

                var _bounds = _mesh.bounds( 'depth' );

                var _shader = adcirc
                    .gradient_shader( gl, 4, _bounds[1], _bounds[0] );

                _view = adcirc
                    .view( gl, _geometry, _shader )
                    .nodal_value( 'depth' );

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

                _mesh.nodal_value( 'elevation', event.timestep.data() );

            } )
            .open( file );

    };

    _dataset.load_residuals = function ( file ) {

        var residuals = adcirc.fort63()
            .on( 'ready', function () {

                residuals.timestep( 0, function ( event ) {

                    console.log( 'timestep loaded' );
                    _mesh.elemental_value( 'residuals', event.timestep.data() );

                });

            })
            .on( 'progress', _dataset.dispatch )
            .read( file );

    };

    _dataset.mesh = function () {
        return _mesh;
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

}

function mesh_view () {

    var _mesh;

    var _bounding_box;
    var _elemental_values;
    var _nodal_values;
    var _num_elements;
    var _num_nodes;

    var _show_bounding_box;
    var _show_elemental_values;
    var _show_nodal_values;
    var _show_num_elements;
    var _show_num_nodes;

    var _view = function ( mesh ) {

        disconnect_mesh();
        connect_mesh( mesh );
        return _view;

    };

    _view.bounding_box = function ( selection, callback ) {

        if ( !arguments.length ) return _bounding_box;
        _bounding_box = selection;
        if ( arguments.length == 2 && typeof callback === 'function' ) _show_bounding_box = callback;
        return _view;

    };

    _view.elemental_values = function ( selection, callback ) {

        if ( !arguments.length ) return _elemental_values;
        _elemental_values = selection;
        if ( arguments.length == 2 && typeof callback === 'function' ) _show_elemental_values = callback;
        return _view;

    };

    _view.nodal_values = function ( selection, callback ) {

        if ( !arguments.length ) return _nodal_values;
        _nodal_values = selection;
        if ( arguments.length == 2 && typeof callback === 'function' ) _show_nodal_values = callback;
        return _view;

    };

    _view.num_elements = function ( selection, callback ) {

        if ( !arguments.length ) return _num_elements;
        _num_elements = selection;
        if ( arguments.length == 2 && typeof callback === 'function' ) _show_num_elements = callback;
        return _view;

    };

    _view.num_nodes = function ( selection, callback ) {

        if ( !arguments.length ) return _num_nodes;
        _num_nodes = selection;
        if ( arguments.length == 2 && typeof callback === 'function' ) _show_num_nodes = callback;
        return _view;

    };


    return dispatcher( _view );


    function connect_mesh ( mesh ) {

        _mesh = mesh;

        show_bounding_box( _mesh.bounding_box() );
        show_elemental_values( _mesh.elemental_values() );
        show_nodal_values( _mesh.nodal_values() );
        show_num_elements( _mesh.num_elements() );
        show_num_nodes( _mesh.num_nodes() );

        _mesh.on( 'bounding_box', on_bounding_box );
        _mesh.on( 'elemental_value', on_elemental_value );
        _mesh.on( 'nodal_value', on_nodal_value );
        _mesh.on( 'num_elements', on_num_elements );
        _mesh.on( 'num_nodes', on_num_nodes );

    }

    function disconnect_mesh () {

        if ( _mesh ) {
            _mesh.off( 'bounding_box', on_bounding_box );
            _mesh.off( 'elemental_value', on_elemental_value );
            _mesh.off( 'nodal_value', on_nodal_value );
            _mesh.off( 'num_elements', on_num_elements );
            _mesh.off( 'num_nodes', on_num_nodes );
        }

    }

    function on_bounding_box ( event ) {

        if ( event.type === 'bounding_box' ) show_bounding_box( event.bounding_box );

    }

    function on_elemental_value ( event ) {

        if ( event.type === 'elemental_value' ) show_elemental_values( _mesh.elemental_values() );

    }

    function on_nodal_value ( event ) {

        if ( event.type === 'nodal_value' ) show_nodal_values( _mesh.nodal_values() );

    }

    function on_num_elements ( event ) {

        if ( event.type === 'num_elements' ) show_num_elements( event.num_elements );

    }

    function on_num_nodes ( event ) {

        if ( event.type === 'num_nodes' ) show_num_nodes( event.num_nodes );

    }

    function show_bounding_box ( bounds ) {

        if ( _show_bounding_box )
            _show_bounding_box( bounds );
        else if ( !!_bounding_box )
            _bounding_box.text( bounds );

    }

    function show_elemental_values ( values ) {

        if ( _show_elemental_values )
            _show_elemental_values( values );
        else if ( !!_elemental_values ) {

            var selection = _elemental_values.selectAll( 'option' )
                .data( values );

            selection.exit().remove();

            selection.enter()
                .append( 'option' )
                .merge( selection )
                .each( function ( value ) {
                    d3.select( this )
                        .text( value )
                        .on( 'click', function () {
                            _view.dispatch({
                                type: 'elemental_value',
                                target: _mesh,
                                elemental_value: value
                            });
                        });
                });

        }

    }

    function show_nodal_values ( values ) {

        if ( _show_nodal_values )
            _show_nodal_values( values );

        else if ( !!_nodal_values ) {

            var selection = _nodal_values.selectAll( 'option' )
                .data( values );

            selection.exit().remove();

            selection.enter()
                .append( 'option' )
                .merge( selection )
                .each( function ( value ) {
                    d3.select( this )
                        .text( value )
                        .on( 'click', function () {
                            _view.dispatch({
                                type: 'nodal_value',
                                target: _mesh,
                                nodal_value: value
                            });
                        });
                });

        }

    }

    function show_num_elements ( num_elements ) {

        if ( _show_num_elements )
            _show_num_elements( num_elements );
        else if ( !!_num_elements )
            _num_elements.text( num_elements );

    }

    function show_num_nodes ( num_nodes ) {

        if ( _show_num_nodes )
            _show_num_nodes( num_nodes );
        else if ( !!_num_nodes )
            _num_nodes.text( num_nodes );

    }

}

var canvas = d3.select( '#canvas' );
var renderer = adcirc
    .gl_renderer( canvas )
    .clear_color( d3.color( 'darkgray' ) );
var ui = adcirc
    .ui( d3.select( 'body' ) );
var elemental_values = d3.select( '#elemental_values' );
var nodal_values = d3.select( '#nodal_values' );
var num_nodes = d3.select( '#num-nodes' );
var num_elements = d3.select( '#num-elements' );
var bounding_box = d3.select( '#bounding-box' );

// Set up data views
var initialized = false;
var view_mesh = mesh_view()
    .elemental_values( elemental_values )
    .nodal_values( nodal_values )
    .num_nodes( num_nodes )
    .num_elements( num_elements )
    .bounding_box( bounding_box );

// There'll only be a single dataset to begin with
var data = dataset( renderer.gl_context() );
var mesh = data.mesh();

// Set up file pickers
ui.fort14.file_picker( data.load_fort_14 );
ui.fort63.file_picker( data.load_fort_63 );
ui.residuals.file_picker( data.load_residuals );

// Connect the views to the data
view_mesh( data.mesh() );

// Respond to events from the mesh
mesh.on( 'bounding_box', function () {

    if ( !initialized ) {

        renderer.zoom_to( mesh, 200 );
        initialized = true;

    }

});

// Respond to events from the dataset
data.on( 'has_view', function ( event ) {

    renderer.add_view( event.view );

});

data.on( 'progress', function ( event ) {

    ui.progress.progress( event.progress );

});

// Respond to events from views
view_mesh.on( 'nodal_value', function ( event ) {

    data.view( event.nodal_value );

});

view_mesh.on( 'elemental_value', function ( event ) {

    data.view( event.elemental_value );

});

})));
