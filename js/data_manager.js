import { dispatcher } from '../../../adcirc-events/index'

function data_manager () {

    var _datasets = d3.map();
    var _manager = dispatcher();

    _manager.datasets = function () {

        return Object.keys( _datasets );

    };

    _manager.new_dataset = function ( name ) {

        if ( _datasets.has( name ) ) return error( 'Dataset with name ' + name + ' already exists' );
        _datasets.set( name, new Map() );
        _manager.dispatch( { type: 'new_dataset', dataset: name } );
        return name;

    };

    return _manager;

    function error ( message ) {

        _manager.dispatch( { type: 'error', message: message } );

    }

}

export { data_manager }