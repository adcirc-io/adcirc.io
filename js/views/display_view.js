import { dispatcher } from '../../../../adcirc-events/index'
import { gradient } from '../../../../adcirc-ui/index'

function display_view () {

    var _gradient = gradient();

    var _header_text = 'Display Options';

    var _view = function ( selection ) {

        // Set up the header
        var _header = selection.selectAll( '.display-header' )
            .data( [ _header_text ] );

        _header.exit().remove();

        _header = _header.enter()
            .append( 'div' )
            .attr( 'class', 'header display-header' )
            .merge( _header );

        _header.text( function ( d ) {
            return d;
        } );


        // Set up gradient section
        var _grad = selection.selectAll( '.display-gradient' )
            .data( [ {} ] );

        _grad.exit().remove();

        _grad = _grad.enter()
            .append( 'div' )
            .attr( 'class', 'display-gradient item' )
            .style( 'margin', '10px' )
            .merge( _grad );

        _gradient( _grad );

    };

    dispatcher( _view );

    return _view;

}

export { display_view }