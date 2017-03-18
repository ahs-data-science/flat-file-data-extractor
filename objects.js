// TODO : merged header name cannot be set & show yet
//
// module Table
var cntRowId = 0;
var cntColId = 0;

module.exports = {
  Cell: Cell,

  Row: Row,

  Column: Column,

  Metadata: Metadata,

  Table: Table,

  TableView: TableView
};


// ----------- Objects ----------- \\
function Cell (value, type, parentRow, parentCol) {
  this.v = value;
  this.t = type;
  // this.pr = parentRow;
  // this.pc = parentCol;
}

function Row () {
  this.id = cntRowId++;
  this.isHeader = null;
  this.cells = new Array();
  this.isDeleted = false;
}

function Column() {
  this.id = cntColId++;
  this.headerName = null;
  this.calcExp = null;
  this.type = null;
  // for calculated fields
  this.uniqueValues = new Array();
  this.cells = new Array();
  this.group = new Array();
  this.isDeleted = false;
}

function Metadata() {
  this.tableName = null;
  this.fileType = null;
  this.mimeType = null;
  this.description = null;
  //this.headerDepth = null;
  this.mergedCells = null;
}

function Table() {
  this.meta = null;
  this.rows = new Array();
  this.cols = new Array();
  //this.tableView = new TableView(this);
}

function Log(){
  this.funcName = null;
  this.retCode = null;
  this.input = null;
}

function TableViewMetaData() {
  this.tableName = null;
  this.description = null;
  this.changeLog = null;
  this.rowIds = null;
  this.colIds = null;
}

function TableView(table) {
  this.table = table;
  //this.meta = JSON.parse(JSON.stringify(table.meta));
  this.rows = null;
  this.headerDepth = 0;
  this.columnTypes = null;
  this.meta = new TableViewMetaData();
  this.columnNames = null;
  // methods
  this.process = process;
  this.initTableView = initTableView;
  this.reset = reset;
  this.deleteRow = safeDeleteRow;
  this.deleteCol = safeDeleteCol;
  this.setRowToHeader = setRowToHeader;
  this.removeRowFromHeader = removeRowFromHeader;
  this.changeColType = changeColType;
  this.changeHeaderValue = changeHeaderValue;
  this.setTableName = setTableName;
  this.simpleUndo = simpleUndo;
  this.export = jsonExport;
  this.cloneMergeCells = cloneMergeCells;
  this.rotate = rotate;
}
// ------------------------------- \\

function cleanCol(table, col) {
  // s, n, d, b, e
  var data = [];
  var type = col.type;
  var val;

  for (R = 0; R < col.cells.length; R++) {
    if (table.rows[R].isDeleted == true) {
      continue;
    }
    val = col.cells[R];
    //if (col.cells[R].pr.isHeader == true) {
    if (table.rows[R].isHeader == true) {
      data.push(val.v);
      continue;
    }

    if (val.t == type) {
      data.push(val.v);
      continue;
    }
    if (type == 's'){
      data.push(String(val.v));
    } else if (type == 'n'){
      data.push(Number(val.v));
    } else if (type == 'd') {
      var d = new Date(val.v);
      if ( d == "Invalid Date") {
        data.push(null);
      } else {
        data.push(d);
      }
    } else {
      data.push(null);
    }
  }
  return data;
}

// check is a row or a column is empty
function isEmptyTableList(lst) {
  var i, flag = 0;
  for(i = 0; i < lst.length; i++){
    if (lst[i].t != undefined || lst[i].v != null) {
      return false;
    }
  }
  return true;
}

// deprecated
function deleteRow_old(table, row){
  table.rows = table.rows.filter(function(elem) {
    return elem != row;
  });
}
// deprecated
function deleteCol_old(table, col){
  table.cols = table.cols.filter(function(elem) {
    return elem != col;
  });
}

