# flat-file-data-extractor
Extract data from flatfiles (xls, xlsx, ods, ots, xml, csv, json)


## Usage
Put this script on the top of your code:
```html
<script lang="javascript" src="bundle.js"></script>
```

You should call FlatFileApi.process_file(file, callbackFunc) to process a file. It will return a list of TableView object that can be shown.
sample code for using the api:
```js
var file; // input flat file
FlatFileApi.processFile(file, function(tables) {
	console.log(tables);
});
```

## Extracted data
You can access the rows, columnTypes
## Processing methods
You can call these methods on each TableView objects:
```js
var tbl = tables[0];
/*  
process a table for detecet headers and data types
it is not good enough yet!!
*/
tbl.process();

/*
reset all changes on the tv
*/
tbl.reset();

/*
undo last change
*/
tbl.undo();

/*
delete given row or column
*/
tbl.deleteRow(index);
tbl.deleteCol(index);

/*
set a row to header
remove a row from header
note : the row must be on the top of table
*/
tbl.setRowToHeader(index);
tbl.removeFromHeader(index);

/*

*/
tbl.changeColType(index, type);

/*

*/
tbl.changeHeaderValue(rowIndex, colIndex, value);

/*

*/
tbl.setTableName(name);

/*

*/
tbl.cloneMergeCells();

/*

*/
tbl.rotate();

/*

*/
tbl.export();
