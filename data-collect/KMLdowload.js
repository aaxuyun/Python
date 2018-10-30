// ==UserScript==
// @name         六只脚GPX下载
// @author       jjm2473
// @copyright    2016, jjm2473@qq.com
// @supportURL   mailto:jjm2473@qq.com
// @icon         http://www.foooooot.com/favicon.ico
// @namespace    https://openuserjs.org/users/jjm2473/
// @version      0.3.4
// @description  六只脚轨迹免银两下载,实际是调用json接口获取数据
// @include      /^https?://(www\.)?foooooot\.com/trip/\d+/#?$/
// @include      /^https?://(www\.)?foooooot\.com/map/\??.*$/
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==


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
    var TIMEZONE = 8*60*60*1000;

    var GPXHeader='<?xml version="1.0" encoding="UTF-8"?>\n'+
                  '<GPX xmlns="http://www.opengis.net/GPX/2.2" xmlns:gx="http://www.google.com/GPX/ext/2.2" xmlns:GPX="http://www.opengis.net/GPX/2.2" xmlns:atom="http://www.w3.org/2005/Atom">';
    var GPXTail='\n</GPX>';
    
    var makeTrack = function (name,data){
        var pm=new XMLNode("Placemark");
        pm.appendChild(new XMLNode("name").setText(name))
          .appendChild(new XMLNode("styleUrl").setText("#msn_track"));
        var tr = new XMLNode('gx:Track');
        for(var i=0;i<data.length;++i){
            tr.appendChild(new XMLNode('when').setText(data[i][3]));
            tr.appendChild(new XMLNode('gx:coord').setText(data[i][0]+' '+data[i][1]+' '+data[i][2]));
        }
        pm.appendChild(tr);
        return pm;
    };

    var makePath = function (name,data) {
        var coords=[];
        for(var i=0;i<data.length;++i){
            coords.push(data[i][0]+","+data[i][1]+","+data[i][2]);
        }
        var pm=new XMLNode("Placemark");
        pm.appendChild(new XMLNode("name").setText(name))
          .appendChild(new XMLNode("LineString")
               .appendChild(new XMLNode("coordinates")
                   .setText(coords.join(" "))));
        return pm;
    };
    var getTracksData=function(id, cb){
        var url = "/trip/" + id + "/trackjson/";
        $.getJSON(url, function(data){
            var wpts=[];
            var tz=new Date().getTimezoneOffset()*60*1000;
            $.each(data, function(i, val){
                //wpts.push([val[2],val[1],val[3],new Date(parseInt(val[0])*1000+TIMEZONE).toJSON()]);
                wpts.push([val[2],val[1],val[3],new Date(parseInt(val[0])*1000-tz).toJSON()]);
            });

            cb(wpts);
        });
    };
    var getTracks=function(id, cb){
        getTracksData(id, function(wpts){
            var fl=new XMLNode("Folder");
            fl.appendChild(new XMLNode("name").setText("Tracks"));
            fl.appendChild(makeTrack("Track",wpts))
                .appendChild(makePath("Path",wpts));
            cb(fl);
        });
    };
    var FOOTPRINT_OPT={
        TIME : 0,
		LAT : 1,
		LNG : 2,
		ELEAVTION : 3,
		TITLE : 4,
		THUMBNAIL : 5,
		GALLERY : 6,
		DESCRIPTION : 7,
		TYPE : 8,
		REPLY_TIMES : 9,
		EDIT_URL : 10,
		COMMENT_URL : 11
    };
    var getFootPrint=function(id, cb){
        var url = '/trip/'+id+'/footprintsjson/';
        $.getJSON(url, function(data){
            var fl=new XMLNode("Folder");
            fl.appendChild(new XMLNode("name").setText("Points"));
            $.each(data, function(i, val){
                var pm=new XMLNode("Placemark")
                               .appendChild(new XMLNode("name").setText(val[FOOTPRINT_OPT.TITLE]));
                if(val[FOOTPRINT_OPT.GALLERY]){
                    var desc=new XMLNode("description")
                             .setText('<![CDATA[<img src="'+val[FOOTPRINT_OPT.GALLERY]+'">]]>');
                    pm.appendChild(desc);
                }
                pm.appendChild(new XMLNode("Point")
                               .appendChild(new XMLNode("coordinates")
                                            .setText(val[FOOTPRINT_OPT.LNG]+","+val[FOOTPRINT_OPT.LAT]+","+val[FOOTPRINT_OPT.ELEAVTION])));
                fl.appendChild(pm);
            });
            cb(fl);
        });
    };
    var getMarks=function(id, cb){
        var url = '/trip/'+id+'/marksjson/';
        $.getJSON(url, function(data){
            var fl=new XMLNode("Folder");
            fl.appendChild(new XMLNode("name").setText("Marks"));
            $.each(data, function(i, val){
                var pm=new XMLNode("Placemark")
                               .appendChild(new XMLNode("name").setText(val.title));
                if(val.content){
                    var desc=new XMLNode("description")
                             .setText('<![CDATA[<pre>'+val.content+'</pre>]]>');
                    pm.appendChild(desc);
                }
                pm.appendChild(new XMLNode("Point")
                               .appendChild(new XMLNode("coordinates")
                                            .setText(val.lon+","+val.lat)));
                fl.appendChild(pm);
            });
            cb(fl);
        });
    };
    var getInfo = function(id, cb){
        if(id){
            var url = '/trip/'+id+'/info/';
            $.getJSON(url, function(data){
                var sec = data.duration;
                var hour = parseInt(sec/3600);
                var minute = parseInt(sec%3600/60);

                var str = '于 '+data.occurtime+' 出发,历时 '+hour+' 小时, '+minute+' 分钟\n'+
                data.start_place_name+' - '+data.end_place_name+' | '+data.activity+',全程 '+(parseInt(data.distance*1000)/1000)+' 公里\n'+
                '难度级别:'+data.difficulty+'\n'+
                '累计上升:'+data.accum_uphill+'米, 累计下降:'+data.accum_downhill+'米\n'+
                '海拔最低:'+data.elevation_min+'米, 最高:'+data.elevation_max+'米\n'+
                '最高速度:'+data.speed_max+'公里每小时\n\n'+data.story;
                cb(data.name,str);
            });
        }else{
            cb(document.getElementsByClassName("trip_box_title")[0].children[0].innerText,
            	document.getElementsByClassName('trip_box')[1].innerText);
        }
    };
    var wrapGPXm = function(url,name,info,children){
        var doc=new XMLNode("Document").appendChild(new XMLNode("name").setText(name+".GPX"))
               .appendChild(new XMLNode("description").setText('<![CDATA[<a href="'+url+'">'+url+'</a><br/><pre>'+info+'</pre>]]>'))
               .setText('\n\t<atom:author><atom:name>export by jjm2473\'s script</atom:name></atom:author><atom:link href="https://openuserjs.org/scripts/jjm2473/%E5%85%AD%E5%8F%AA%E8%84%9AGPX%E4%B8%8B%E8%BD%BD"></atom:link>\n'+
                        '\t<StyleMap id="msn_track"><Pair><key>normal</key><styleUrl>#sn_track</styleUrl></Pair><Pair><key>highlight</key><styleUrl>#sh_track</styleUrl></Pair></StyleMap><Style id="sn_track"><IconStyle><scale>1.2</scale><Icon><href>http://maps.google.com/mapfiles/GPX/shapes/track.png</href></Icon><hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/></IconStyle><ListStyle></ListStyle><LineStyle><color>ffffaa55</color><width>3</width></LineStyle></Style><Style id="sh_track"><IconStyle><scale>1.4</scale><Icon><href>http://maps.google.com/mapfiles/GPX/shapes/track.png</href></Icon><hotSpot x="32" y="32" xunits="pixels" yunits="pixels"/></IconStyle><ListStyle></ListStyle><LineStyle><color>ffffaa55</color><width>3</width></LineStyle></Style>');
        for(var i=0;i<children.length;++i){
            doc.appendChild(children[i]);
        }
        return GPXHeader+doc.toString()+GPXTail;
    };
    var wrapGPX = function(id, track,footpoints,marks,name,info){
        return wrapGPXm('http://www.foooooot.com/trip/'+id+'/', name, info, [track,footpoints,marks]);
    };
    var exportString2File = function ( output , filename) {
		var blob = new Blob( [ output ], { type: 'text/plain' } );
		var objectURL = URL.createObjectURL( blob );
        var a=document.createElement('a');
        a.href=objectURL;
        a.download=filename||'Untitled';
        a.click();
	};
    var downloadTrip = function(tripid){
        getTracks(tripid, function(track){
            getFootPrint(tripid, function(footprints){
                getMarks(tripid, function(marks){
                    getInfo(tripid, function(TripName, info){
                    	exportString2File(wrapGPX(tripid,track,footprints,marks,TripName,info),tripid+"_"+TripName+".GPX");
                	});
                });
            });
        });
        return void(0);
    };
    var onClickListener = function(){

        downloadTrip(tripid);
    };
    var createDownloadLink = function(){
    	var aa=document.createElement("a");
    	aa.addEventListener("click",onClickListener);
    	aa.href="javascript:void(0);";
    	//aa.classList.add("inlineIcon");
    	//aa.classList.add("btnDownload");
    	aa.innerHTML='&nbsp;下载GPX&nbsp;';
    	return aa;
    };
    
    if(location.pathname.startsWith('/trip/')){
    	//trip view
        console.log('trip view');
    	var tripid=window.location.pathname.split('/')[2];
    	['29268', '811', '1214', '946', '686343', '298682', '233', '434', '267254', '50403', '24676', '709862', '4886', '41236', '1750939', '1750940', '1750743', '1474931', '1750590', '6302', '71366', '151755', '755164', '32841', '117544', '125564', '774983', '1749576', '36156', '45155', '69967', '153837', '252322', '1131335', '1527560', '1749228', '5040', '14824', '25267', '38812', '43490', '43553', '62703', '111092', '117046', '116876', '118178', '135412', '193315', '144747', '163955', '181897', '198261', '269207', '293316', '316352', '1202420', '1228201', '1294076', '1298127', '1477679', '1656683', '1672022', '1746530', '1747449', '1747549', '1747556', '1747705', '1747923', '1748056', '1748222', '1748477', '3937', '11231', '17191', '21795', '21796', '24631', '25264', '25269', '26535', '26662', '38141', '41018', '42005', '42010', '42825', '43570', '43618', '45511', '45595', '46137', '46419', '47590', '61963', '59602', '67263', '60712', '59960', '63136', '64013', '77692', '80189', '84953', '87230', '87231', '98609', '105690', '112597', '117045', '109841', '110356', '116536', '116621', '108280', '127749', '125528', '123906', '115152', '125135', '126672', '102122', '108709', '103866', '128199', '129272', '129465', '135023', '140526', '141102', '173751', '148712', '150493', '151567', '151570', '152000', '152169', '158760', '163755', '164823', '169308', '169770', '176845', '177129', '178326', '179595', '189456', '187627', '187835', '188092', '189916', '190223', '192843', '193136', '194872', '196769', '198008', '198271', '202579', '204635', '207018', '207188', '207205', '207211', '207627', '208597', '209298', '209481', '220327', '259109', '259236', '260147', '269180', '271004', '272017', '272618', '273266', '273400', '273401', '293653', '300120', '301023', '302099', '303456', '307037', '307921', '311467', '313092', '319222', '328665', '338557', '339180', '339245', '342912', '343522', '391586', '684723', '685376', '695209', '702319', '704336', '704404', '704408', '704416', '704418', '704923', '707971', '748304', '748551', '749605', '752789', '785581', '1100784', '1107698', '1113299', '1117067', '1117131', '1125844', '1126558', '1142288', '1152552', '1161523', '1163527', '1166593', '1190380', '1201005', '1206721', '1233658', '1254294', '1264096', '1271587', '1279186', '1302734', '1309113', '1313619', '1333334', '1373299', '1416575', '1432074', '1433577', '1464189', '1476525', '1487862', '1490721', '1496767', '1524714', '1532965', '1533818', '1561199', '1563118', '1573042', '1575069', '1599650', '1601769', '1617317', '1626369', '1682447', '1702274', '1703120', '1722441', '1746928', '25470', '76259', '122487', '148915', '156694', '161363', '161864', '168359', '196027', '197889', '204828', '207649', '270844', '1766766', '529782', '707973', '757011', '757355', '757725', '759809', '759810', '760115', '760540', '761021', '762548', '770756', '772127', '774397', '775711', '777976', '778056', '779209', '780035', '781893', '781896', '787382', '792484', '797043', '797044', '1771100', '1771240', '1101773', '1104351', '1106996', '1107558', '1107581', '1107686', '1107772', '1107928', '1110738', '1113139', '1113606', '1115322', '1115537', '1118103', '1119909', '1120134', '1121346', '1125558', '1127117', '1127250', '1127810', '1133171', '1135040', '1135576', '1136884', '1138859', '1140889', '1142435', '1143393', '1145107', '1147130', '1148518', '1148927', '1150725', '1152907', '1153156', '1153202', '1153965', '1154944', '1157671', '1159128', '1159171', '1160697', '1161261', '1166075', '1167655', '1171924', '1172814', '1172923', '1174212', '1175493', '1175499', '1177490', '1178810', '1180247', '1186325', '1188667', '1188997', '1196242', '1200735', '1200744', '1203195', '1203923', '1212783', '1213978', '1215802', '1221517', '1221523', '1221588', '1225507', '1227826', '1231099', '1231160', '1231835', '1762008', '1250196', '1250345', '1255111', '1258513', '1259652', '1262729', '1265185', '1271063', '1273740', '1280318', '1281732', '1284342', '1289905', '1291185', '1291242', '1294369', '1299559', '1302336', '1302667', '1304253', '1305598', '1306094', '1309806', '1314332', '1315516', '1316159', '1318860', '1320933', '1323618', '1325021', '1331749', '1333339', '1338852', '1341418', '1348368', '1348381', '1348392', '1349220', '1349224', '1349417', '1350980', '1352553', '1352701', '1356766', '1358087', '1360331', '1361582', '1362148', '1381979', '1389385', '1401068', '1403316', '1409994', '1413255', '1423015', '1423016', '1428568', '1429668', '1431177', '1432393', '1442177', '1445241', '1445750', '1446692', '1447928', '1450761', '1452611', '1455724', '1462222', '1464106', '1465728', '1467242', '1467270', '1475204', '1496212', '1498570', '1502404', '1503732', '1503865', '1509716', '1515016', '1517695', '1517736', '1518782', '1521862', '1523840', '1525809', '1527349', '1530349', '1530668', '1531748', '1534227', '1535665', '1542890', '1542954', '1543048', '1543307', '1545021', '1545557', '1552939', '1562892', '1565645', '1567673', '1569140', '1569162', '1572269', '1572745', '1574548', '1786407', '1787099', '1594937', '1597385', '1598771', '1599439', '1601880', '1603144', '1604505', '1615077', '1616176', '1618997', '1620893', '1623206', '1623214', '1628669', '1629370', '1631853', '1632756', '1637146', '1643602', '1643606', '1645782', '1656685', '1657095', '1657808', '1662310', '1663247', '1665647', '1666552', '1668126', '1677428', '1678921', '1681791', '1685923', '1687873', '1689741', '1690111', '1694304', '1698356', '1700140', '1700514', '1700997', '1702291', '1706813', '1709423', '1715074', '1716415', '1716418', '1716583', '1716739', '1718959', '1719299', '1720459', '1721623', '1726758', '1730190', '1734257', '1734322', '1737952', '1738314', '1739731', '1741809', '1744570', '1754933', '1757102', '1764451', '1784809', '1800385', '1801739', '1804180', '1804328', '1804456', '1804794', '1805172', '1823337', '1831789', '1839221', '1846192', '1846313', '1097299', '1848301', '1850878', '1859955', '1860732', '1862488', '1863278', '1864871', '1865161', '1865163', '995155', '1891291', '1893980', '1896467', '1896578', '1897775', '1898549', '1898611', '1900511', '1912414', '1913175'].forEach(
    		function(item){
    			downloadTrip(item);
    		}
    		);
    	
    	if(tripid === null)return;

    	var div=document.createElement("div");
    	div.id=tripid.value;
    	div.appendChild(createDownloadLink());
    	tripid.parentElement.insertBefore(div,tripid);
    }else if(location.pathname.startsWith('/map/')){
    	//map view
        console.log('map view');
    	/*var listAddLink = function(){
    		var list = document.getElementsByClassName('resultList')[0].getElementsByClassName('tripItem');
    		$.each(list, function(i, val){
    			val.appendChild(createDownloadLink());
    		});
    	};*/
        var funcInject = function(){/*
            if(typeof unsafeWindow.Utils === 'object'){
                unsafeWindow.Utils.successCallbackProxy = function(fn) {
                    return function (result) {
                        var action = result.action;
                        if (!action) {
                            alert("Server Error:ActionNotDefined");
                            throw new Error('Server Error:ActionNotDefined');
                            return ;
                        }
                        var data = action.data;
                        var actionName = action.name;
                        if (actionName == 'redirect') {
                            window.location.href=data.url;
                            return ;
                        }
                        fn && $.isFunction(fn) && fn(actionName,data);
                        listAddLink();
                    };
                };
                listAddLink();
            }else{
                console.error("cannot find var Utils!");
                setTimeout(funcInject,200);
            }
            */
            var tpl = $('.resultList').attr('tpl');
            var idx = tpl.search('</ul>');
            tpl = tpl.substring(0,idx)+'<a href="javascript:void(downloadTrip([[id]]));">&nbsp;下载GPX&nbsp;</a>'+tpl.substring(idx);
            /*idx = tpl.search('class="btnShowTrip"');
            tpl = tpl.substring(0,idx)+'onclick="toggleShowTrip([[id]]);"'+tpl.substring(idx);*/
            $('.resultList').attr('tpl', tpl);
        };
        window.downloadTrip = unsafeWindow.downloadTrip = downloadTrip;
        var getSelectTrips = function(){
            var href = window.location.href || unsafeWindow.location.href;
            var selectTrip=[];
            var ts = href.indexOf('|t=');
            if(ts==-1)
                ts = href.indexOf('#t=');
            if(ts==-1)
                return selectTrip;
            ts+=3;
            var te = href.indexOf('|', ts);
            if(ts==te)
                return selectTrip;
            if(te==-1)
                te=href.length;
            var trips = href.substring(ts, te);
            trips = trips.split(',');
            for(var i=0;i<trips.length;++i){
                var tripId = trips[i].substring(0, trips[i].indexOf('*'));
                if(!!tripId)
                    selectTrip.push(tripId);
            }
            return selectTrip;
        };
        /*var selectTrip = [];
        var toggleShowTrip = function(id){
            if(selectTrip.includes(id)){
                selectTrip.pop(id);
            }else{
                selectTrip.push(id);
            }
        };
        window.toggleShowTrip = unsafeWindow.toggleShowTrip = toggleShowTrip;*/
        var downloadSelectedTrip = function(){
            var selectTrip = getSelectTrips();
            var size = selectTrip.length;
            if(size===0)
            {
                alert("未选择任何轨迹!");
                return void(0);
            }
            var href = window.location.href || unsafeWindow.location.href;
            var paths = [];
            var i = 0;
            var looper = function(){
                if(i == size){
                    var fl = new XMLNode("Folder");
                    fl.appendChild(new XMLNode("name").setText("Tracks"));
                    for(i=0;i<size;++i){
                        fl.appendChild(paths[i]);
                    }
                    exportString2File(wrapGPXm(href, selectTrip, '', [fl]), selectTrip+".GPX");
                }else{
                    var id=selectTrip[i];
                    ++i;
                    getTracksData(id, function(wpts){
                        paths.push(makePath(id, wpts));
                        setTimeout(looper, 0);
                    });
                }
            };
            looper();
        };
        window.downloadSelectedTrip = unsafeWindow.downloadSelectedTrip = downloadSelectedTrip;
        $('.sortTab').append($('<button style="color:red;margin-left:20px;" onclick="downloadSelectedTrip();">下载选择的轨迹</button>'));
        funcInject();
	}
    console.error("jjm2473,I am here!");//just for debug
})();