function deleteRow(tv, rowId) {
  var index = tv.meta.rowIds.indexOf(rowId);
  if (index == -1) {
    return -1;
  }
  tv.meta.rowIds.splice(index, 1);
  tv.rows.splice(index, 1);
  for (var i = 0; i < tv.table.rows.length; i++){
    if (tv.table.rows[i].id == rowId){
      tv.table.rows[i].isDeleted = true;
    }
  }
}

function deleteCol(tv, colId) {
  var index = tv.meta.colIds.indexOf(colId);
  if (index == -1) {
    return -1;
  }

  tv.meta.colIds.splice(index, 1);
  for (var i = 0; i < tv.rows.length; i++) {
    tv.rows[i].splice(index, 1);
  }

  for (var i = 0; i < tv.table.cols.length; i++){
    if (tv.table.cols[i].id == colId){
      tv.table.cols[i].isDeleted = true;
    }
  }
}

function getHeaderDepth(table) {
	var mergedObj = table.meta.mergedCells;
	if (!mergedObj) {
		return 0;
	}
	var start, end, max = 0;
	for(var i = 0; i < mergedObj.length; i++){
		start = mergedObj[i].s;
		end = mergedObj[i].e;
		// zaribe etminan = 2
		if ((start.r - 0) < 3 && end.r > max){
			max = end.r;
		}
	}
	return max;
}

function findColType(table, col) {
  // s, n, d, b, e
  var types = [];
  var flag = 0;
  var val;

  for (R = 0; R < table.rows.length; R++) {
    if (table.rows[R].isHeader == true || table.rows[R].isDeleted == true) {
      continue;
    }
    val = col.cells[R];
    var cellType = 's';
    if (val.t != undefined && val.v != null) {
      cellType = val.t;
    } else {
      continue;
    }

    if (cellType == 's') {
      flag = 1;
      break;
    } else {
      if (types.length != 0 && types.indexOf(cellType) == -1) {
        flag = 1;
        break;
      } else {
        types.push(cellType);
      }

    }
  }
  if (flag == 0){
    //typeOfCols.push(cellType);
    col.type = cellType;
  } else {
    col.type = 's';
  }
}

// ------------ METHODS -------------\\
// TODO : logs of methods are useless
// maybe metadata must be added to logs
// because of inputs is not enough for undoing changes
// TODO : undo must be added
function safeDeleteRow(index) {
  var tv = this;
  var log = new Log();
  log.funcName = "safeDeleteRow";
  log.input = [index];

  if (index >= tv.meta.rowIds.length || index < 0) {
    // error : out of band
    log.retCode = 1;
  } else {

    var rowId = tv.meta.rowIds[index];
    // delete header , not available for now
    //if (index <= tv.headerDepth) {
      //log.retCode = 2;
    //} else {
      deleteRow(tv, rowId);
      log.retCode = 0;
    //}
  }
  tv.meta.changeLog.push(log);
  return log.retCode;
}

function safeDeleteCol(index) {
  var tv = this;
  var log = new Log();
  log.funcName = "safeDeleteCol";
  log.input = [index];

  if (index >= tv.meta.colIds.length || index < 0) {
    // error : out of band
    log.retCode = 1;
  } else {

    var colId = tv.meta.colIds[index];
    deleteCol(tv, colId);
    // remove column type from type list
    tv.columnTypes.splice(index, 1);
    // remove column name from name list
    tv.columnNames.splice(index, 1);
    log.retCode = 0;
  }
  tv.meta.changeLog.push(log);
  return log.retCode;
}

function setRowToHeader(index) {
  var tv = this;
  var log = new Log();
  log.funcName = "setRowToHeader";
  log.input = [index];

  if (index >= tv.meta.rowIds.length || index < 0) {
    // error : out of band
    log.retCode = 1;
  } else if (index - tv.headerDepth > 1) {
    // error: header must be in top of table
    log.retCode = 2;
  } else {
    var rowId = tv.meta.rowIds[index];
    for (var i = 0; i < tv.table.rows.length; i++) {
      if (tv.table.rows[i].id == rowId) {
        tv.table.rows[i].isHeader = true;
        break;
      }
    }
    tv.headerDepth = Number(index);
    log.retCode = 0;

    // // update columnNames
    // for (var i = 0; i < tv.columnNames.length; i++) {
    //   tv.columnNames[i] += tv.rows[index][i] + " ";
    // }
    //

    // is it necessary ???
    // find types

    /*tv.columnTypes = new Array();
    for (var i = 0; i < tv.table.cols.length; i++) {
      //console.log(i);
      if (tbl.cols[i].isDeleted) {
        continue;
      }
      findColType(tbl, tbl.cols[i]);
      // set column types of tableview
      tv.columnTypes.push(tbl.cols[i].type);
    }*/
  }
  tv.meta.changeLog.push(log);

}

