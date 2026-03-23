//mapbox gl 地图工具，包括 距离、面积量测等，陈顺华，2021.2.7
/*********************调用方法************************/
/*
var maptools = new MapTools().addTo(map);
maptools.on('complate', function(mode, drawOption, v){
	console.log(v);
})
	<button onclick="maptools.setMode('point')">单点</button>
	<button onclick="maptools.setMode('point', {multiple: true})">多点</button>
	<button onclick="maptools.setMode('line')">线</button>
	<button onclick="maptools.setMode('line', {distance:true})">量距</button>
	<button onclick="maptools.setMode('polygon')">面</button>
	<button onclick="maptools.setMode('polygon', {area:true})">量面积</button>
	<button onclick="maptools.setMode('rect')">rect</button>
	<button onclick="maptools.setMode('circle')">circle</button>
	<button onclick="maptools.setMode('point', {buffer: 10})">缓冲区-点</button>
	<button onclick="maptools.setMode('line', {buffer: 10})">缓冲区-线</button>
	<button onclick="maptools.setMode('polygon', {buffer: 10})">缓冲区-面</button>
	<button onclick="maptools.clean()">Clean</button>
*/
/***************************************************/
function MapTools(options) {
	this.options = Object.assign({},  MapTools.DEFAULTS, options);
}

MapTools.DEFAULTS = {
	circleStrokeWidth: 1.5,
	circleStrokeColor: '#ffffff',
    circleRadius: 4,
    circleColor: '#ff7500',
	
    lineColor: 'rgba(255,0,51,0.5)',
    lineWidth: 1.5,
	
	fillColor: 'rgba(255,102,102,0.1)',
	
	markerBackgroundColor: '#CCCCFF'
};

MapTools.prototype.addTo = function(map) {
    this._map = map;
    this._map.on('click', this._onClick.bind(this));
    this._map.on('dblclick', this._onDblClick.bind(this));
    this._map.on('mousemove', this._onMousemove.bind(this));

	this._map.on('mousedown', this._onMousedown.bind(this));
	this._map.on('mouseup', this._onMouseup.bind(this));
    
    //点
    this.geojson_point = {
    	"type": "FeatureCollection",
    	"features": []
    };
	
	//线
	this.geojson_line = {
        "type": "FeatureCollection",
        "features": []
    };
	
	//面
	this.geojson_polygon = {
        "type": "FeatureCollection",
        "features": []
    };
	
	//鼠标移动绘制动态线
	this.temp_line = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": []
        }
    }
	
	this.mode = '';//当前模式，point line polygon rect circle
	this.drawOption = {};//鼠标当前绘图的选项
	this.markers = [];//文字标记，起点、删除
	this.tooltip = null; //鼠标提示

	//鼠标拖动的节点
	this.draging_point = null;

	//是否激活状态，用来在外部关闭mousemove事件，否则鼠标绘制的时候容易卡顿
	this.isActive = false;
	
	this._onMapLoad();
	
	//回调
	this._callback = {};
	
	//定时器，用以解决双击触发两次单击的问题
	this.timeId = 0;
	
	//mouse click_x click_y dblclick_x dblclick_y move_x move_y
	this.click_x = 0;
	this.click_y = 0;
	this.dblclick_x = 0;
	this.dblclick_y = 0;
	this.move_x = 0;
	this.move_y = 0;
	
	return this;
}

MapTools.prototype._onMapLoad = function() {
	//数据源
	this._map.addSource('MapTools_geojson', {
		'type': 'geojson',
		'data': {"type": "FeatureCollection", "features": []}
	});
	this._map.addSource('MapTools_temp_line', {
		'type': 'geojson',
		//'data': this.temp_line
		'data': {'type':'FeatureCollection', 'features': []}
	});
	
	//面
	this._map.addLayer({
        id: 'MapTools_polygon',
        type: 'fill',
        source: 'MapTools_geojson',
        paint: {
			'fill-color': this.options.fillColor
        },
		filter: ['in', '$type', 'Polygon']
    });
	//线
	this._map.addLayer({
        id: 'MapTools_line',
        type: 'line',
        source: 'MapTools_geojson',
        paint: {
            'line-color': this.options.lineColor,
            'line-width': this.options.lineWidth
        },
		filter: ['in', '$type', 'LineString', 'Polygon']
    });
	//临时线
	this._map.addLayer({
        id: 'MapTools_line_temp',
        type: 'line',
        source: 'MapTools_temp_line',
        paint: {
            'line-color': this.options.lineColor,
            'line-width': this.options.lineWidth,
			'line-dasharray': [1,3]
        }
    });
	//点、节点
    this._map.addLayer({
        id: 'MapTools_point',
        type: 'circle',
        source: 'MapTools_geojson',
        paint: {
            //'circle-stroke-width': this.options.circleStrokeWidth,
            //'circle-stroke-color': this.options.circleStrokeColor,
            //'circle-radius': this.options.circleRadius,
            //'circle-color': this.options.circleColor,
			'circle-stroke-width': ['match', ['get', 'type'], '01', this.options.circleStrokeWidth, 0],
			'circle-stroke-color': this.options.circleStrokeColor,
			'circle-radius': ['match', ['get', 'type'], '01', this.options.circleRadius, 2.5],
			'circle-color': this.options.circleColor
        },
		filter: ['in', '$type', 'Point']
    });
};

