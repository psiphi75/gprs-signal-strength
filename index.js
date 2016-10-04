var TTY_GPRS_MODEM = '/dev/ttyS2';
var TTY_GPS = '/dev/ttyS1';

var SerialPort = require( 'serialport' );

//
//
//  GPS Init and functions
//
//

var GPS = require( 'gps' );
var gps = new GPS();
var lastGPS = {};

var gpsPort = new SerialPort.SerialPort( TTY_GPS, { // change path
    baudrate: 9600,
    parser: SerialPort.parsers.readline( '\r\n' )
} );

gps.on( 'data', function ( data ) {
    if (data.type !== 'GGA') return;

    lastGPS = data;
    getGPRSData();
} );

gpsPort.on( 'data', function ( data ) {
    gps.update( data );
} );

//
//
// GPRS Init and functions
//
//

var gprsPort = new SerialPort.SerialPort( TTY_GPRS_MODEM, {
    baudrate: 115200,
    parser: SerialPort.parsers.readline( '\r\n' )
}, function ( err ) {
    if ( err ) {
        console.error( 'Error opening GPRS serial port: ', err );
    }
} );

function getGPRSData() {
    gprsPort.write('AT+CSQ\n', function ( err ) {
        if ( err ) {
            return console.log( 'Error writing to GPRS serialport: ', err );
        }
    });
}

gprsPort.on('data', function ( data ) {
    data = data.toString().trim();

    if (data.length === 0) return;
    if (data === 'OK') return;
    if (data === 'AT+CSQ' ) return;

    var tokens = data.split( /[\ \,]/g );
    if ( tokens[ 0 ] !== '+CSQ:' ) {
        console.error( 'unexpected response: ', data );
        return;
    }

    var gprsSignal = tokens[ 1 ];
    var gprsBitErrRate = tokens[ 2 ];

    var result = {
        gps: lastGPS,
        gprs: {
            signalRaw: gprsSignal,
            signal: gprsParseSignal( gprsSignal ),
            bitErrRate: gprsBitErrRate
        }
    };
    console.log( new Date().getTime() + ' INFO ' + JSON.stringify( result ) );
} );

function gprsParseSignal( signal ) {
    if ( isNaN( signal ) ) {
        return 'error (signal=' + signal + ')';
    }
    switch ( signal ) {
        case '0':
            return '< -113 dBm';
        case '1':
            return '-111 dBm';
        case '31':
            return '> -51 dBm';
        case '99':
            return 'unknown';
        default:
    }
    if ( signal >= 2 && signal <= 30 ) {
        signal = parseInt( signal );
        return ( 2 * signal - 113 ).toString() + ' dBm';
    }
}