function removeRowFromHeader(index) {
  var tv = this;
  var log = new Log();
  log.funcName = "removeRowFromHeader";
  log.input = [index];

  if (index >= tv.meta.rowIds.length || index < 0) {
    // error : out of band
    log.retCode = 1;
  } else if (index != tv.headerDepth) {
    // error: must be removed from end of header
    log.retCode = 2;
  } else {
    var rowId = tv.meta.rowIds[index];
    for (var i = 0; i < tv.table.rows.length; i++) {
      if (tv.table.rows[i].id == rowId) {
        tv.table.rows[i].isHeader = false;
        break;
      }
    }
    tv.headerDepth = Number(index) - 1;
    log.retCode = 0;

    // // update columnNames
    // for (var i = 0; i < tv.columnNames.length; i++) {
    //   tv.columnNames[i] = tv.columnNames[i].replace(tv.rows[index][i], "");
    // }
    //

    // is it necessary ???
    // find types

    /*tv.columnTypes = new Array();
    for (var i = 0; i < tv.table.cols.length; i++) {
      //console.log(i);
      if (tbl.cols[i].isDeleted) {
        continue;
      }
      findColType(tbl, tbl.cols[i]);
      // set column types of tableview
      tv.columnTypes.push(tbl.cols[i].type);
    }*/
  }
  tv.meta.changeLog.push(log);
}

function changeColType(index, type) {
  var tv = this;
  var log = new Log();
  log.funcName = "changeColType";
  log.input = [index, type];

  if (index >= tv.meta.colIds.length || index < 0) {
    // error : out of band
    log.retCode = 1;
  } else {
    var colId = tv.meta.colIds[index];

    for (var i = 0; i < tv.table.cols.length; i++) {
      if (tv.table.cols[i].id == colId) {
        tv.table.cols[i].type = type;
        // clean data
        var cleanData = cleanCol(tv.table, tv.table.cols[i]);
        //console.log(cleanData);
        for (var j = 0; j < cleanData.length; j++) {
          tv.rows[j][index] = cleanData[j];
        }
        break;
      }
    }
    tv.columnTypes[index] = type;
    log.retCode = 0;
  }
  tv.meta.changeLog.push(log);

}

function changeHeaderValue(rowIndex, colIndex, value) {
  var tv = this;
  var log = new Log();
  log.funcName = "changeHeaderValue";
  log.input = [rowIndex, colIndex, value];

  if (colIndex >= tv.meta.colIds.length || colIndex < 0 || rowIndex >= tv.meta.rowIds.length || rowIndex < 0) {
    // error : out of band
    log.retCode = 1;
  } else if (rowIndex > tv.headerDepth) {
    // row is not header
    log.retCode = 2;
  } else {
    // // update column name
    // tv.columnNames[colIndex] = tv.columnNames[colIndex].replace(tv.rows[rowIndex][colIndex], value);
    // //
    tv.rows[rowIndex][colIndex] = value;
    log.retCode = 0;
  }
  tv.meta.changeLog.push(log);
}

function setTableName(value) {
  var tv = this;
  var log = new Log();
  log.funcName = "setTableName";
  log.input = [value];
  tv.meta.tableName = value;
  log.retCode = 0;
  tv.meta.changeLog.push(log);
}

