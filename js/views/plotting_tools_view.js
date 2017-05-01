
function plotting_tools_view ( dataset ) {

    var _header_text = 'Plotting Tools';

    var _plot_node_text = 'Plot Nodal Timeseries';

    var _overlay;
    var _circle;
    var _transform;
    var _node_coordinates;
    var _offset_y;

    var _plotting_area;
    var _chart;
    var _line;
    var _legend;

    initialize_plotting_area();
    initialize_overlay();

    var _view = function ( selection ) {

        // Add the header
        selection.append( 'div' )
            .attr( 'class', 'header' )
            .text( _header_text );

        // Add the load bar
        var bar = selection.append( 'div' ).attr( 'class', 'item' ).style( 'margin-top', '8px' );
        var progress = adcirc.progress()( bar.append( 'div' ) );

        dataset.on( 'progress', update_progress );
        dataset.on( 'finish', remove_progress );

        return _view;

        function update_progress ( event ) {

            if ( event.task === 'timeseries_prep' ) {

                progress.progress( event.progress );

            }

        }

        function remove_progress ( event ) {

            if ( event.task === 'timeseries_prep' ) {

                // Remove the load bar
                bar.remove();
                dataset
                    .off( 'progress', update_progress )
                    .off( 'finish', remove_progress );

                // Add the tools section
                var _tools = selection.append( 'div' )
                    .attr( 'class', 'plotting_tools item' );

                // Picking tools
                var _picker_container = _tools.append( 'div' ).attr( 'class', 'two-col' );

                _picker_container.append( 'div' ).attr( 'class', 'left' ).text( _plot_node_text );
                _picker_container.append( 'div' ).attr( 'class', 'right clickable' )
                    .append( 'i' ).attr( 'class', 'fa fa-mouse-pointer' );

            }

        }

    };

    _view.on_click = function ( event ) {

        var click_coordinates = event.coordinates;
        var node = dataset.find_node( click_coordinates );
        _node_coordinates = node.coordinates;
        _offset_y = event.offset_y;
        update_circle();

        dataset.timeseries( node.node_number, plot_timeseries );

    };

    _view.on_projection = function ( event ) {

        _transform = event.transform;
        update_circle();

    };

    return _view;

    function update_circle () {

        if ( _transform && _node_coordinates && _circle ) {

            var added = [ _node_coordinates[ 0 ], _offset_y - _node_coordinates[ 1 ] ];
            var transformed = _transform.apply( added );
            _circle
                .attr( 'cx', transformed[ 0 ] )
                .attr( 'cy', transformed[ 1 ] )
                .attr( 'visibility', 'visible' );

        }

    }

    function hide_plot () {

        if ( _plotting_area ) _plotting_area.style( 'display', 'none' );

    }

    function show_plot () {

        if ( _plotting_area ) _plotting_area.style( 'display', null );

    }

    function plot_timeseries ( event ) {

        show_plot();

        var y = event.timeseries.array;
        var x = d3.range( y.length );
        var data = d3.zip( x, y );
        var node_number = event.timeseries.node_number;

        if ( !_chart ) {

            var width = parseInt( _plotting_area.style( 'width' ) );
            var height = parseInt( _plotting_area.style( 'height' ) );
            _chart = d3.chart()
                .width( width )
                .height( height )
                .x_axis( d3.axisBottom() )
                .y_axis( d3.axisLeft() )
                .x_grid( true )
                .y_grid( true )
                .margin({ left: 40, bottom: 25 });

            _line = _chart.line()
                .attr( 'stroke-width', 2.0 )
                .y( function ( d ) {
                    return d[1] === -99999 ? null : d[1];
                });

            _legend = _chart.legend()
                .location( 'nw' )
                .attr( 'font-size', '12px' );

        }

        _legend.item( 'Elevation Timeseries for Node ' + node_number, _line );

        _line
            .data( data )
            .hover( show_value )
            .hover_out( hide_value );

        _plotting_area.call( _chart );

        function show_value ( d ) {

            var index = d[0];
            var value = d[1] === -99999 ? 'Dry' : d[1].toLocaleString();
            _legend.item( 'Dataset ' + index + ': ' + value, _line );

            if ( d[1] !== -99999 ) {

                d3.select( this )
                    .attr( 'r', 5 )
                    .attr( 'stroke', _line.attr( 'stroke' ) )
                    .attr( 'stroke-width', _line.attr( 'stroke-width' ) )
                    .attr( 'fill', 'white' )
                    .attr( 'fill-opacity', 0.5 );
            }

            _plotting_area.call( _chart );

        }

        function hide_value () {

            _legend.item( 'Elevation Timeseries for Node ' + node_number, _line );
            _plotting_area.call( _chart );

        }


    }

    function initialize_overlay () {

        _overlay = d3.select( '#overlay' )
            .style( 'width', '100%' )
            .style( 'height', '100%' )
            .style( 'position', 'absolute' )
            .style( 'left', 0 )
            .style( 'top', 0 )
            .style( 'right', 0 )
            .style( 'bottom', 0 )
            .style( 'z-index', 2 )
            .style( 'pointer-events', 'none' )
            .append( 'g' );

        _circle = _overlay.append( 'circle' )
            .attr( 'r', 7 )
            .attr( 'stroke', 'black' )
            .attr( 'stroke-width', 2 )
            .attr( 'fill', 'black' )
            .attr( 'fill-opacity', 0.5 )
            .attr( 'visibility', 'hidden' );

    }

    function initialize_plotting_area () {

        _plotting_area = d3.select( '#plotting-area' )
            .style( 'position', 'absolute' )
            .style( 'right', 0 )
            .style( 'bottom', '45px' )
            .style( 'left', 0 )
            .style( 'height', '225px' )
            .style( 'background-color', '#f8f8f8' )
            .style( 'border-top', '1px solid #c3c5c6' )
            .style( 'z-index', 3 );

        hide_plot();

    }

}


export { plotting_tools_view }