import { ReactWidget } from '@jupyterlab/apputils';
//import { StylesProvider } from '@material-ui/core/styles';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { style } from 'typestyle';

import { SqlPanel } from './components/sqlPanel';
import { SqlModel } from './model';
import { IJpServices } from './JpServices';

export const sqlWidgetStyle = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: '300px',
  color: 'var(--jp-ui-font-color1)',
  background: 'var(--jp-layout-color1)',
  fontSize: 'var(--jp-ui-font-size1)'
});

/**
 * A class that exposes the sql plugin Widget.
 */
export class SqlWidget extends ReactWidget {
  constructor(
    model: SqlModel,
    jp_services: IJpServices,
    options?: Widget.IOptions
  ) {
    super();
    this._model = model;
    this._jp_services = jp_services;
    this.node.id = 'SqlSession-root';
    this.addClass(sqlWidgetStyle);
  }

  /**
   * A message handler invoked on a `'before-show'` message.
   *
   * #### Notes
   * The default implementation of this handler is a no-op.
   */
  onBeforeShow(msg: Message): void {
    // Trigger refresh when the widget is displayed
    //this._model.refresh().catch(error => {
    //  console.error('Fail to refresh model when displaying GitWidget.', error);
    //});
    super.onBeforeShow(msg);
  }

  onAfterAttach(msg: Message): void {
    // Listen for resize messages
    this.node.addEventListener('resize', () => console.log('RESIZE'));
    console.log('onAfterAttach');
    super.onAfterAttach(msg);
  }

  /**
   * Render the content of this widget using the virtual DOM.
   *
   * This method will be called anytime the widget needs to be rendered, which
   * includes layout triggered rendering.
   */
  render(): JSX.Element {
    return <SqlPanel model={this._model} jp_services={this._jp_services} />;
  }

  private _model: SqlModel;
  private _jp_services: IJpServices;
}
