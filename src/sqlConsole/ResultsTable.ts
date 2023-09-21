import { Widget } from '@lumino/widgets';

import { IDisposable } from '@lumino/disposable';

import { Table, TableDataModel } from './Table';

export class ResultsTable implements IDisposable {
  constructor(keys: Array<string>, data: Array<Array<any>>) {
    this._model = new TableDataModel(keys, data);
    this._table = new Table(this._model);
  }

  get widget(): Widget {
    return this._table.widget;
  }

  set theme(theme: string) {
    this._table.theme = theme;
  }

  setData(keys: Array<string>, data: Array<Array<any>>): void {
    this._model = new TableDataModel(keys, data);
    this._table.dataModel = this._model;
  }

  dispose(): void {
    this._table.dispose();
    this._isDisposed = true;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  private _isDisposed = false;
  private readonly _table: Table;
  private _model: TableDataModel;
}
