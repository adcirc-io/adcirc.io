
function mesh_properties_view () {

    var _header_text = 'Mesh Properties';
    var _nodes_text = 'Nodes:';
    var _elements_text = 'Elements:';

    var _num_elements = 0;
    var _num_nodes = 0;

    var _nodes;
    var _elements;

    var _view = function ( selection ) {

        // Add the header
        selection.append( 'div' )
            .attr( 'class', 'header' )
            .text( _header_text );

        // Add the info section
        var _info = selection.append( 'div' )
            .attr( 'class', 'mesh_properties item' );

        // Add properties
        var _nodes_container = _info.append( 'div' ).attr( 'class', 'two-col' );
        var _elements_container = _info.append( 'div' ).attr( 'class', 'two-col' );

        _nodes_container.append( 'div' ).attr( 'class', 'left' ).text( _nodes_text );
        _elements_container.append( 'div' ).attr( 'class', 'left' ).text( _elements_text );

        _nodes = _nodes_container.append( 'div' ).attr( 'class', 'right' );
        _elements = _elements_container.append( 'div' ).attr( 'class', 'right' );

        update();

        return _view;

    };

    _view.num_elements = function ( _ ) {

        if ( !arguments.length ) return _elements.text();
        _num_elements = _;
        update();
        return _view;

    };

    _view.num_nodes = function ( _ ) {

        if ( !arguments.length ) return _nodes.text();
        _num_nodes = _;
        update();
        return _view;

    };

    return _view;

    function update () {

        if ( _elements ) _elements.text( _num_elements.toLocaleString() );
        if ( _nodes ) _nodes.text( _num_nodes.toLocaleString() );

    }

}

export { mesh_properties_view }