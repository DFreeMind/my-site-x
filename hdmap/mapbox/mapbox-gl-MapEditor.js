//mapbox gl 地图编辑工具，依赖mapbox-gl-MapTools.js，陈顺华，2021.3.30
/*********************调用方法************************/
/*MapEditor.begin(
                {
					center: [105, 36],
					zoom: 3,
					minZoom: 1,
					maxZoom: 18,
					pitch: 0,
					boxZoom: false,
					localFontFamily: 'Microsoft YaHei Regular',
					style: 'mapbus://mapbox-gl/style/map_gray.json',
					preserveDrawingBuffer: true,
					transformRequest: function (url, resourceType) {
						if (url.startsWith('mapbus://')) {
							return { url: 'http://localhost/' + url.split('//')[1] };
						}
					}
				},
				{point: 0, line: 1, polygon: 1},
				{type:'MultiLineString', coordinates:[[[116.26, 39.93],[117.26, 35.93]],[[111.26, 34.93],[113.26, 32.93]]]},
				function(v){console.log(v)}
                )
*/
/***************************************************/
var MapEditor = {
    mapbox_gl_map: undefined,
    map_tools: undefined,

    confirm_callback: undefined,
    cancal_callback: undefined,

    begin: function(mapOption, editOption, geom, confirm_callback, cancal_callback) {
        this.confirm_callback = confirm_callback;
        this.cancal_callback = cancal_callback;
        //mask
        if (!document.getElementById('mapeditor_mask')) {
            let mask = document.createElement('div');
            mask.id = 'mapeditor_mask';
            mask.style.cssText = 'position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:1000;background-color:#000000;opacity:0.5';
            document.body.appendChild(mask);
        }
        //wrap
        if (!document.getElementById('mapeditor_wrap')) {
            let wrap = document.createElement('div');
            wrap.id = 'mapeditor_wrap';
            wrap.style.cssText = 'position:absolute;left:20px;top:20px;right:20px;bottom:20px;z-index:1001;background-color:#F2F2F2; border-radius:5px';

            wrap.innerHTML = `
                <div id="mapeditor_map" style=" position: absolute; left: 0px; top:0px; right: 0px; bottom: 0px; border-radius:5px">
                    
                </div>
                <div style="position: absolute; top:10px; right: 10px; display: flex;">
                    <div class="mapbox-gl-editor_point" title="点" onclick="MapEditor.map_tools.setMode('point', {delete: true})"></div>
                    <div class="mapbox-gl-editor_line" title="线" onclick="MapEditor.map_tools.setMode('line', {delete: true})"></div>
                    <div class="mapbox-gl-editor_polygon" title="面" onclick="MapEditor.map_tools.setMode('polygon', {delete: true})"></div>
                    <!--<div class="mapbox-gl-editor_trash" title="删除" ></div>-->
                    <div class="mapbox-gl-editor_confirm"  title="确定" onclick="MapEditor.confirm()"></div>
                    <div class="mapbox-gl-editor_close"  title="取消" onclick="MapEditor.cancal()"></div>
                </div>
            `;
            document.body.appendChild(wrap);
        }

        if(editOption){
            if(editOption.point<1){
                $('div.mapbox-gl-editor_point').hide();
            }
            if(editOption.line<1){
                $('div.mapbox-gl-editor_line').hide();
            }
            if(editOption.polygon<1){
                $('div.mapbox-gl-editor_polygon').hide();
            }
        }

        this.mapbox_gl_map = new mapboxgl.Map(Object.assign({}, mapOption, {container: 'mapeditor_map'}));

        this.mapbox_gl_map.on('load', function(){
            this.map_tools = new MapTools().addTo(this.mapbox_gl_map);

            if(geom){
                this.mapbox_gl_map.fitBounds(turf.bbox(geom), {padding: 50})
                this.map_tools.edit(geom, {delete: true});
            }
        }.bind(this)) 
    },

    //保存
    confirm: function(){
        if(this.confirm_callback){
            this.confirm_callback(this.map_tools.getAll());
        }
        $('#mapeditor_mask').remove();
        $('#mapeditor_wrap').remove();
    },

    //取消
    cancal: function(){
        if(this.cancal_callback){
            this.cancal_callback(this.map_tools.getAll());
        }
        $('#mapeditor_mask').remove();
        $('#mapeditor_wrap').remove();
    }
}