//删除组件
MapTools.prototype.remove = function(){
	//标记
	for(var i=0; i<this.markers.length; i++){
		this.markers[i].remove();
	}
	
	if(this._map.getLayer('MapTools_polygon')){
		this._map.removeLayer('MapTools_polygon');
		this._map.removeLayer('MapTools_line');
		this._map.removeLayer('MapTools_line_temp');
		this._map.removeLayer('MapTools_point');
		
		this._map.removeSource('MapTools_geojson');
		this._map.removeSource('MapTools_temp_line');
	}
	
	this._map.off('click', this._onClick);
    this._map.off('dblclick', this._onDblClick);
    this._map.off('mousemove', this._onMousemove);
}

MapTools.prototype.on = function(v, fun){
	this._callback[v] = fun;
}

MapTools.prototype.setMode = function(v, drawOption){
	//mode为空，或者temp_line还没开始点击
	if((this.mode==='' || this.temp_line.geometry.coordinates.length==0) && v!='' && v!='***END***'){
		this.mode = v;
		this.drawOption = drawOption;

		this.isActive = true;

		this._map.doubleClickZoom.disable();
		this.temp_line.geometry.coordinates = [];
		
		//点线面，初始化一个对象，点不需要初始化
		if(v==='line'){
			let line = {
				'type': 'Feature',
				//'id': new Date().getTime(), 
				'properties': {'complete': false, 'drawOption': drawOption, "mode": v},
				'geometry': {
					'type': 'LineString',
					'coordinates': []
				}
			};
			this.geojson_line.features.push(line);
		}
		else if(v==='polygon' || v==='rect' || v==='circle'){
			let polygon = {
				'type': 'Feature',
				//'id': new Date().getTime(), 
				'properties': {'complete': false, 'drawOption': drawOption, 'mode': v},
				'geometry': {
					'type': 'Polygon',
					'coordinates': [[]]
				}
			};
			this.geojson_polygon.features.push(polygon);
		}
	}
}

//输入坐标，把多点多线多面打散，简化代码
MapTools.prototype.edit = function(geom, drawOption){
	if(geom.type==='Point' || geom.type==='MultiPoint'){
		turf.flattenEach(geom, function(f){
			f.properties.drawOption = drawOption;
			f.properties.complete = true;
			this.geojson_point.features.push(f);
		}.bind(this));
	}
	else if(geom.type==='LineString' || geom.type==='MultiLineString'){
		turf.flattenEach(geom, function(f){
			f.properties.drawOption = drawOption;
			f.properties.complete = true;
			this.geojson_line.features.push(f);
		}.bind(this));
	}
	else if(geom.type==='Polygon' || geom.type==='MultiPolygon'){
		turf.flattenEach(geom, function(f){
			f.properties.drawOption = drawOption;
			f.properties.complete = true;
			this.geojson_polygon.features.push(f);
		}.bind(this));
	}
	this.repaint();
}

