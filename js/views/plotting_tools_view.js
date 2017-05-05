
function plotting_tools_view ( dataset ) {

    var _header_text = 'Plotting Tools';

    var _plot_node_text = 'Plot Nodal Timeseries';

    var _overlay;
    var _circle;
    var _transform;
    var _node_coordinates;
    var _offset_y;

    var _picking_loaded = false;
    var _picking = false;

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
        dataset.on( 'timestep', set_timestep );

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
                var _picker_container = _tools.append( 'div' ).attr( 'class', 'two-col clickable' );

                _picker_container.append( 'div' ).attr( 'class', 'left' ).text( _plot_node_text );
                _picker_container.append( 'div' ).attr( 'class', 'right' )
                    .append( 'i' ).attr( 'class', 'fa fa-mouse-pointer' );

                _picker_container.on( 'click', toggle_button );

                _picking_loaded = true;

            }

        }

    };

    _view.on_click = function ( event ) {

        if ( _picking_loaded && _picking ) {

            var click_coordinates = event.coordinates;
            var node = dataset.find_node(click_coordinates);
            _node_coordinates = node.coordinates;
            _offset_y = event.offset_y;
            update_circle();

            dataset.timeseries(node.node_number, plot_timeseries);

        }

    };

    _view.on_projection = function ( event ) {

        _transform = event.transform;
        update_circle();

    };

    return _view;

    function update_circle () {

        if ( _picking && _transform && _node_coordinates && _circle ) {

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
        if ( _circle ) _circle.attr( 'visibility', 'hidden' );

    }

    function show_plot () {

        if ( _plotting_area ) _plotting_area.style( 'display', null );

    }

    function set_timestep ( event ) {

        if ( _chart && _plotting_area ) {

            var x_scale = _chart.x_scale();

            var selection = _plotting_area
                .select( 'svg' ).select( 'g' ).selectAll( '.tsline' ).data( [ {} ] );

            selection = selection.enter()
                .append( 'line' )
                .attr( 'class', 'tsline' )
                .merge( selection );

            selection.attr( 'x1', x_scale( event.index ) )
                .attr( 'x2', x_scale( event.index ) )
                .attr( 'y1', 0 )
                .attr( 'y2', 180 )
                .attr( 'stroke', '#666666' )
                .attr( 'stroke-width', '1px' );

        }

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
            _legend.item( 'Node ' + node_number + ', Dataset ' + index, _line );

            if ( d[1] !== -99999 ) {

                var circle = d3.select( this )
                    .attr( 'r', 5 )
                    .attr( 'stroke', _line.attr( 'stroke' ) )
                    .attr( 'stroke-width', _line.attr( 'stroke-width' ) )
                    .attr( 'fill', 'white' )
                    .attr( 'fill-opacity', 0.5 )
                    .attr( 'visibility', null );

                var label = d3.select( this.parentNode )
                    .selectAll( '.dataval' ).data( [ d ] );

                label = label
                    .enter().append( 'text' )
                    .attr( 'class', 'dataval' )
                    .merge( label );

                label.attr( 'x', ( +circle.attr( 'cx' ) + 15 ) )
                    .attr( 'y', circle.attr( 'cy' ) )
                    .style( 'font-family', 'sans-serif' )
                    .style( 'font-size', '14px' )
                    .style( 'font-weight', 'bold' )
                    .style( 'alignment-baseline', 'middle' )
                    .attr( 'visibility', null )
                    .text( d[1].toLocaleString() + 'm' );
            } else {

                d3.select( this )
                    .attr( 'visibility', 'hidden' );

                d3.select( this.parentNode )
                    .selectAll( '.dataval' )
                    .attr( 'visibility', 'hidden' )

            }

            _plotting_area.call( _chart );

        }

        function hide_value () {

            _legend.item( 'Elevation Timeseries for Node ' + node_number, _line );
            _plotting_area.call( _chart );

            d3.select( this.parentNode )
                .selectAll( '.dataval' )
                .attr( 'visibility', 'hidden' );

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

    function toggle_button () {

        if ( _picking_loaded ) {

            var button = d3.select( this );

            if ( !_picking ) {

                button.style( 'background-color', '#666666' )
                    .style( 'color', 'white' );
                _picking = true;

            } else {

                button.style( 'background-color', null )
                    .style( 'color', null );
                _picking = false;

                hide_plot();

            }

        }

    }


}


export { plotting_tools_view }