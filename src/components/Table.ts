import { IDisposable } from '@lumino/disposable';

import { Menu} from '@lumino/widgets';

import {
  DataModel,
  DataGrid,
  TextRenderer,
  CellRenderer,
  BasicKeyHandler,
  BasicMouseHandler,
} from '@lumino/datagrid';

import { ISignal, Signal } from '@lumino/signaling';

import * as DataGridExtensions from './dataGridExtensions';

export namespace Table {
  export interface IOptions {
    contextMenu: Menu;
  }
}

namespace Colors {
  export const unselectedBackgroundColor = 'white';
  export const selectedBackgroundColor = '#2196f3';
  export const unselectedTextColor = 'black';
  export const selectedTextColor = 'white';
}

export class Table implements IDisposable {
  constructor(model: TableDataModel, options: Table.IOptions) {
    this._grid = new DataGrid({
        defaultSizes: {
            rowHeight: 24,
            columnWidth: 144,
            rowHeaderWidth: 64,
            columnHeaderHeight: 36
        }
    });
    this._grid.dataModel = model;
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.mouseHandler = new BasicMouseHandler();
    this._options = options;
    this._selectionManager = new DataGridExtensions.SelectionManager(model);
    this._init()
  }
  
  _init=()=>{
    
    this._selectionManager.selectionChanged.connect(this._updateRenderers, this);

    this._clickEventHandler = DataGridExtensions.addMouseEventListener(
      'click',
      this._grid,
      this._onClick
    );

    this._contextMenuEventHandler = DataGridExtensions.addMouseEventListener(
      'contextmenu',
      this._grid,
      this._onContextMenu
    );

    this._dblclickEventHandler = DataGridExtensions.addMouseEventListener(
      'dblclick',
      this._grid,
      this._onDoubleClick
    );

    this._fitColumnWidths();
  }
    
  set dataModel(model:TableDataModel) {
      this._grid.dataModel = model;
      this._selectionManager.selectionChanged.disconnect(this._updateRenderers, this)
      this._selectionManager = new DataGridExtensions.SelectionManager(model);
      this._init();
  }

  get widget(): DataGrid {
    return this._grid;
  }

  get selection(): DataGridExtensions.BodyCellIndex | null {
    return this._selectionManager.selection;
  }

  get selectionValue(): any | null {
    const selection = this.selection;
    if (selection !== null) {
      return this.getCellValue(selection);
    }
    return null;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get dblclickSignal(): ISignal<this, DataGridExtensions.BodyCellIndex> {
    return this._dblclickSignal;
  }

  getCellValue(cellIndex: DataGridExtensions.BodyCellIndex): any {
    const { rowIndex, columnIndex } = cellIndex;
    const value = this._grid.dataModel!.data('body', rowIndex, columnIndex);
    return value;
  }

  dispose(): void {
    this._clickEventHandler.dispose();
    this._contextMenuEventHandler.dispose();
    this._dblclickEventHandler.dispose();
    if (this._grid.keyHandler!=null) this._grid.keyHandler.dispose();
    if (this._grid.mouseHandler!=null) this._grid.mouseHandler.dispose();
    this._grid.dispose();
    this._isDisposed = true;
  }

  private _fitColumnWidths() {
    DataGridExtensions.fitColumnWidths(this._grid, new TextRenderer());
  }

  private _onClick=(event: DataGridExtensions.GridMouseEvent)=>{
    const { row, column } = event;
    this._updateSelection(row, column);
  }

  private _onContextMenu=(event: DataGridExtensions.GridMouseEvent)=>{
    const { row, column, rawEvent } = event;
    this._updateSelection(row, column);
    if (this._isInBody(row, column)) {
      this._options.contextMenu.open(rawEvent.clientX, rawEvent.clientY);
      rawEvent.preventDefault();
    }
  }

  private _onDoubleClick=(event: DataGridExtensions.GridMouseEvent)=> {
    const { row, column } = event;
    if (this._isInBody(row, column)) {
      const cellIndex = {
        rowIndex: row.index!,
        columnIndex: column.index!
      };
      this._dblclickSignal.emit(cellIndex);
    }
  }

  private _updateSelection(
    row: DataGridExtensions.Row,
    column: DataGridExtensions.Column
  ) {
    if (this._isInBody(row, column)) {
      this._selectionManager.selection = {
        rowIndex: row.index!,
        columnIndex: column.index!
      };
    } else {
      this._selectionManager.selection = null;
    }
  }

  private _isInBody(
    row: DataGridExtensions.Row,
    column: DataGridExtensions.Column
  ) {
    return (
      row.section === 'row' &&
      column.section === 'column' &&
      row.index !== null &&
      column.index !== null
    );
  }

  private _updateRenderers = ():void => {
    const renderer = this._textRendererForSelection(
      this._selectionManager.selection
    );
    this._grid.cellRenderers.update({ body: renderer });
  }

  private _textRendererForSelection(
    selectedCell: DataGridExtensions.BodyCellIndex | null
  ): CellRenderer {
    let backgroundColor;
    let textColor;
    if (selectedCell === null) {
      backgroundColor = Colors.unselectedBackgroundColor;
      textColor = Colors.unselectedTextColor;
    } else {
      const selectedRow = selectedCell.rowIndex;
      const selectedColumn = selectedCell.columnIndex;
      backgroundColor = ({ row, column }: CellRenderer.CellConfig) => {
        if (row === selectedRow && column === selectedColumn) {
          return Colors.selectedBackgroundColor;
        } else {
          return Colors.unselectedBackgroundColor;
        }
      };
      textColor = ({ row, column }: CellRenderer.CellConfig) => {
        if (row === selectedRow && column === selectedColumn) {
          return Colors.selectedTextColor;
        } else {
          return Colors.unselectedTextColor;
        }
      };
    }
    return new TextRenderer({ backgroundColor, textColor });
  }

  private readonly _grid: DataGrid;
  private _selectionManager!: DataGridExtensions.SelectionManager;
  private _clickEventHandler!: IDisposable;
  private _contextMenuEventHandler!: IDisposable;
  private _dblclickEventHandler!: IDisposable;
  private readonly _options: Table.IOptions;
  private readonly _dblclickSignal: Signal<this, DataGridExtensions.BodyCellIndex> = new Signal(this);
  private _isDisposed = false;
}

export class TableDataModel extends DataModel {
  constructor(keys: Array<string>, data: Array<Array<any>>) {
    super();
    this._data = data;
    this._keys = keys;
  }

  readonly _data: Array<Array<any>>;
  readonly _keys: Array<string>;

  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._data.length : 1;
  }

  columnCount(region: DataModel.ColumnRegion): number {
    return region === 'body' ? this._keys.length : 1;
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    if (region === 'row-header') {
      return row;
    }
    if (region === 'column-header') {
      return this._keys[column];
    }
    if (region === 'corner-header') {
      return '';
    }
    return this._serializeData(this._data[row][column]);
  }

  _serializeData(data: any): any {
    const _type = typeof data;
    if (_type === 'object') {
      return JSON.stringify(data);
    }
    return data;
  }
}
