// ==UserScript==
// @name         磨房轨迹下载
// @author       jjm2473
// @copyright    2015, jjm2473@qq.com
// @supportURL   mailto:jjm2473@qq.com
// @namespace    https://openuserjs.org/users/jjm2473/
// @version      0.1
// @description  磨房轨迹下载
// @icon         http://c1.zdb.io/favicon.ico
// @match        http://www.doyouhike.net/dest/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function(){
/**
 * Created by Wandergis on 2015/7/8.
 * 提供了百度坐标（BD09）、国测局坐标（火星坐标，GCJ02）、和WGS84坐标系之间的转换
 */

//定义一些常量
var x_PI = 3.14159265358979324 * 3000.0 / 180.0;
var PI = 3.1415926535897932384626;
var a = 6378245.0;
var ee = 0.00669342162296594323;

/**
 * 百度坐标系 (BD-09) 与 火星坐标系 (GCJ-02)的转换
 * 即 百度 转 谷歌、高德
 * @param bd_lon
 * @param bd_lat
 * @returns {*[]}
 */
function bd09togcj02(bd_lon, bd_lat) {
    var x_pi = 3.14159265358979324 * 3000.0 / 180.0;
    var x = bd_lon - 0.0065;
    var y = bd_lat - 0.006;
    var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
    var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
    var gg_lng = z * Math.cos(theta);
    var gg_lat = z * Math.sin(theta);
    return [gg_lng, gg_lat]
}

/**
 * 火星坐标系 (GCJ-02) 与百度坐标系 (BD-09) 的转换
 * 即谷歌、高德 转 百度
 * @param lng
 * @param lat
 * @returns {*[]}
 */
function gcj02tobd09(lng, lat) {
    var z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_PI);
    var theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_PI);
    var bd_lng = z * Math.cos(theta) + 0.0065;
    var bd_lat = z * Math.sin(theta) + 0.006;
    return [bd_lng, bd_lat]
}

/**
 * WGS84转GCj02
 * @param lng
 * @param lat
 * @returns {*[]}
 */
function wgs84togcj02(lng, lat) {
    if (out_of_china(lng, lat)) {
        return [lng, lat]
    }
    else {
        var dlat = transformlat(lng - 105.0, lat - 35.0);
        var dlng = transformlng(lng - 105.0, lat - 35.0);
        var radlat = lat / 180.0 * PI;
        var magic = Math.sin(radlat);
        magic = 1 - ee * magic * magic;
        var sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
        dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
        var mglat = lat + dlat;
        var mglng = lng + dlng;
        return [mglng, mglat]
    }
}

/**
 * GCJ02 转换为 WGS84
 * @param lng
 * @param lat
 * @returns {*[]}
 */
function gcj02towgs84(lng, lat) {
    if (out_of_china(lng, lat)) {
        return [lng, lat]
    }
    else {
        var dlat = transformlat(lng - 105.0, lat - 35.0);
        var dlng = transformlng(lng - 105.0, lat - 35.0);
        var radlat = lat / 180.0 * PI;
        var magic = Math.sin(radlat);
        magic = 1 - ee * magic * magic;
        var sqrtmagic = Math.sqrt(magic);
        dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
        dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
        mglat = lat + dlat;
        mglng = lng + dlng;
        return [lng * 2 - mglng, lat * 2 - mglat]
    }
}

function transformlat(lng, lat) {
    var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
    return ret
}

function transformlng(lng, lat) {
    var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
    return ret
}

/**
 * 判断是否在国内，不在国内则不做偏移
 * @param lng
 * @param lat
 * @returns {boolean}
 */
function out_of_china(lng, lat) {
    return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
}

window.gcj02towgs84=gcj02towgs84;
})();

function XMLNode(tag){
    this.tagName=tag;
    this.childNodes=[];
    this.innerText=null;
}

XMLNode.prototype = {
    toString:function(indent){
        indent=indent||0;
        var cindent="";
        var i;
        for(i=0;i<indent;++i)cindent+='\t';
        //var nindent=cindent+'\t';
        var result="\n"+cindent+"<"+this.tagName+">";
        if(this.innerText)result+=this.innerText;
        ++indent;
        for(i=0;i<this.childNodes.length;++i){
            result+=this.childNodes[i].toString(indent);
        }
        if(i)result+=("\n"+cindent);
        result+=("</"+this.tagName+">");
        return result;
    },
    appendChild:function(node){
        this.childNodes.push(node);
        return this;
    },
    setText:function(text){
        this.innerText=text;
        return this;
    }
};

(
function(){
    var container=document.getElementById("xlznIndexBasic").lastElementChild;
    if(container === null)return;
    var TripName=document.getElementsByTagName('h1')[0].innerText;
    var KMLHeader='<?xml version="1.0" encoding="UTF-8"?>\n'+
                  '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">';
    var KMLTail='\n</kml>';
    var aa=document.createElement("a");
    aa.href="javascript:void(0)";
    aa.innerText="下载轨迹";
    aa.classList.add("xlzn_create");
    container.insertBefore(aa, container.firstElementChild);
    var getTrack=function(cb){
        var coords=[];
        $.each(mapLineArr, function(i, val){
            var wgsco=gcj02towgs84(parseFloat(val.Lng), parseFloat(val.Lat));
            coords.push(wgsco[0]+","+wgsco[1]+","+val.Alt);
        });
        var pm=new XMLNode("Placemark");
        pm.appendChild(new XMLNode("name").setText("Path"))
            .appendChild(new XMLNode("LineString")
                         .appendChild(new XMLNode("coordinates")
                                     .appendChild(coords.join(" "))));
        cb(pm);

    };

    var exportString = function ( output , filename) {
		var blob = new Blob( [ output ], { type: 'text/plain' } );
		var objectURL = URL.createObjectURL( blob );
        var a=document.createElement('a');
        a.href=objectURL;
        a.download=filename||'Untitled';
        a.click();
	};
    var wrapKML=function(track){
        var childs=document.getElementById('xlznIndexBasic').firstElementChild.children;
        var doc=new XMLNode("Document").appendChild(new XMLNode("name").setText(TripName+".kml"))
               .appendChild(new XMLNode("description").setText('<![CDATA[<a href="'+location.href+'">'+location.href+'</a><br/><pre>'+
                                            childs[2].innerText+'\n'+childs[3].innerText+'\n'+childs[4].innerText+'\n'+
                                            childs[5].innerText+'\n'+childs[6].innerText+'\n'+childs[7].innerText+'\n'+childs[8].innerText+'</pre>]]>'))
               .setText('\n\t<atom:author><atom:name>export by jjm2473\'s script</atom:name></atom:author><atom:link href="https://openuserjs.org/scripts/jjm2473/"></atom:link>');
        doc.appendChild(track);
        return KMLHeader+doc.toString()+KMLTail;
    }
    aa.addEventListener("click",function(){
        getTrack(function(track){
            exportString(wrapKML(track),TripName+".kml");
        });
    });
    console.error("jjm2473,I am here!");//just for debug
})();