function setTableDescription() {
  var tv = this;
  var log = new Log();
  log.funcName = "setTableDescription";
  log.input = [value];
  tv.meta.description = value;
  log.retCode = 0;
  tv.meta.changeLog.push(log);
}

function cloneMergeCells() {
  var tv = this;
  var tbl = this.table;
  var log = new Log();
  log.funcName = "cloneMergeCells";
  if (tbl.meta.mergedCells != null ) {
    for (var i = 0; i < tbl.meta.mergedCells.length; i++) {
      start = tbl.meta.mergedCells[i].s;
      end = tbl.meta.mergedCells[i].e;
      //console.log(start);
      for (var R = start.r; R <= end.r; R++) {
        if (tbl.rows[R].isDeleted) {
          continue;
        }
        for (var C = start.c; C <= end.c; C++) {
          if (tbl.cols[C].isDeleted) {
            continue;
          }
          tbl.rows[R].cells[C].t = tbl.rows[start.r].cells[start.c].t;
          tbl.rows[R].cells[C].v = tbl.rows[start.r].cells[start.c].v;
          // set tableview datas
          var tvRowIndex = tv.meta.rowIds.indexOf(tbl.rows[R].id);
          var tvColIndex = tv.meta.colIds.indexOf(tbl.cols[C].id);

          tv.rows[tvRowIndex][tvColIndex] = tbl.rows[R].cells[C].v;
        }
      }
    }
    log.retCode = 0;
  } else {
    log.retCode = 1;
    console.log("has no mergedcell");
  }
  tv.meta.changeLog.push(log);
}

// TODO : check side effects
function rotate() {
  var tv = this;
  var table = this;
  var log = new Log();
  log.funcName = "rotate";
  var rows = new Array();
  for (var i = 0; i < tv.rows[0].length; i++) {
    var row = new Array();
    for (var j = 0; j < tv.rows.length; j++) {
      row.push(tv.rows[j][i]);
    }
    rows.push(row);
  }
  tv.rows = rows;
  log.retCode = 0;
  tv.meta.changeLog.push(log);
}

function createGroup() {}

// --------------------------------- \\
// ---------- proccessors ---------- \\
function initTableView() {

  var tbl = this.table;
  var tv = this;

  // init tableview meta data
  tv.meta.rowIds = new Array();
  tv.meta.colIds = new Array();
  tv.meta.tableName = tbl.meta.tableName;
  tv.meta.description = null;
  tv.meta.changeLog = new Array();

  tv.rows = new Array();
  tv.columnTypes = new Array();
  tv.columnNames = new Array();
  tv.headerDepth = 0;

  // intt table values
  tbl.rows[0].isHeader = true;
  //

	var R,C;

	// ---------- init cells ---------- \\
  for (var R = 0; R < tbl.rows.length; R++) {
    var row = new Array();
    for (var C = 0; C < tbl.cols.length; C++) {
      var val = tbl.rows[R].cells[C].v;
      row.push(val);
      if (tv.meta.colIds.indexOf(tbl.cols[C].id) == -1) {
        tv.meta.colIds.push(tbl.cols[C].id);
      }
    }
    tv.rows.push(row);
    tv.meta.rowIds.push(tbl.rows[R].id);
  }
  // --------------------------------- \\


  // -------- set column names ------- \\
  for (var i = 0; i < tbl.cols.length; i++) {
    tv.columnNames.push(null);
  }
  // --------------------------------- \\

  // -------- find column type ------- \\
  for (var i = 0; i < tbl.cols.length; i++) {
    findColType(tbl, tbl.cols[i]);
  }
  for (var i = 0; i < tbl.cols.length; i++) {
    tv.columnTypes.push(tbl.cols[i].type);
  }
  // --------------------------------- \\

  // ----------- clean data ---------- \\
  for (var i = 0; i < tbl.cols.length; i++) {
    var cleanData = cleanCol(tbl, tbl.cols[i]);
    for (var j = 0; j < cleanData.length; j++) {
      tv.rows[j][i] = cleanData[j];
    }
  }
  // --------------------------------- \\

}

