
function plotting_tools_view ( dataset ) {

    var _header_text = 'Plotting Tools';

    var _plot_node_text = 'Plot Nodal Timeseries';

    var _view = function ( selection ) {

        // Add the header
        selection.append( 'div' )
            .attr( 'class', 'header' )
            .text( _header_text );

        // Add the tools section
        var _tools = selection.append( 'div' )
            .attr( 'class', 'plotting_tools item' );

        // Picking tools
        var _picker_container = _tools.append( 'div' ).attr( 'class', 'two-col' );

        _picker_container.append( 'div' ).attr( 'class', 'left' ).text( _plot_node_text );
        _picker_container.append( 'div' ).attr( 'class', 'right clickable' )
            .append( 'i' ).attr( 'class', 'fa fa-mouse-pointer' );

        return _view;

    };

    return _view;

}


export { plotting_tools_view }