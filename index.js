var viz;
var timeline;

(function($, prettySize) {
  function status(message) {
    $('#currentStatus').text(message);
  }

  mapboxgl.accessToken = 'pk.eyJ1Ijoic3VwZXJudWJlciIsImEiOiJjam1wa2h1MzExZ2hxM3ByMmxqdmVpeDcwIn0.fvwCX7mTidDf1UK5eFImyQ';
  timeline = new Timeline();
  viz = new Viz(new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v10',
    center: [0, 0],
    zoom: 0.5
  }), timeline);
  var files = [null, null];

  function uploadFiles(file, idx) {
    files[idx] = file;

    if (files[0] !== null && files[1] !== null) {
      stageTwo(files)
    }
  }

  // Start at the beginning
  stageOne();

  function stageOne() {
    $( '#file-1' ).change( function () {
      uploadFiles(this.files[0], 0);
    } );
    $( '#file-2' ).change( function () {
      uploadFiles(this.files[0], 1);
    } );
  }

  function initOboe(arr, callback) {
    var SCALAR_E7 = 0.0000001; // Since Google Takeout stores latlngs as integers
    var os = new oboe();
    os.node( 'locations.*', function ( location ) {
      //pre-pend since it's reverse chronological order
      if (location.latitudeE7 !== undefined && location.latitudeE7 !== null) {
        arr.unshift([location.latitudeE7 * SCALAR_E7, location.longitudeE7 * SCALAR_E7, parseInt(location.timestampMs, 10)]);
      }
      return oboe.drop;
    }).done(function() {
      callback();
    });

    return os;
  }

  function stageTwo(files) {
    try {
      if (!(/\.json$/i.test(files[0].name)) || !(/\.json$/i.test(files[1].name))) {
        status( 'Something went wrong generating your map. Ensure you\'re uploading a Google Takeout JSON file that contains location data and try again, or create an issue on GitHub if the problem persists. ( error: ' + ex.message + ' )' );
        return;
      }
    } catch ( ex ) {
      status( 'Something went wrong generating your map. Ensure you\'re uploading a Google Takeout JSON file that contains location data and try again, or create an issue on GitHub if the problem persists. ( error: ' + ex.message + ' )' );
      return;
    }

    $('#file-1-name').html(`(${files[0].name})`);
    $('#file-2-name').html(`(${files[1].name})`);

    // First, change tabs
    $('body').addClass('working');
    $('#intro').addClass('hidden');
    $('#working').removeClass('hidden');

    var fileSizeOne = prettySize(files[0].size);
    var fileSizeTwo = prettySize(files[1].size);

    status( 'Preparing to import files ( ' + fileSizeOne + ' and ' + fileSizeTwo + ' )...' );

    var firstData = [];
    var secondData = [];
    parseJSONFile(files[0], initOboe(firstData, function() {
      status('Uploading second...');
      parseJSONFile(files[1], initOboe(secondData, function() {
        status('Generating map...');
        timeline.addData(firstData, secondData);
        stageThree(firstData.length + secondData.length);
      }));
    }));
  }

  function stageThree(numberProcessed) {
    var $done = $('#done');

    // Change tabs :D
    $('body').removeClass('working');
    $('#working').addClass('hidden');
    $done.removeClass('hidden');

    // Update count
    $('#numberProcessed').text(numberProcessed.toLocaleString());

    $('#launch').click(function() {
      $('body').addClass('map-active');
      $done.fadeOut();
      activateControls();
      viz.init('#controls', '#timeline');
    });

    var $controls = $('#controls');
    var open = false;
    var first = true;
    var second = true;

    function toggleZoom() {
      if (first && second) {
        viz.watchBoth();
      } else if (first) {
        viz.watchFirst();
      } else {
        viz.watchSecond();
      }
    }

    function activateControls() {
      $('#start').click(function(e) {
        viz.toggleOn();
      });

      $('#frame').change(function(e) {
        viz.adjustFrameRate(this.value);
      });

      $('#first').change(function() {
        first = $(this).is(":checked");
        toggleZoom();
      });
      $('#second').change(function() {
        second = $(this).is(":checked");
        toggleZoom();
      });
    }
  }

  /*
  Break file into chunks and emit 'data' to oboe instance
  */
  function parseJSONFile(file, oboeInstance) {
    var fileSize = file.size;
    var prettyFileSize = prettySize(fileSize);
    var chunkSize = 512 * 1024; // bytes
    var offset = 0;
    var self = this; // we need a reference to the current object
    var chunkReaderBlock = null;
    var readEventHandler = function ( evt ) {
      if ( evt.target.error == null ) {
        offset += evt.target.result.length;
        var chunk = evt.target.result;
        var percentLoaded = ( 100 * offset / fileSize ).toFixed( 0 );
        status( percentLoaded + '% of ' + prettyFileSize + ' loaded...' );
        oboeInstance.emit( 'data', chunk ); // callback for handling read chunk
      } else {
        return;
      }
      if ( offset >= fileSize ) {
        oboeInstance.emit( 'done' );
        return;
      }

      // of to the next chunk
      chunkReaderBlock( offset, chunkSize, file );
    }

    chunkReaderBlock = function ( _offset, length, _file ) {
      var r = new FileReader();
      var blob = _file.slice( _offset, length + _offset );
      r.onload = readEventHandler;
      r.readAsText( blob );
    }

    // now let's start the read with the first block
    chunkReaderBlock( offset, chunkSize, file );
  }
}(jQuery, prettySize));
