var Table = require("./objects.js");
var CSV = require("./csv.js").CSV;
var XML = require("./xml.js").XML;
var MYJSON = require("./json.js").MYJSON;
var XLSX = require("./xlsx.js");

var X = XLSX;

var wtf_mode = false;

function ab2str(data) {
  var o = "", l = 0, w = 10240;
  for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint16Array(data.slice(l*w,l*w+w)));
  o+=String.fromCharCode.apply(null, new Uint16Array(data.slice(l*w)));
  return o;
}

function s2ab(s) {
  var b = new ArrayBuffer(s.length*2), v = new Uint16Array(b);
  for (var i=0; i != s.length; ++i) v[i] = s.charCodeAt(i);
  return [v, b];
}

function xw_xfer(data, mimeType, fileType, cb) {
  var val = s2ab(data);
  var v;
  v = X.read(ab2str(val[1]), {type: 'binary'});
  var res = {t:"xlsx", d:JSON.stringify(v)};
  var r = s2ab(res.d)[1];
  xx = ab2str(r).replace(/\n/g,"\\n").replace(/\r/g,"\\r");
  to_object(JSON.parse(xx), mimeType, fileType, cb);
}

function to_object(workbook, mimeType, fileType, cb) {
  var tables = new Array();
  workbook.SheetNames.forEach(function(sheetName) {
    var roa = X.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

    var table = new Table.Table();
    table.meta = new Table.Metadata();
    table.meta.tableName = sheetName;
    table.meta.fileType = fileType;
    table.meta.mimeType = mimeType;
    X.loadTable(workbook.Sheets[sheetName], table);
    var tv = new Table.TableView(table);
    tv.initTableView();
    tables.push(tv);
  });
  cb(tables);
}

function getFileExtension(filename) {
  return filename.split('.').pop();
}

module.exports = {
  processFile: function (f, cb) {
    var flag = 0;

    var reader = new FileReader();
    var name = f.name;
    var ftype = f.type;
    var fExtension = getFileExtension(name);


    /* csv, xml, json */
    if (ftype.match(/text.*/) || fExtension == "csv" || fExtension == "xml" || fExtension == "json") {
      var tables = new Array;
      var table = new Table.Table();
      table.meta = new Table.Metadata();
      table.meta.tableName = name.split('.')[0];
      table.meta.fileType = fExtension;
      table.meta.mimeType = ftype;

      reader.onload = function(e){
        var data = e.target.result;
        if (ftype == "text/csv" || fExtension == "csv"){
          var sheet = CSV.parse(data);
          //console.log(sheet);
          CSV.loadTable(sheet, table);
        } else if (ftype == "text/xml" || fExtension == "xml"){
          var sheet = XML.parse(data);
          XML.loadTable(sheet, table);
        } else if (ftype == "text/json" || fExtension == "json") {
          var sheet = MYJSON.parse(data);
          MYJSON.loadTable(sheet, table);
        }
        var tv = new Table.TableView(table);
        tv.initTableView();
        tables.push(tv);
        cb(tables);
      };
      reader.readAsText(f, "UTF-8");
    } else { /* xlsx, xls, ods, ots */
      reader.onload = function(e) {
        var data = e.target.result;
        xw_xfer(data, ftype, fExtension, cb);
      };
      reader.readAsBinaryString(f);
    }

  }
};