//鼠标按下
MapTools.prototype._onMousedown = function(e){
	//搜索节点
	let rect = [[e.point.x - 2, e.point.y - 2], [e.point.x + 2, e.point.y + 2]];
	let poi_query = this._map.queryRenderedFeatures(rect, {layers: ['MapTools_point']});
	if(poi_query.length>0){
		this.isActive = true;

		let poi_properties = poi_query[0].properties;
		//鼠标右键，删除节点【point不删除，line小于等于两个点不删除，polygon小于等于4个点不删除】
		if(e.originalEvent.button===2 && poi_properties.type==='01'){
			if(poi_properties.type==='01'){
				if(poi_properties.source==='geojson_line' && this.geojson_line.features[poi_properties.source_fea_index].geometry.coordinates.length>2){
					//如果临时虚线显示【绘制过程种】，删除最后一个点，需要调整虚线的起点为倒数第二个点
					if(this.temp_line.geometry.coordinates.length==2 && poi_properties.source_coord_index==this.geojson_line.features[poi_properties.source_fea_index].geometry.coordinates.length-1){
						this.temp_line.geometry.coordinates[0] = this.geojson_line.features[this.geojson_line.features.length-1].geometry.coordinates[this.geojson_line.features[poi_properties.source_fea_index].geometry.coordinates.length-2];
						this._map.getSource('MapTools_temp_line').setData({'type':'FeatureCollection', 'features': [this.temp_line]});
					}
					this.geojson_line.features[poi_properties.source_fea_index].geometry.coordinates.splice(poi_properties.source_coord_index, 1);
					this.repaint();
				}
				else if(poi_properties.source==='geojson_polygon' && this.geojson_polygon.features[poi_properties.source_fea_index].geometry.coordinates[poi_properties.source_geometry_index].length>4){
					//如果临时虚线显示【绘制过程种】，删除最后一个点【不算闭合点，实际是倒数第二个点】，需要调整虚线的起点为倒数第三个点
					if(this.temp_line.geometry.coordinates.length==3 && poi_properties.source_coord_index==this.geojson_polygon.features[poi_properties.source_fea_index].geometry.coordinates[poi_properties.source_geometry_index].length-2){
						this.temp_line.geometry.coordinates[0] = this.geojson_polygon.features[this.geojson_polygon.features.length-1].geometry.coordinates[poi_properties.source_geometry_index][this.geojson_polygon.features[poi_properties.source_fea_index].geometry.coordinates[poi_properties.source_geometry_index].length-3];
						this._map.getSource('MapTools_temp_line').setData({'type':'FeatureCollection', 'features': [this.temp_line]});
					}
					this.geojson_polygon.features[poi_properties.source_fea_index].geometry.coordinates[poi_properties.source_geometry_index].splice(poi_properties.source_coord_index, 1);
					this.repaint();
				}
			}
		}
		//鼠标左键，点击中心点增加一个节点
		else if(e.originalEvent.button===0){
			if(poi_properties.type==='02'){
				//找到源数据，增加节点
				if(poi_properties.source==='geojson_line'){
					this.geojson_line.features[poi_properties.source_fea_index].geometry.coordinates.splice(poi_properties.source_coord_index, 0, [e.lngLat.lng, e.lngLat.lat]);
					this.repaint();
				}
				else if(poi_properties.source==='geojson_polygon'){
					this.geojson_polygon.features[poi_properties.source_fea_index].geometry.coordinates[poi_properties.source_geometry_index].splice(poi_properties.source_coord_index, 0, [e.lngLat.lng, e.lngLat.lat]);
					this.repaint();
				}
			}
			//节点拖拽
			this._map.dragPan.disable();
			this.draging_point = poi_properties;
		}
	}
}

//鼠标弹起
MapTools.prototype._onMouseup = function(e){
	if(this.draging_point!=null){
		this.draging_point = null;
		this._map.dragPan.enable();

		this.isActive = false;
	}
}

//单击
MapTools.prototype._onClick = function(e){
	if(this.mode === '') {
		return;
	}

	window.clearTimeout(this.timeId);
	this.timeId = window.setTimeout(function(){
		this.click_x = e.lngLat.lng;
		this.click_y = e.lngLat.lat;
		
		//临时线的起点
		this.temp_line.geometry.coordinates[0] = [e.lngLat.lng, e.lngLat.lat];

		//绘点
		if(this.mode==='point'){
			this.geojson_point.features.push(turf.point([e.lngLat.lng, e.lngLat.lat], {drawOption: this.drawOption}));
			//如果是单点，单击结束
			if(!this.drawOption || !this.drawOption.multiple){
				this.complate();
			}
			this.repaint();
		}
		//绘线
		else if(this.mode==='line'){
			let fea = this.geojson_line.features[this.geojson_line.features.length-1];
			fea.geometry.coordinates.push([e.lngLat.lng, e.lngLat.lat]);
			this.repaint(); 
		}
		//绘面
		else if(this.mode==='polygon'){
			//最后一个feature
			let fea = this.geojson_polygon.features[this.geojson_polygon.features.length-1];
			/*
			//如果有坐标相同则跳过，计算不相交polygon不能有重复的顶点
			var duplicate_vertices = false;
			for(var i=0;i<fea.geometry.coordinates[0].length;i++){
				if(fea.geometry.coordinates[0][i][0]==e.lngLat.lng && fea.geometry.coordinates[0][i][1]==e.lngLat.lat){
					duplicate_vertices = true;
					break;
				}
			}
			if(duplicate_vertices==false){
				//删除最后一个点【闭合点】
				fea.geometry.coordinates[0].pop();
				//增加当前点
				fea.geometry.coordinates[0].push([e.lngLat.lng, e.lngLat.lat]);
				//增加第一个点【闭合点】
				fea.geometry.coordinates[0].push(fea.geometry.coordinates[0][0]);
				this.repaint(); 
			}
			*/
			if(fea.geometry.coordinates[0].length==0){
				fea.geometry.coordinates[0].push([e.lngLat.lng, e.lngLat.lat], [e.lngLat.lng, e.lngLat.lat]);
			}
			else{
				fea.geometry.coordinates[0].splice(fea.geometry.coordinates[0].length-1, 0, [e.lngLat.lng, e.lngLat.lat]);
			}
			this.repaint(); 
		}
	}.bind(this), 250);
}

