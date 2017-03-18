var Table = require("./objects.js");


var CSV = {};

module.exports = {
  CSV: CSV
};

(function make_csv(CSV){

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

  function parse(data, seperator){
    var sep;
    if (!seperator) {
      sep = ",";
    } else {
      sep = seperator;
    }
    //console.log(sep);
    var sheet = {};
    sheet.data = data.split(/\r?\n/);
    var maxLen = 0;
    for(var i = 0; i < sheet.data.length; i++){
      sheet.data[i] = sheet.data[i].split(sep);
      if (sheet.data[i].length > maxLen){
        maxLen = sheet.data[i].length;
      }
    }
    for(var i = 0; i < sheet.data.length; i++){
      for(var j = 0; j < sheet.data[i].length; j++){
        var cell = {};
        cell.t = getType(sheet.data[i][j]);
        cell.v = sheet.data[i][j];
        sheet.data[i][j] = cell;
      }
    }

    sheet.s = {r: 0, c: 0};
    sheet.e = {r: sheet.data.length - 1, c: maxLen - 1};

    return sheet;
    //console.log(sheet);
  }

  function getHeaderDepth(tbl, startRow){
  	//var startRow = range.s.r;
    /*var data = sheet.data;
    var mergedObj = sheet["!merges"];
  	var start, end, max = startRow;
  	for(var i=0; i < mergedObj.length; i++){
  		start = mergedObj[i].s;
  		end = mergedObj[i].e;
  		// zaribe etminan = 2
  		if ((start.r - startRow) < 3 && end.r > max){
  			max = end.r;
  		}
  	}
  	return max;*/
    return startRow;
  }

  function getHeaders(tbl, headerDepth){
    sheet = tbl.sheet;
  	// find headers
  	var columns = [];
  	//console.log("headerDepth: " + headerDepth);
  	var temp, previousVal, header, val;
  	for (C = tbl.startCol; C <= tbl.endCol; C++) {
  		header = "";
  		//previousVal = "";
  		for (R = tbl.startRow; R <= headerDepth; R++) {
  			val = sheet.data[R][C];
				if (val) {
					header += val.v + ">";
				} else {
					header += 'null' + ">";
				}
  		}
  		columns.push(header.slice(0,-1));
  	}
  	return columns;
  }

  function getColumnsType(tbl, headerDepth){
    sheet = tbl.sheet;
  	var typeOfCols = [];
  	var cellType, types = [], flag;
  	for (C = tbl.startCol; C <= tbl.endCol; C++) {
  		// s, n, d, b, e
  		types = [];
  		flag = 0;
  		for (R = headerDepth + 1; R <= tbl.endRow; R++){
  			val = sheet.data[R][C];
  			//temp = getMergeInfo(sheet, C, R);
			  //console.log("temp: " + temp + ", pre: " + previousVal);
				if (val){
					cellType = val.t;
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
    // set cols & rows
    range = sheet;

    for (R = range.s.r; R <= range.e.r; R++) {
      var row = new Table.Row();
      table.rows.push(row);
    }
    for (C = range.s.c; C <= range.e.c; C++) {
      var col = new Table.Column();
      table.cols.push(col);
    }

    // set cells & col.uniqueValues
    for (R = range.s.r; R <= range.e.r; R++) {
      row = table.rows[R];
      for (C = range.s.c; C <= range.e.c; C++) {
        col = table.cols[C];
        var cell;
        if(sheet.data[R][C]){
          cell = new Table.Cell(sheet.data[R][C].v, sheet.data[R][C].t, row, col);
        } else {
          cell = new Table.Cell(null, undefined, row, col);
        }
        row.cells.push(cell);
        col.cells.push(cell);
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
  	//range = decode_range(sheet["!ref"]);

    //console.log(tbl.startRow);
  	//console.log(tbl.startCol);
  	// fix range
  	var sRRange = sheet.numRows;
  	var sCRange = sheet.numCols;
  	var eRRange = 0;
  	var eCRange = 0;
  	//console.log('fix range');
  	var R,C;


  	// start of range
  	if (tbl.startRow == null ){
  		for (C = 0; C < sheet.numCols; C++){
  			for (R = 0; R < sheet.numRows; ++R) {
  				val = sheet.data[R][C];
  				//console.log('s r : ' , val);
  				if(val !== undefined && val.v != "" && val.t !="e" && R < sRRange){
  					//console.log(R);
  					sRRange = R;
  				}
  			}
  		}
  		tbl.startRow = sRRange;
  	}


  	//console.log('range.s.r' + range.s.r);
  	if (tbl.startCol == null){
  		for (R = tbl.startRow; R < sheet.numRows; R++){
  			for (C = 0; C < sheet.numCols; ++C) {
  				val = sheet.data[R][C];
  				//console.log('s c : ' , val);
  				if(val !== undefined && val.v != "" && val.t !="e" && C < sCRange){
  					//console.log(C);
  					sCRange = C;
  				}
  			}
  		}
  		tbl.startCol = sCRange;
  	}
  	//console.log('range.s.c' + range.s.c);
  	//

  	// end of range
  	if (tbl.endRow == null){
  		for (C = tbl.startCol; C < sheet.numCols; C++){
  			for (R = sheet.numRows - 1; R >= tbl.startRow; --R) {
  				val = sheet.data[R][C];
  				//console.log('e r : ' , val);
  				if(val !== undefined && val.v != "" && val.t !="e" && R > eRRange){
  					//console.log(R);
  					eRRange = R;
            break;
  				}
  			}
  		}
  		tbl.endRow = eRRange;
  	}
  	//console.log('range.e.r' + range.e.r);

  	if (tbl.endCol == null){
  		for (R = tbl.startRow; R <= tbl.endRow; R++){
  			for (C = sheet.numCols - 1; C >= tbl.startCol; --C) {
  				val = sheet.data[R][C];
  				//console.log('e c : ' , val);
  				if(val !== undefined && val.v != "" && val.t !="e" && C > eCRange){
  					//console.log(C);
  					eCRange = C;
            break;
  				}
  			}
  		}
  		tbl.endCol = eCRange;
  	}

  	//console.log('range.e.c' + range.e.c);
  	//
  	//console.log('end fix range');


  	var headerDepth = 0;
  	if (tbl.headerDepth == null){
  		headerDepth = getHeaderDepth(tbl, tbl.startRow);
      tbl.headerDepth = headerDepth;
  	} else {
  		headerDepth = tbl.headerDepth;
  	}


  	var typeOfCols = [];
  	if (tbl.headerTypes == null){
  		typeOfCols = getColumnsType(tbl, headerDepth);
      tbl.headerTypes = typeOfCols;
  	} else {
  		typeOfCols = tbl.headerTypes;
  	}

  	var header = [];
  	if (tbl.header == null){
  		headers = getHeaders(tbl, headerDepth);
      tbl.header = headers;
  	} else {
  		header = tbl.header;
  	}
  	//console.log(headers);


  	// s => string, n => number, d => date, b => boolean, e => undefined
  	//console.log(typeOfCols);
  	var rows = [];
  	if (tbl.rows == null){
  		for (var R = headerDepth + 1; R <= tbl.endRow; R++) {
  			var row = [];
  			for (C = tbl.startCol; C <= tbl.endCol; ++C) {
          var columnType = typeOfCols[C];
  				var cell = {};
  				val = sheet.data[R][C];
  				//temp = getMergeInfo(sheet, C, R);
  				//console.log("c: " + C + ", r: " + R);
  				//if (temp == null){
					if (val) {
            cell.v = val.v;
            cell.t = getType(cell.v);
					} else {
            cell.v = null;
            cell.t = undefined;
					}
  				//} else {
  					//row.push(temp.v);
  				//}
          if (cell.t != columnType && /*check cast*/true ){
  					cell.typeMissMatch = true;
  				} else {
  					cell.typeMissMatch = false;
  				}
          row.push(cell);
  			}
  			rows.push(row);
  		}
  	} else {
  		rows = tbl.rows;
  	}
  	//console.log(rows);
  	obj = {};
  	obj.headers = headers;
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

  CSV.tbl = makeTbl;
  CSV.parse = parse;
  CSV.loadTable = loadTable;
  CSV.sheet_to_row_object = sheet_to_row_object;

})(CSV);
