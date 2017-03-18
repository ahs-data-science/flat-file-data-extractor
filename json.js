var Table = require("./objects.js");

var MYJSON = {};

module.exports = {
  MYJSON: MYJSON
};

(function make_json(MYJSON){

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function isDate(str, order){
    if(order== undefined) order= Date.ddmm? 0: 1;
    var day, month, D= Date.parse(str);
    if(D){
        str= str.split(/\W+/);

        // check for a month name first:
        if(/\D/.test(str[0])) day= str[1];
        else if (/\D/.test(str[1])) day= str[0];
        else{
            day= str[order];
            month= order? 0: 1;
            month= parseInt(str[month], 10) || 13;
        }
        try{
            D = new Date(D);
            if(D.getDate()== parseInt(day, 10)){
                if(!month || D.getMonth()== month-1) return true;
            }
        }
        catch(er){}
    }
    return false;
    // sol 2
    // var d = new Date(str);
    // return d.toString() === 'Invalid Date'? false: true;
  }

  function getType(val){
    if (isNumeric(val) == true){
      return 'n';
    }
    if (val.toUpperCase() == "TRUE" || val.toUpperCase() == "FALSE" || val.toUpperCase() == "T" || val.toUpperCase() == "F")     {
      return 'b';
    }
    // date detection
    if (isDate(val)) {
      return 'd';
    }
    //
    if (val != ""){
      return 's';
    }
    return 'e';
  }
  
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
    //console.log(xml);
    var root = findData(JSON.parse(data));
    //console.log(root);
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

  function loadTable(sheet, table) {
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
        if (sheet[i][att]){
          cell.v = sheet[i][att];
          //console.log("value" , cell.v);
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
        if (header.indexOf(att) == -1){
          header.push(att);
        }
        var cell = {};
        if (sheet[i][att]){
          cell.v = sheet[i][att];
          //console.log("value" , cell.v);
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
    if (tbl.header == null){
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

  MYJSON.tbl = makeTbl;
  MYJSON.parse = parse;
  MYJSON.sheet_to_row_object = sheet_to_row_object;
  MYJSON.loadTable = loadTable;

})(MYJSON);