MapTools.prototype._onMousemove = function(e){
	if(this.draging_point!=null){
		//找到源数据，更新坐标
		if(this.draging_point.source==='geojson_point'){
			this.geojson_point.features[this.draging_point.source_fea_index].geometry.coordinates = [e.lngLat.lng, e.lngLat.lat];
			this.repaint();
		}
		else if(this.draging_point.source==='geojson_line'){
			this.geojson_line.features[this.draging_point.source_fea_index].geometry.coordinates[this.draging_point.source_coord_index] = [e.lngLat.lng, e.lngLat.lat];
			this.repaint();
		}
		else if(this.draging_point.source==='geojson_polygon'){
			//如果是起点或终点，需要设置两个坐标
			if(this.draging_point.source_coord_index===0 || this.draging_point.source_coord_index===this.geojson_polygon.features[this.draging_point.source_fea_index].geometry.coordinates[this.draging_point.source_geometry_index].length-1){
				this.geojson_polygon.features[this.draging_point.source_fea_index].geometry.coordinates[this.draging_point.source_geometry_index][0] = [e.lngLat.lng, e.lngLat.lat];
				this.geojson_polygon.features[this.draging_point.source_fea_index].geometry.coordinates[this.draging_point.source_geometry_index][this.geojson_polygon.features[this.draging_point.source_fea_index].geometry.coordinates[this.draging_point.source_geometry_index].length-1] = [e.lngLat.lng, e.lngLat.lat];
			}
			else{
				this.geojson_polygon.features[this.draging_point.source_fea_index].geometry.coordinates[this.draging_point.source_geometry_index][this.draging_point.source_coord_index] = [e.lngLat.lng, e.lngLat.lat];
			}
			this.repaint();
		}
		return;
	}
	if(this.mode === '') return;
	//放在mousemove里是因为鼠标移动到别的元素后会改变光标样式
	this._map.getCanvas().style.cursor = 'crosshair';
	
	if(this.tooltip){
		this.tooltip.setLngLat([e.lngLat.lng, e.lngLat.lat]);
	}
	else{
		var element = document.createElement('div');
		element.style.backgroundColor = '#FFFFFF';
		element.style.border = 'solid 1px #D1D1D1'
		element.style.padding = '3px';
		if(this.mode==='point' && (!this.drawOption || !this.drawOption.multiple)){
			element.innerHTML = '单击结束';
			this.tooltip = new mapboxgl.Marker({'element':element, 'offset': [40, 0]}).setLngLat([e.lngLat.lng, e.lngLat.lat]).addTo(this._map);
		}
		else{
			element.innerHTML = '鼠标单击开始，双击结束';
			this.tooltip = new mapboxgl.Marker({'element':element, 'offset': [100, 0]}).setLngLat([e.lngLat.lng, e.lngLat.lat]).addTo(this._map);
		}
	}

	if(this.temp_line.geometry.coordinates.length>0){
		if(this.mode==='line'){
			this.temp_line.geometry.coordinates[1] = [e.lngLat.lng, e.lngLat.lat];
			this._map.getSource('MapTools_temp_line').setData({'type':'FeatureCollection', 'features': [this.temp_line]});
		}
		else if(this.mode==='polygon'){
			this.temp_line.geometry.coordinates[1] = [e.lngLat.lng, e.lngLat.lat];
			//多边形的第一个点
			this.temp_line.geometry.coordinates[2] = this.geojson_polygon.features[this.geojson_polygon.features.length-1].geometry.coordinates[0][0];
			//刚开始画的时候画三角形，后面只画折线
			if(this.geojson_polygon.features[this.geojson_polygon.features.length-1].geometry.coordinates[0].length<=3){
				this.temp_line.geometry.coordinates[3] = this.geojson_polygon.features[this.geojson_polygon.features.length-1].geometry.coordinates[0][1];
			}
			else if(this.temp_line.geometry.coordinates.length==4){
				this.temp_line.geometry.coordinates.pop();
			}
			//this._map.getSource('MapTools_temp_line').setData(this.temp_line);
			this._map.getSource('MapTools_temp_line').setData({'type':'FeatureCollection', 'features': [this.temp_line]});
		}
		else if(this.mode==='rect'){
			this.temp_line.geometry.coordinates[1] = [this.temp_line.geometry.coordinates[0][0], e.lngLat.lat];
			this.temp_line.geometry.coordinates[2] = [e.lngLat.lng, e.lngLat.lat];
			this.temp_line.geometry.coordinates[3] = [e.lngLat.lng, this.temp_line.geometry.coordinates[0][1]];
			this.temp_line.geometry.coordinates[4] = this.temp_line.geometry.coordinates[0];
			this._map.getSource('MapTools_temp_line').setData(this.temp_line);
		}
		else if(this.mode==='circle'){
			//计算与圆心的距离
			var radius = turf.distance(this.temp_line.geometry.coordinates[0], [e.lngLat.lng, e.lngLat.lat]);
			var circle = turf.circle(this.temp_line.geometry.coordinates[0], radius);
			this.temp_line.geometry.coordinates[1] = [e.lngLat.lng, e.lngLat.lat];
			this._map.getSource('MapTools_temp_line').setData({'type':'FeatureCollection', 'features': [this.temp_line, circle]});
		}
	}
}

