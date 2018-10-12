class Viz {
  constructor(map, timeline) {
    this.map = map;
    this.timeline = timeline;

    this.first = {
      points: [],
      prevCoord: [],
      pointProgress: 0,
      name: "point-1"
    };
    this.second = {
      points: [],
      prevCoord: [],
      pointProgress: 0,
      name: "point-2"
    };

    this.watch = "both";

    this.options = {
      tailTrail: 8,
      frameRate: 1,
      playing: true
    }

    this.controlsId;

    this.animation; // to store and cancel the animation

    this.mapBounds;
    this.time;
    this.progress = 0;
  }

  adjustFrameRate(rate) {
    this.options.frameRate = rate;
  }

  setTime(data) {
    this.time = data.time;
    const formattedTime = moment(this.time).format('lll');
    $(this.controlsId).find('#time').html(formattedTime);
  }

  getBounds(data) {
    switch (this.watch) {
      case "first":
        return data.firstBounds;
      case "second":
        return data.secondBounds;
      default:
        return data.bothBounds;
    }
  }

  initPoint(coord, name, color) {
    var point = {
      "type": "FeatureCollection",
      "features": [{
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "LineString",
          "coordinates": [
            coord,
            coord
          ]
        }
      }]
    };

    this.map.addLayer({
      'id': name,
      'type': 'line',
      'source': {
        'type': 'geojson',
        'data': point
      },
      'paint': {
        'line-width': 5,
        'line-color': `#${color}`,
        'line-opacity': .8
      }
    });

    return point;
  }

  pointName(name, i) {
    return `${name}-${i}`;
  }

  init(controlsId) {
    const c = this;

    c.controlsId = controlsId;
    c.timeline.init(c, controlsId);

    //initialize points on map
    const data = c.timeline.getInitData();
    for (let i = 0; i < c.options.tailTrail; i++) {
      c.first.points.push(c.initPoint(data.first, c.pointName(c.first.name, i), "ed6498"));
      //TODO: change this color to be something more pleasant
      c.second.points.push(c.initPoint(data.second, c.pointName(c.second.name, i), "000"));
    }

    c.first.prevCoord = data.first;
    c.second.prevCoord = data.second;

    c.animate(c);
  }

  toggleOn() {
    this.options.playing = !this.options.playing;
  }

  watchBoth() {
    this.watch = "both";
  }

  watchFirst() {
    this.watch = "first";
  }

  watchSecond() {
    this.watch = "second";
  }

  repaintPoint(coord, set) {
    if (coord) {
      const point = set.points[set.pointProgress];

      point.features[0].geometry.coordinates = [set.prevCoord, coord];
      this.map.getSource(this.pointName(set.name, set.pointProgress)).setData(set.points[set.pointProgress]);

      set.pointProgress = (set.pointProgress + 1) % set.points.length;
      set.prevCoord = coord;
    }
  }

  progressAnimation(ref) {
    const data = ref.timeline.getData(ref.progress);

    ref.setTime(data);

    ref.repaintPoint(data.first, ref.first);
    ref.repaintPoint(data.second, ref.second);

    const bounds = ref.getBounds(data);
    if (ref.mapBounds != bounds) {
      console.log(ref.mapBounds);
      console.log(bounds);
      ref.map.fitBounds(bounds, {
        duration: 500,
        padding: 20,
        easing: (t) => {
          //easeInOutQuad
          return t<.5 ? 2*t*t : -1+(4-2*t)*t
        }
      });
      ref.mapBounds = bounds;
    }

    ref.progress += 1;
  }

  animate(ref) {
    if (ref.options.playing) {
      ref.progressAnimation(ref);
    }

    ref.animation = requestAnimationFrame(() => {ref.animate(ref)});
  }
}
