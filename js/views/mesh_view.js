// import { dispatcher } from '../../../../adcirc-events/index'
import { dispatcher } from '../../../adcirc-events/index'

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

export { mesh_view }