//双击结束
MapTools.prototype._onDblClick = function(e){
	window.clearTimeout(this.timeId);
	
	this.dblclick_x = e.lngLat.lng;
	this.dblclick_y = e.lngLat.lat;
	
	//绘点
	if(this.mode==='point'){
		this.geojson_point.features.push(turf.point([e.lngLat.lng, e.lngLat.lat]));
	}
	//绘线
	else if(this.mode==='line'){
		//最后一个feature
		let fea = this.geojson_line.features[this.geojson_line.features.length-1];
		fea.geometry.coordinates.push([e.lngLat.lng, e.lngLat.lat]);
	}
	//绘面
	else if(this.mode==='polygon'){
		//最后一个feature
		let fea = this.geojson_polygon.features[this.geojson_polygon.features.length-1];
		//如果有坐标相同则跳过，计算不相交polygon不能有重复的顶点
		/*
		let duplicate_vertices = false;
		for(var i=0;i<fea.geometry.coordinates[0].length;i++){
			if(fea.geometry.coordinates[0][i][0]==e.lngLat.lng && fea.geometry.coordinates[0][i][1]==e.lngLat.lat){
				duplicate_vertices = true;
				break;
			}
		}
		if(duplicate_vertices==false){
			//删除最后一个点【闭合点】
			fea.geometry.coordinates[0].pop();
			//增加当前点
			fea.geometry.coordinates[0].push([e.lngLat.lng, e.lngLat.lat]);
			//增加第一个点【闭合点】
			fea.geometry.coordinates[0].push(fea.geometry.coordinates[0][0]);
		}
		*/
		if(fea.geometry.coordinates[0].length==0){
			fea.geometry.coordinates[0].push([e.lngLat.lng, e.lngLat.lat], [e.lngLat.lng, e.lngLat.lat]);
		}
		else{
			fea.geometry.coordinates[0].splice(fea.geometry.coordinates[0].length-1, 0, [e.lngLat.lng, e.lngLat.lat]);
		}
	}
	//rect
	else if(this.mode==='rect'){
		if(isNaN(this.click_x) || isNaN(this.click_y)){
			return;
		}
		if(this.click_x == this.dblclick_x || this.click_y == this.dblclick_y){
			return;
		}
		let fea = this.geojson_polygon.features[this.geojson_polygon.features.length-1];
		fea.geometry.coordinates[0][0] = [this.click_x, this.click_y];
		fea.geometry.coordinates[0][1] = [this.click_x, this.dblclick_y];
		fea.geometry.coordinates[0][2] = [this.dblclick_x, this.dblclick_y];
		fea.geometry.coordinates[0][3] = [this.dblclick_x, this.click_y];
		fea.geometry.coordinates[0][4] = [this.click_x, this.click_y];
	}
	//circle
	else if(this.mode==='circle'){
		if(isNaN(this.click_x) || isNaN(this.click_y)){
			return;
		}
		//计算与圆心的距离
		let radius = turf.distance([this.click_x, this.click_y], [this.dblclick_x, this.dblclick_y]);
		let fea_circle = turf.circle([this.click_x, this.click_y], radius);
		this.geojson_polygon.features[this.geojson_polygon.features.length-1].geometry = fea_circle.geometry;
		this.geojson_polygon.features[this.geojson_polygon.features.length-1].properties.radius = radius;
	}
	
	//line-如果最后一个对象的节点数不够，删除，避免中间混入不合格的feature
	let fea_line = this.geojson_line.features[this.geojson_line.features.length-1];
	if(fea_line && fea_line.geometry.coordinates.length<2){
		this.geojson_line.features.pop();
	}
	else if(fea_line && fea_line.properties.complete==false){
		fea_line.properties.complete=true;
	}
	
	//polygon-判断点数量，如果小于4个去除最后一个feature，避免中间混入不合格的feature
	let fea_polygon = this.geojson_polygon.features[this.geojson_polygon.features.length-1];
	if(fea_polygon && fea_polygon.geometry.coordinates[0].length<4){		
		this.geojson_polygon.features.pop();
	}
	else if(fea_polygon && fea_polygon.properties.complete==false){
		fea_polygon.properties.complete=true;
	}
	
	window.setTimeout(function(){
		if(this._map){
			this._map.doubleClickZoom.enable();
		}
	}.bind(this), 0);
	//重绘
	this.repaint(); 
	//完成
	this.complate();
}

