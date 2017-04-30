import { dispatcher } from '../../../../adcirc-events/index'

function mesh_data_view ( dataset ) {

    var _selection;

    var _header_text = 'Mesh Data';
    var _selected_color = 'limegreen';

    var _fields;
    var _fort63;

    var _view = function ( selection ) {

        _selection = selection;

        // Add the header
        selection.append( 'div' )
            .attr( 'class', 'header' )
            .text( _header_text );

        // Add the container for the data selectors
        _fields = selection.append( 'div' )
            .attr( 'class', 'mesh_data_fields item' );

        // Add the fort.63 button
        _fort63 = selection.append( 'div' )
            .attr( 'class', 'button bordered' )
            .text( 'Open fort.63' );

        adcirc.button()
            .file_picker( on_fort_63 )
            ( _fort63 );

        // Respond to events from the dataset
        dataset.on( 'new_view', on_new_view );
        dataset.on( 'view', on_view );

        // Perform initial update
        update();

        return _view;

    };

    return dispatcher( _view );

    function on_fort_63 ( file ) {

        _fort63.remove();

        var bar = _selection.append( 'div' ).attr( 'class', 'item' );
        var progress = adcirc.progress()( bar.append( 'div' ) );

        dataset
            .on( 'progress', update_progress )
            .on( 'finish', remove_progress )
            .load_fort_63( file );

        function update_progress ( event ) {

            if ( event.task === 'map_timesteps' ) {

                progress.progress( event.progress );

            }

        }

        function remove_progress ( event ) {

            if ( event.task === 'map_timesteps' ) {

                bar.remove();
                dataset
                    .off( 'progress', update_progress )
                    .off( 'finish', remove_progress );

            }

        }


    }

    function on_new_view ( event ) {

        update();

        var view_name = event.name;

        dataset.view( view_name );


    }

    function on_view ( event ) {

        update();

        if ( _fields ) {

            var view_name = event.name;

            _fields.selectAll( '.data_field' )
                .each( function () {

                    var field = d3.select( this );

                    if ( field.data()[ 0 ].name === view_name ) {

                        field.selectAll( '.right' ).style( 'color', _selected_color );

                    } else {

                        d3.select( this ).selectAll( '.right' ).style( 'color', null );

                    }

                });
        }

    }

    function pick_field () {

        var picked_field = d3.select( this );

        dataset.view( picked_field.data()[ 0 ].name );

    }

    function to_upper ( string ) {

        return string.replace( /\b\w/g, function ( l ) { return l.toUpperCase() } );

    }

    function update () {

        if ( _fields ) {

            var selection = _fields.selectAll( '.data_field' )
                .data( dataset.views() );

            selection.exit().remove();

            selection = selection.enter()
                .append( 'div' )
                .attr( 'class', 'two-col clickable data_field' )
                .on( 'click', pick_field );

            selection.append( 'div' )
                .attr( 'class', 'left' )
                .text( function ( d ) {
                    return to_upper( d.name );
                });

            selection.append( 'div' )
                .attr( 'class', 'right' )
                .append( 'i' )
                .attr( 'class', 'fa fa-fw fa-eye' );

        }

    }

}

export { mesh_data_view }