function process() {
	var tbl = this.table;
  var tv = this;

  var log = new Log();
  log.funcName = "process";
  log.input = [];
	var R,C;

  // ---------- fix range ---------- \\
  for (C = 0; C < tbl.cols.length; C++) {
    if (isEmptyTableList(tbl.cols[C].cells)) {
      //console.log(C);
      //deleteCol(tv, tbl.cols[C].id);
      tv.deleteCol(tv.meta.colIds.indexOf(tbl.cols[C].id));
    }
  }
  for (R = 0; R < tbl.rows.length; R++) {
    if (isEmptyTableList(tbl.rows[R].cells)) {
      //deleteRow(tv, tbl.rows[R].id);
      tv.deleteRow(tv.meta.rowIds.indexOf(tbl.rows[R].id));
    }
  }
  // --------------------------------- \\
  // -------- find header depth -------\\
  var i, headerDepth = getHeaderDepth(tbl);
  for ( i = 0; i <= headerDepth; i++) {
    tbl.rows[i].isHeader = true;
  }
  // set tableview headerDepth
  tv.headerDepth = headerDepth;
  // --------------------------------- \\
  // ---- clone mergedcells value ---- \\
  if (tbl.meta.mergedCells != null ) {
    for (var i = 0; i < tbl.meta.mergedCells.length; i++) {
      start = tbl.meta.mergedCells[i].s;
      end = tbl.meta.mergedCells[i].e;
      //console.log(start);
      for (var R = start.r; R <= end.r; R++) {
        if (tbl.rows[R].isDeleted) {
          continue;
        }
        for (var C = start.c; C <= end.c; C++) {
          if (tbl.cols[C].isDeleted) {
            continue;
          }
          tbl.rows[R].cells[C].t = tbl.rows[start.r].cells[start.c].t;
          tbl.rows[R].cells[C].v = tbl.rows[start.r].cells[start.c].v;
          // set tableview datas
          var tvRowIndex = tv.meta.rowIds.indexOf(tbl.rows[R].id);
          var tvColIndex = tv.meta.colIds.indexOf(tbl.cols[C].id);

          tv.rows[tvRowIndex][tvColIndex] = tbl.rows[R].cells[C].v;
        }
      }
    }
  } else {
    console.log("has no mergedcell");
  }
  // --------------------------------- \\

  // -------- set column names ------- \\
  // tv.columnNames = new Array();
  // for (var i = 0; i < tbl.cols.length; i++) {
  //   if (tbl.cols[i].isDeleted) {
  //     continue;
  //   }
  //   tv.columnNames.push(tbl.cols[i].cells[0].v);
  //   for (var j = 1; j <= tv.headerDepth; j++) {
  //     tv.columnNames[tv.columnNames.length-1] += " " + tbl.cols[i].cells[j].v;
  //   }
  // }
  // --------------------------------- \\

  // -------- find column type ------- \\
  tv.columnTypes = new Array();
  for (var i = 0; i < tbl.cols.length; i++) {
    //console.log(i);
    if (tbl.cols[i].isDeleted) {
      //console.log(i);
      continue;
    }
    findColType(tbl, tbl.cols[i]);
    // set column types of tableview
    tv.columnTypes.push(tbl.cols[i].type);
  }

  // --------------------------------- \\
  //console.log(tv.rows);
  // ----------- clean data ---------- \\
  var colIndex = 0;
  for (var i = 0; i < tbl.cols.length; i++) {
    if (tbl.cols[i].isDeleted) {
      continue;
    }
    var cleanData = cleanCol(tbl, tbl.cols[i]);
    //console.log(cleanData);
    for (var j = 0; j < cleanData.length; j++) {
      tv.rows[j][colIndex] = cleanData[j];
    }
    colIndex++;
  }
  // --------------------------------- \\

  log.retCode = 0;
  tv.meta.changeLog.push(log);
}