//绘制完成
MapTools.prototype.complate = function(){
	//调用回调方法
	var complate_fun = this._callback['complate'];
	if(complate_fun){
		if(this.mode==='point'){
			complate_fun(this.mode, this.drawOption, this.geojson_point.features[this.geojson_point.features.length-1].geometry);
		}
		else if(this.mode==='line'){
			complate_fun(this.mode, this.drawOption, this.geojson_line.features[this.geojson_line.features.length-1].geometry);
		}
		else if(this.mode==='polygon' || this.mode==='rect' || this.mode==='circle'){
			complate_fun(this.mode, this.drawOption, this.geojson_polygon.features[this.geojson_polygon.features.length-1].geometry);
		}
	}

	this._map.getCanvas().style.cursor = '';
	this.temp_line.geometry.coordinates = [];
	this._map.getSource('MapTools_temp_line').setData(this.temp_line);

	if(this.tooltip){
		this.tooltip.remove();
		this.tooltip = null;
	}

	this.click_x = Number.NaN;
	this.click_y = Number.NaN;
	this.move_x = Number.NaN;
	this.move_y = Number.NaN;
	this.dblclick_x = Number.NaN;
	this.dblclick_y = Number.NaN;

	//把mode置空
	this.mode = '';
	this.isActive = false;
}

