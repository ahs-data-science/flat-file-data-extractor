var Table = require("./objects.js");


var XML = {};
module.exports = {
  XML: XML
};

(function make_xml(XML){

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function getType(val){
    if (isNumeric(val) == true){
      return 'n';
    }
    if (val.toUpperCase() == "TRUE" || val.toUpperCase() == "FALSE" || val.toUpperCase() == "T" || val.toUpperCase() == "F"){
      return 'b';
    }
    // date detection

    //
    if (val != ""){
      return 's';
    }
    return 'e';
  }

  // Converts XML to JSON
  // from: http://coursesweb.net/javascript/convert-xml-json-javascript_s2
  function XMLtoJSON() {
    var me = this;      // stores the object instantce

    // gets the content of an xml file and returns it in
    me.fromFile = function(xml, rstr) {
      // Cretes a instantce of XMLHttpRequest object
      var xhttp = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
      // sets and sends the request for calling "xml"
      xhttp.open("GET", xml ,false);
      xhttp.send(null);

      // gets the JSON string
      var json_str = jsontoStr(setJsonObj(xhttp.responseXML));

      // sets and returns the JSON object, if "rstr" undefined (not passed), else, returns JSON string
      return (typeof(rstr) == 'undefined') ? JSON.parse(json_str) : json_str;
    }

    // returns XML DOM from string with xml content
    me.fromStr = function(xml, rstr) {
      // for non IE browsers
      if(window.DOMParser) {
        var getxml = new DOMParser();
        var xmlDoc = getxml.parseFromString(xml,"text/xml");
      }
      else {
        // for Internet Explorer
        var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
      }

      // gets the JSON string
      var json_str = jsontoStr(setJsonObj(xmlDoc));

      // sets and returns the JSON object, if "rstr" undefined (not passed), else, returns JSON string
      return (typeof(rstr) == 'undefined') ? JSON.parse(json_str) : json_str;
    }

    // receives XML DOM object, returns converted JSON object
    var setJsonObj = function(xml) {
      var js_obj = {};
      if (xml.nodeType == 1) {
        if (xml.attributes.length > 0) {
          js_obj["@attributes"] = {};
          for (var j = 0; j < xml.attributes.length; j++) {
            var attribute = xml.attributes.item(j);
            js_obj["@attributes"][attribute.nodeName] = attribute.value;
          }
        }
      } else if (xml.nodeType == 3) {
        js_obj = xml.nodeValue;
      }
      if (xml.hasChildNodes()) {
        for (var i = 0; i < xml.childNodes.length; i++) {
          var item = xml.childNodes.item(i);
          var nodeName = item.nodeName;
          if (typeof(js_obj[nodeName]) == "undefined") {
            js_obj[nodeName] = setJsonObj(item);
          } else {
            if (typeof(js_obj[nodeName].push) == "undefined") {
              var old = js_obj[nodeName];
              js_obj[nodeName] = [];
              js_obj[nodeName].push(old);
            }
            js_obj[nodeName].push(setJsonObj(item));
          }
        }
      }
      return js_obj;
    }

    // converts JSON object to string (human readablle).
    // Removes '\t\r\n', rows with multiples '""', multiple empty rows, '  "",', and "  ",; replace empty [] with ""
    var jsontoStr = function(js_obj) {
      var rejsn = JSON.stringify(js_obj, undefined, 2).replace(/(\\t|\\r|\\n)/g, '').replace(/"",[\n\t\r\s]+""[,]*/g, '').replace(/(\n[\t\s\r]*\n)/g, '').replace(/[\s\t]{2,}""[,]{0,1}/g, '').replace(/"[\s\t]{1,}"[,]{0,1}/g, '').replace(/\[[\t\s]*\]/g, '""');
      return (rejsn.indexOf('"parsererror": {') == -1) ? rejsn : 'Invalid XML format';
    }
  };

  // creates object instantce of XMLtoJSON
  var xml2json = new XMLtoJSON();

  function findData(sheet){
    var data = [];
    for (var obj in sheet){
      if (sheet[obj].constructor === Array && sheet[obj].length > data.length){
        //console.log("find it in level1");
        data = sheet[obj];
      } else if (sheet[obj].constructor === Object ){
        temp = findData(sheet[obj]);
        if ( temp.length > data.length ){
          data = temp;
        }
      }
    }
    return data;
  }

  function parse(data) {
    var xml = xml2json.fromStr(data);
    var sheet = [];
    //console.log(xml);
    var root = findData(xml);
    return root;
    // for(var i = 0; i < root.length; i++){
    //   for(att in root[i]){
    //     console.log(root[i][att]["#text"]);
    //   }
    // }
  }

  function getColumnsType(rows, numCols) {
  	var typeOfCols = [];
  	var cellType, types = [], flag;
  	for (C = 0; C < numCols; C++) {
  		// s, n, d, b, e
  		types = [];
  		flag = 0;
  		for (R = 0; R < rows.length; R++){
  			cell = rows[R][C];
  			//temp = getMergeInfo(sheet, C, R);
			  //console.log("temp: " + temp + ", pre: " + previousVal);
				if (cell){
					cellType = cell.t;
				} else {
					continue;
				}
  			if (cellType == 's') {
  				typeOfCols.push('s');
  				flag = 1;
  				break;
  			} else {
  				if (types.length != 0 && types.indexOf(cellType) == -1){
  					typeOfCols.push('s');
  					flag = 1;
  					break;
  				} else {
  					types.push(cellType);
  				}
  			}
  		}
  		if (flag == 0){
  			typeOfCols.push(cellType);
  		} else {
  			flag = 0;
  		}
  	}
  	return typeOfCols;
  }
  
  function loadTable(sheet, table){
    if (sheet == null) {
      // error
      return 1;
    }
    // set cols & rows & cells
    var header = [];
    var col;
    
    var row = new Table.Row();
    table.rows.push(row);
    
    for (var i = 0; i < sheet.length; i++) {
      var row = new Table.Row();
      table.rows.push(row);
      var C = 0;
      for (var att in sheet[i]) {
        if (att == "#text") {
          continue;
        }
        if (header.indexOf(att) == -1) {
          col = new Table.Column();
          table.cols.push(col);
          header.push(att);
          cell = new Table.Cell(att, getType(att), row, col);
          table.rows[0].cells.push(cell);
          col.cells.push(cell);
        } else {
          col = table.cols[C];
        }
        var cell = {};
        if (sheet[i][att]["#text"]){
          cell.v = sheet[i][att]["#text"];
          cell.t = getType(cell.v);
        } else {
          cell.v = null;
          cell.t = undefined;
        }
        cell = new Table.Cell(cell.v, cell.t, row, col);
        row.cells.push(cell);
        col.cells.push(cell);
        C++;
      }
    }
    
    // set mergedCells
    table.meta.mergedCells = null;
    
    return 0; 
  }
  
  
  function sheet_to_row_object(){

    var tbl = this;

  	sheet = tbl.sheet;
  	if (sheet == null) {
  		return null;
  	}

    var header = [];
    var rows = [];
    for (var i = 0; i < sheet.length; i++){
      var row = [];
      for (var att in sheet[i]){
        if (att == "#text"){
          continue;
        }
        if (header.indexOf(att) == -1){
          header.push(att);
        }
        var cell = {};
        if (sheet[i][att]["#text"]){
          cell.v = sheet[i][att]["#text"];
          cell.t = getType(cell.v);
        } else {
          cell.v = null;
          cell.t = undefined;
        }
        row.push(cell);
      }
      rows.push(row)
    }

    //console.log(header);
    //console.log(rows);
    if (tbl.rows == null){
      tbl.rows = rows;
    }
    if (tbl.rows == null){
      tbl.header = header;
    }

  	var typeOfCols = [];
  	if (tbl.headerTypes == null){
  		typeOfCols = getColumnsType(rows, header.length);
      tbl.headerTypes = typeOfCols;
  	} else {
  		typeOfCols = tbl.headerTypes;
  	}

    // TODO: must be checked for side effects
    for (var R = 0; R < rows.length; R++){
      for (var C = 0; C < rows[R].length; C++) {
        var columnType = typeOfCols[C];
        var cell = rows[R][C];
        if (cell.t != columnType && /*check cast*/true ){
          cell.typeMissMatch = true;
        } else {
          cell.typeMissMatch = false;
        }
      }
    }

  	obj = {};
  	obj.headers = header;
  	obj.headerTypes = typeOfCols;
  	obj.rows = rows;
  	obj.tbl = tbl;
  	//console.log(obj);
  	return obj;
  }

  function setStartRow(startRow){
    this.startRow = startRow;
    this.header = null;
    this.headerDepth = null;
    this.headerTypes = null;
    this.rows = null;
  }

  function setStartCol(startCol){
    this.startCol = startCol;
    this.header = null;
    this.headerDepth = null;
    this.headerTypes = null;
    this.rows = null;
  }

  function setEndRow(endRow){
    this.endRow = endRow;
    this.header = null;
    this.headerDepth = null;
    this.headerTypes = null;
    this.rows = null;
  }

  function setEndCol(endCol){
    this.endCol = endCol;
    this.header = null;
    this.headerDepth = null;
    this.headerTypes = null;
    this.rows = null;
  }

  function setHeader(header){
    this.header = header;
  }

  function setHeaderDepth(headerDepth){
    this.headerDepth = headerDepth;
    this.headerTypes = null;
    this.headerheader = null;
    this.rows = null;
  }

  function setHeaderTypes(headerTypes){
    this.headerTypes = headerTypes;
    this.rows = null;
  }

  function setRows(rows){
    this.rows = rows;
  }


  function makeTbl(){
  	var tbl = {
  		sheet_to_row_object: sheet_to_row_object,
      setStartRow: setStartRow,
  		setStartCol: setStartCol,
  		setEndRow: setEndRow,
  		setEndCol: setEndCol,
  		setHeader: setHeader,
  		setHeaderDepth: setHeaderDepth,
  		setHeaderTypes: setHeaderTypes,
  		setRows: setRows,
  		sheet: null,
  		startRow: null,
  		startCol: null,
  		endRow: null,
  		endCol: null,
  		header: null,
  		headerDepth: null,
  		headerTypes: null,
  		rows: null
  	};
  	return tbl;
  }

  XML.tbl = makeTbl;
  XML.parse = parse;
  XML.sheet_to_row_object = sheet_to_row_object;
  XML.loadTable = loadTable;

})(XML);