function reset() {
  var tbl = this.table;
  var tv = this;

	var R,C;

  // ---------- fix range ---------- \\
  for (C = 0; C < tbl.cols.length; C++) {
    if (tbl.cols[C].isDeleted) {
      tbl.cols[C].isDeleted = false;
    }
  }
  for (R = 0; R < tbl.rows.length; R++) {
    if (tbl.rows[R].isDeleted) {
      tbl.rows[R].isDeleted = false;
    }
  }
  // --------------------------------- \\
  // -------- find header depth -------\\
  for ( i = 1; i < tbl.rows.length; i++) {
    tbl.rows[i].isHeader = false;
  }
  // --------------------------------- \\
  // ---- clone mergedcells value ---- \\
  if (tbl.meta.mergedCells != null ) {
    for (var i = 0; i < tbl.meta.mergedCells.length; i++) {
      start = tbl.meta.mergedCells[i].s;
      end = tbl.meta.mergedCells[i].e;
      //console.log(start);
      for (var R = start.r; R <= end.r; R++) {
        for (var C = start.c; C <= end.c; C++) {
          if ( R == start.r && C == start.c) {
            continue;
          }
          tbl.rows[R].cells[C].t = undefined;
          tbl.rows[R].cells[C].v = null;
        }
      }
    }
  } else {
    console.log("has no mergedcell");
  }
  // --------------------------------- \\
  // -------- find column name ------- \\
  // for (var i = 0; i < tbl.cols.length; i++) {
  //   // doesn't matter !! right?
  // }
  // --------------------------------- \\
  // -------- find column type ------- \\
  for (var i = 0; i < tbl.cols.length; i++) {
    findColType(tbl, tbl.cols[i]);
  }
  // --------------------------------- \\
  // ----------- clean data ---------- \\
  // for (var i = 0; i < tbl.cols.length; i++) {
  //   if (tbl.cols[i].isDeleted) {
  //     continue;
  //   }
  //   var cleanData = cleanCol(tbl, tbl.cols[i]);
  //   //console.log(cleanData);
  //   for (var j = 0; j < cleanData.length; j++) {
  //     if (tbl.rows[j].isDeleted) {
  //       continue;
  //     }
  //     //console.log(tv.rows[j]);
  //     var tvRowIndex = tv.meta.rowIds.indexOf(tbl.rows[j].id);
  //     var tvColIndex = tv.meta.colIds.indexOf(tbl.cols[i].id);
  //
  //     tv.rows[tvRowIndex][tvColIndex] = cleanData[j];
  //   }
  // }
  // --------------------------------- \\
  this.initTableView();
}