MapTools.prototype.repaint = function(){
	var feaArr = [];
	//标记
	for(var i=0; i<this.markers.length; i++){
		this.markers[i].remove();
	}
	//点
	turf.featureEach(this.geojson_point, function(fea, featureIndex){
		turf.coordEach(fea, function(coord, coordIndex){
			let tmp = turf.point(coord, {'source':'geojson_point', 'source_fea_index': featureIndex, 'source_coord_index': coordIndex, 'type': '01'});
			feaArr.push(tmp);

			//缓冲区
			if(fea.properties.drawOption && fea.properties.drawOption.buffer && fea.properties.drawOption.buffer>0){
				let buffered = turf.buffer(fea, fea.properties.drawOption.buffer, {units:'kilometers'});
				feaArr.push(buffered);
			}

			//显示文本、删除按钮
			if(fea.properties.drawOption && (fea.properties.drawOption.text || fea.properties.drawOption.delete)){
				let element = document.createElement('div');
				element.style.backgroundColor = this.options.markerBackgroundColor;
				element.style.border = 'solid 1px #D1D1D1';
				element.style.padding = '3px';
				element.style['border-radius'] = '5px';

				if(fea.properties.drawOption.text){
					element.innerHTML = fea.properties.drawOption.text;
				}

				if(fea.properties.drawOption.delete){
					let delHref = document.createElement('a');
					delHref.href = 'javascript:void(0)';
					delHref.innerHTML = '删除';
					delHref.onclick = (function(v){return function(){this.delPoint(v);}.bind(this)}.bind(this))(featureIndex);
					element.appendChild(delHref);
				}
				
				let marker = new mapboxgl.Marker({'element':element, 'offset': [0, 20]}).setLngLat(fea.geometry.coordinates).addTo(this._map);
				this.markers.push(marker);
			}
		}.bind(this));
	}.bind(this));
	
	//线
	turf.featureEach(this.geojson_line, function(fea, featureIndex){
		if(fea.geometry.coordinates.length>=2){
			feaArr.push(fea);

			//缓冲区，不能直接用turf.buffer，如果线段交叉且范围很大会出现计算错误的情况
			if(fea.properties.drawOption && fea.properties.drawOption.buffer && fea.properties.drawOption.buffer>0){
				let kinks = turf.kinks(fea);
				if(kinks.features.length>0){
					let lines = turf.lineSegment(fea);
					turf.featureEach(lines, function(f){
						let buffered = turf.buffer(f, fea.properties.drawOption.buffer, {units:'kilometers'});
						feaArr.push(buffered);
					});
				}
				else{
					let buffered = turf.buffer(fea, fea.properties.drawOption.buffer, {units:'kilometers'});
					feaArr.push(buffered);
				}
			}
			//计算距离，绘制点，增加标注【每个节点标注】
			else if(fea.properties.drawOption && fea.properties.drawOption.distance){
				var dis = 0;
				turf.coordEach(fea, function(coord, coordIndex){
					//创建标记
					dis += coordIndex==0?0:turf.distance(coord, fea.geometry.coordinates[coordIndex-1]);
					let element = document.createElement('div');
					element.style.backgroundColor = this.options.markerBackgroundColor;
					element.style.border = 'solid 1px #D1D1D1';
					element.style.padding = '3px';
					element.style['border-radius'] = '5px';
					//起点
					if(coordIndex==0){
						element.innerHTML = '起点';
					}
					//终点
					else if(coordIndex==fea.geometry.coordinates.length-1 && fea.properties.complete==true){
						element.innerHTML = '总长 ' + dis.toLocaleString() + '千米&nbsp;&nbsp;';
						let delHref = document.createElement('a');
						delHref.href = 'javascript:void(0)';
						delHref.innerHTML = '删除';
						delHref.onclick = (function(v){return function(){this.delLine(v);}.bind(this)}.bind(this))(featureIndex);
						element.appendChild(delHref);
					}
					//中间点
					else{
						element.innerHTML = dis.toLocaleString() + '千米';
					}
					let marker = new mapboxgl.Marker({'element':element, 'offset': [0, 20]}).setLngLat(coord).addTo(this._map);
					this.markers.push(marker);
				}.bind(this));
			}

			//显示删除按钮，量距distance=true的自带了删除
			if(fea.properties.drawOption && fea.properties.drawOption.delete && !fea.properties.drawOption.distance && fea.properties.complete==true){
				let element = document.createElement('div');
				element.style.backgroundColor = this.options.markerBackgroundColor;
				element.style.border = 'solid 1px #D1D1D1';
				element.style.padding = '3px';
				element.style['border-radius'] = '5px';

				let delHref = document.createElement('a');
				delHref.href = 'javascript:void(0)';
				delHref.innerHTML = '删除';
				delHref.onclick = (function(v){return function(){this.delLine(v);}.bind(this)}.bind(this))(featureIndex);
				element.appendChild(delHref);

				let position = fea.geometry.coordinates[fea.geometry.coordinates.length-1];
				let marker = new mapboxgl.Marker({'element':element, 'offset': [0, 20]}).setLngLat(position).addTo(this._map);
				this.markers.push(marker);
			}

			if(!(fea.properties.drawOption && fea.properties.drawOption.hideNode)){
				turf.coordEach(fea, function(coord, coordIndex){
					//节点
					let tmp = turf.point(coord, {'source':'geojson_line', 'source_fea_index': featureIndex, 'source_coord_index': coordIndex, 'type': '01'});
					feaArr.push(tmp);
					//中心点
					if(coordIndex>0){
						let cx = (coord[0] + fea.geometry.coordinates[coordIndex-1][0])/2;
						let cy = (coord[1] + fea.geometry.coordinates[coordIndex-1][1])/2;
						tmp = turf.point([cx, cy], {'source':'geojson_line', 'source_fea_index': featureIndex, 'source_coord_index': coordIndex, 'type': '02'});
						feaArr.push(tmp);
					}
				});
			}
		}
	}.bind(this));
	//面
	turf.featureEach(this.geojson_polygon, function(fea, featureIndex){
		if(fea.geometry.coordinates[0].length>=4){
			let polygon = MapTools.makevalid(fea);
			feaArr.push(polygon);

			//缓冲区
			if(fea.properties.drawOption && fea.properties.drawOption.buffer && fea.properties.drawOption.buffer>0){
				let buffered = turf.buffer(polygon, fea.properties.drawOption.buffer, {units:'kilometers'});
				feaArr.push(buffered);
			}
			//绘制节点，圆不需要显示节点
			if(fea.properties.mode!='circle' && !(fea.properties.drawOption && fea.properties.drawOption.hideNode)){
				//geometryIndex用来区分孔洞
				for(let geomIndex=0; geomIndex<fea.geometry.coordinates.length; geomIndex++){
					for(let coordIndex=0; coordIndex<fea.geometry.coordinates[geomIndex].length; coordIndex++){
						//节点
						let tmp = turf.point(fea.geometry.coordinates[geomIndex][coordIndex], 
							{'source':'geojson_polygon', 'source_fea_index': featureIndex, 'source_geometry_index':geomIndex, 'source_coord_index': coordIndex, 'type': '01'});
						feaArr.push(tmp);
						//中心点
						if(coordIndex>0){
							let cx = (fea.geometry.coordinates[geomIndex][coordIndex][0] + fea.geometry.coordinates[geomIndex][coordIndex-1][0])/2;
							let cy = (fea.geometry.coordinates[geomIndex][coordIndex][1] + fea.geometry.coordinates[geomIndex][coordIndex-1][1])/2;
							tmp = turf.point([cx, cy], 
								{'source':'geojson_polygon', 'source_fea_index': featureIndex, 'source_geometry_index':geomIndex, 'source_coord_index': coordIndex, 'type': '02'});
							feaArr.push(tmp);
						}
					}
				}
				/*
				turf.coordEach(fea, function(coord, coordIndex, featureIndex2, multiFeatureIndex, geometryIndex){
					let tmp = turf.point(coord, {'source':'geojson_polygon', 'source_fea_index': featureIndex, 'source_coord_index': coordIndex, 'source_geometry_index':geometryIndex, 'type': '01'});
					feaArr.push(tmp);

					//中心点【用于增加节点操作】
					if(coordIndex>10000){
						let cx = (coord[0] + fea.geometry.coordinates[0][coordIndex-1][0])/2;
						let cy = (coord[1] + fea.geometry.coordinates[0][coordIndex-1][1])/2;
						tmp = turf.point([cx, cy], {'source':'geojson_polygon', 'source_fea_index': featureIndex, 'source_coord_index': coordIndex, 'type': '02'});
						feaArr.push(tmp);
					}
				});*/
			}

			//完成才计算面积，增加标注【中心标注】
			if(fea.properties.drawOption && fea.properties.drawOption.area && fea.properties.complete==true){
				let element = document.createElement('div');
				element.style.backgroundColor = this.options.markerBackgroundColor;
				element.style.border = 'solid 1px #D1D1D1';
				element.style.padding = '3px';
				element.style['border-radius'] = '5px';

				let area = turf.area(fea)/1000/1000;
				element.innerHTML = area.toLocaleString() + '平方千米&nbsp;&nbsp;';
			
				/*
				if(fea.properties.drawOption && fea.properties.drawOption.area){	
					var area = turf.area(fea)/1000/1000;
					element.innerHTML = area.toLocaleString() + '平方千米&nbsp;&nbsp;';
				}
				else if(fea.properties.mode==='circle'){
					element.innerHTML = 'r='+fea.properties.radius.toLocaleString() + '千米&nbsp;&nbsp;';
				}*/
			
				let delHref = document.createElement('a');
				delHref.href = 'javascript:void(0)';
				delHref.innerHTML = '删除';
				delHref.onclick = (function(v){return function(){this.delPolygon(v);}.bind(this)}.bind(this))(featureIndex);
				element.appendChild(delHref);
				
				let position = turf.center(fea).geometry.coordinates;
				let marker = new mapboxgl.Marker({'element':element, 'offset': [-20, -10]}).setLngLat(position).addTo(this._map);
				this.markers.push(marker);
			}

			//显示删除按钮，量距distance=true的自带了删除
			if(fea.properties.drawOption && fea.properties.drawOption.delete && !fea.properties.drawOption.area && fea.properties.complete==true){
				let element = document.createElement('div');
				element.style.backgroundColor = this.options.markerBackgroundColor;
				element.style.border = 'solid 1px #D1D1D1';
				element.style.padding = '3px';
				element.style['border-radius'] = '5px';

				let delHref = document.createElement('a');
				delHref.href = 'javascript:void(0)';
				delHref.innerHTML = '删除';
				delHref.onclick = (function(v){return function(){this.delPolygon(v);}.bind(this)}.bind(this))(featureIndex);
				element.appendChild(delHref);

				let position = turf.center(fea).geometry.coordinates;
				let marker = new mapboxgl.Marker({'element':element, 'offset': [0, 20]}).setLngLat(position).addTo(this._map);
				this.markers.push(marker);
			}
		}
	}.bind(this));
	
	//设置datasource
	this._map.getSource('MapTools_geojson').setData(turf.featureCollection(feaArr));
}
//删除点
MapTools.prototype.delPoint = function(v){
	this.geojson_point.features.splice(v, 1);
	this.repaint();
}
//删除line
MapTools.prototype.delLine = function(v){
	this.geojson_line.features.splice(v, 1);
	this.repaint();
}
//删除测polygon
MapTools.prototype.delPolygon = function(v){
	this.geojson_polygon.features.splice(v, 1);
	this.repaint();
}
//清除所有
MapTools.prototype.clean = function(){
	this.geojson_point.features.length = 0;
	this.geojson_line.features.length = 0;
	this.geojson_polygon.features.length = 0;
	this.completeCallback = null;
	
	this._map.getCanvas().style.cursor = '';
	this.temp_line.geometry.coordinates = [];
	this._map.getSource('MapTools_temp_line').setData(this.temp_line);
	
	if(this.tooltip){
		this.tooltip.remove();
		this.tooltip = null;
	}
	
	this.click_x = Number.NaN;
	this.click_y = Number.NaN;
	this.move_x = Number.NaN;
	this.move_y = Number.NaN;
	this.dblclick_x = Number.NaN;
	this.dblclick_y = Number.NaN;
	
	window.setTimeout(function(){this._map.doubleClickZoom.enable()}.bind(this), 0);
	
	this.repaint(); 
	this.mode = '';
	this.isActive = false;
}

//获取所有点线面对象
MapTools.prototype.getAll = function(){
	return {
		'point': this.geojson_point.features,
		'line': this.geojson_line.features,
		'polygon': this.geojson_polygon.features
	}
}

//将自相交多边形重新构造成有效多边形
MapTools.makevalid = function(fea){
	fea = turf.cleanCoords(fea);
	let kinks = turf.kinks(fea);
	if(kinks.features.length<1){
		return fea;
	}
	
	let fc = turf.unkinkPolygon(fea);
	let coordinates = [];
	turf.featureEach(fc, function(f){
		coordinates.push(f.geometry.coordinates);
	});
	let polygon = turf.multiPolygon(coordinates);
	return polygon;
}