function jsonExport() {
  var tv = this;
  var table = this.table;
  var jsonObj = {};
  // set tableName
  jsonObj.name = tv.meta.tableName;
  jsonObj.columns = new Array();
  // set columns
  for (var i = 0; i < tv.columnTypes.length; i++) {
    var column = {};
    switch (tv.columnTypes[i]) {
      case 's':
        column.type = "string";
        break;
      case 'n':
        column.type = "numeric";
        break;
      case 'd':
        column.type = "date";
        break;
      case 'b':
        column.type = "boolean";
        break;
      default:
        column.type = "undefined";
    }

    var cName = "";
    for (var j = 0; j <= tv.headerDepth; j++) {
      cName += tv.rows[j][i] + " ";
    }
    /* - 1 for extra space at end */
    column.name = cName.substring(0, cName.length - 1);
    jsonObj.columns.push(column);

  }

  //jsonObj.rows = cloneArray(tv.rows);
  //jsonObj.rows.splice(0, tv.headerDepth + 1);

  var rows = new Array();
  for (var i = 0; i < tv.rows.length; i++) {
    if ( i <= tv.headerDepth) {
      continue;
    }
    var rowIndex = i - tv.headerDepth;
    var row = new Array();
    for (var j = 0; j < tv.rows[rowIndex].length; j++) {
      if (tv.columnTypes[j] == 'd') {
        var d = new Date(tv.rows[rowIndex][j]);
        if ( d == "Invalid Date") {
          d = new Date("1970-01-01 " + tv.rows[rowIndex][j]);
        }
        row.push(d.getTime() - d.getTimezoneOffset()*60*1000);
      } else {
        row.push(tv.rows[rowIndex][j]);
      }
    }
    rows.push(row);
  }
  jsonObj.rows = rows;

  return jsonObj;
}
// not good, bad performance
function simpleUndo() {
  var tv = this;
  var logs = JSON.parse(JSON.stringify(tv.meta.changeLog));

  tv.reset();
  for (var i = 0; i < (logs.length - 1); i++) {
    switch (logs[i].funcName) {
      case "process":
        tv.process();
        break;
      case "safeDeleteRow":
        if (logs[i].retCode == 0) {
          tv.deleteRow(logs[i].input[0]);
        }
        break;
      case "safeDeleteCol":
        if (logs[i].retCode == 0) {
          tv.deleteCol(logs[i].input[0]);
        }
        break;
        case "setRowToHeader":
          if (logs[i].retCode == 0) {
            tv.setRowToHeader(logs[i].input[0]);
          }
          break;
        case "removeRowFromHeader":
          if (logs[i].retCode == 0) {
            tv.removeRowFromHeader(logs[i].input[0]);
          }
          break;
        case "changeColType":
          if (logs[i].retCode == 0) {
            tv.changeColType(logs[i].input[0], logs[i].input[1]);
          }
          break;
        case "changeHeaderValue":
          if (logs[i].retCode == 0) {
            tv.changeHeaderValue(logs[i].input[0], logs[i].input[1], logs[i].input[2]);
          }
          break;
        case "setTableName":
          if (logs[i].retCode == 0) {
            tv.setTableName(logs[i].input[0]);
          }
          break;
        case "setTableDescription":
          if (logs[i].retCode == 0) {
            tv.setTableDescription(logs[i].input[0]);
          }
          break;
        case "cloneMergeCells":
          if (logs[i].retCode == 0) {
            tv.cloneMergeCells();
          }
          break;
          default:

    }
  }
}
// --------------------------------- \\

// deprecated
function process_old(tbl) {
	var tbl = this;

	var R,C;

	// ---------- fix range ---------- \\
  for (C = 0; C < tbl.cols.length; C++) {
    if (isEmptyTableList(tbl.cols[C].cells)) {
      deleteCol(tbl, tbl.cols[C]);
      //console.log(tbl.cols[C]);
    }
  }
  for (R = 0; R < tbl.rows.length; R++) {
    if (isEmptyTableList(tbl.rows[R].cells)) {
      deleteRow(tbl, tbl.rows[R]);
      //console.log(tbl.rows[R]);
    }
  }
  // --------------------------------- \\

  // -------- find header depth -------\\
  var i, headerDepth = getHeaderDepth(tbl);
  for ( i = 0; i <= headerDepth; i++) {
    tbl.rows[i].isHeader = true;
  }
  // --------------------------------- \\

  // ---- clone mergedcells value ---- \\
  if (tbl.meta.mergedCells != null ) {
    for(var i = 0; i < tbl.meta.mergedCells.length; i++){
      start = tbl.meta.mergedCells[i].s;
      end = tbl.meta.mergedCells[i].e;
      //console.log(start);
      for (var R = start.r; R <= end.r; R++) {
        for (var C = start.c; C <= end.c; C++) {
          tbl.rows[R].cells[C].t = tbl.rows[start.r].cells[start.c].t;
          tbl.rows[R].cells[C].v = tbl.rows[start.r].cells[start.c].v;
        }
      }
    }
  } else {
    console.log("has no mergedcell");
  }
  // --------------------------------- \\

  // -------- find column type ------- \\
  for (var i = 0; i < tbl.cols.length; i++) {
    findColType(tbl, tbl.cols[i]);
  }
  // --------------------------------- \\

}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function cloneArray(a) {
    var arr = [];
    for( var i = 0; i < a.length; i++ ) {
        if( a[i].clone ) {
            //recursion
            arr[i] = a[i].clone();
            break;
        }
        arr[i] = a[i];
    }
    return arr;
}
