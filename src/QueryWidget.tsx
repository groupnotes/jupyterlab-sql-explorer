import { 
    MainAreaWidget,
    Toolbar,
    ToolbarButton
} from '@jupyterlab/apputils';
import { BoxPanel } from '@lumino/widgets';
import { Widget } from '@lumino/widgets';
//import { Message } from '@lumino/messaging';
import {
  IEditorFactoryService,
  CodeEditor,
  CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@lumino/signaling';

import { IJpServices } from './JpServices';
import { sqlIcon as queryIcon } from './icons';

import { SingletonPanel } from './components/SingletonPanel'
import { ResultsTable } from './components/ResultsTable'

//import { SqlPanel } from './components/sqlPanel';
//import { SqlModel } from './model';

// export const sqlWidgetStyle = style({
//   display: 'flex',
//   flexDirection: 'column',
//   minWidth: '300px',
//   color: 'var(--jp-ui-font-color1)',
//   background: 'var(--jp-layout-color1)',
//   fontSize: 'var(--jp-ui-font-size1)'
// });

export interface IEditor {
  readonly widget: EditorWidget;

  readonly value: string;
  readonly execute: ISignal<this, string>;
  readonly valueChanged: ISignal<this, string>;
}

export class Editor implements IEditor {
  constructor(initialValue: string, editorFactory: IEditorFactoryService) {
    this._model = new CodeEditor.Model({ value: initialValue });
    this._widget = new EditorWidget(this._model, editorFactory);
    this._model.value.changed.connect(() => {
      this._valueChanged.emit(this.value);
    });
    this._model.mimeType = 'text/x-sql';
    this._widget.executeCurrent.connect(() => {
      this._execute.emit(this.value);
    });
  }

  get value(): string {
    return this._model.value.text;
  }

  get widget(): EditorWidget {
    return this._widget;
  }

  get execute(): ISignal<this, string> {
    return this._execute;
  }

  get valueChanged(): ISignal<this, string> {
    return this._valueChanged;
  }

  private _execute = new Signal<this, string>(this);
  private _valueChanged = new Signal<this, string>(this);
  private _widget: EditorWidget;
  private _model: CodeEditor.IModel;
}

export class EditorWidget extends CodeEditorWrapper {
  constructor(model: CodeEditor.IModel, editorFactory: IEditorFactoryService) {
    super({
      model,
      factory: editorFactory.newInlineEditor
    });
    this.editor.addKeydownHandler((_, evt) => this._onKeydown(evt));
    this.addClass('jp-sql-explorer-ed');
  }

  get executeCurrent(): ISignal<this, void> {
    return this._executeCurrent;
  }

  _onKeydown(event: KeyboardEvent): boolean {
    if ((event.shiftKey || event.ctrlKey) && event.key === 'Enter') {
      this.run();
      return true;
    }
    return false;
  }

  run(): void {
    this._executeCurrent.emit(void 0);
  }

  private _executeCurrent = new Signal<this, void>(this);
}

// for ResponseWidget's

export interface IResponse {
  readonly widget: Widget;
  //setResponse(response: Api.ResponseModel.Type): void;
  setResponse(keys:Array<string>, rows:Array<Array<any>>): void;
}

export class Response {
  constructor() {
    this._widget = new ResponseWidget();
  }

  get widget(): Widget {
    return this._widget;
  }

  //setResponse(response: Api.ResponseModel.Type): void {
  //  this._widget.setResponse(response);
  //}
  setResponse(keys:Array<string>, rows:Array<Array<any>>): void {
    this._widget.setResponse(keys, rows);
  }

  private readonly _widget: ResponseWidget;
}

export class ResponseWidget extends SingletonPanel {
  dispose(): void {
    if (this._table) {
      this._table.dispose();
    }
    super.dispose();
  }

  // setResponse(response: Api.ResponseModel.Type): void {
  //   this._disposeTable();
  //   Api.ResponseModel.match(
  //     response,
  //     (keys, rows) => {
  //       const table = new ResultsTable(keys, rows);
  //       this._table = table;
  //       this.widget = table.widget;
  //     },
  //     () => {
  //       const message = 'Command executed successfully';
  //       this.widget = new PreWidget(message);
  //     },
  //     ({ message }) => {
  //       this.widget = new PreWidget(message);
  //     }
  //   );
  // }
    
  setResponse(keys:Array<string>, rows:Array<Array<any>>): void {
    this._disposeTable();
    const table = new ResultsTable(keys, rows);
    this._table = table;
    this.widget = table.widget;
  }

  private _disposeTable(): void {
    if (this._table) {
      this._table.dispose();
    }
    this._table = null;
  }

  private _table: ResultsTable | null = null;
}

class ToolbarText extends Widget {
    constructor(txt: string) {
        super();
        //this.addClass('p-Sql-Toolbar-text');
        this.node.innerText = txt
    }
}

export class QueryToolbar extends Toolbar {
    constructor(jp_services:IJpServices) {
        super();
        const {trans}=jp_services
        this.addItem(
          'run',
          new ToolbarButton({
            iconClass: 'jp-RunIcon jp-Icon jp-Icon-16',
            onClick: this._onRunButtonClicked,
            tooltip: trans.__('Run Query') })
        )
        this.addItem(
          'stop',
          new ToolbarButton({
            iconClass: 'jp-StopIcon jp-Icon jp-Icon-16',
            onClick: this._onStopButtonClicked,
            tooltip: trans.__('Stop Query')})
        )
        this.addItem(
          'DBID',
          new ToolbarText("DCP")
        )
    }
    
    get runButtonClicked() {
        return this._runButtonClicked
    }

    _onRunButtonClicked=()=>{
        console.log('run-event')
        this._runButtonClicked.emit(void 0)
    }
    _onStopButtonClicked=()=>{
        console.log('run-stop')
        this._runButtonClicked.emit(void 0)
    }
    private readonly _runButtonClicked: Signal<this, void> = new Signal(this);
}

export class Content extends BoxPanel {
    constructor(sql:string, jp_services:IJpServices) {
        super();

        this.editor = new Editor(sql, jp_services.editorService.factoryService );
        this.response = new Response()

        this.addWidget(this.editor.widget);
        this.addWidget(this.response.widget);
        BoxPanel.setStretch(this.editor.widget, 2);
        BoxPanel.setStretch(this.response.widget, 5);

        this.editor.execute.connect(this.run)
    }
    
    run=()=>{
       this.response.setResponse(['AA','BB'], [[1,2],[3,4]]) 
    }
    
    readonly editor: IEditor;
    readonly response : Response;
}

export const newQuery = (sql:string, jp_services:IJpServices) => {
    
    // Regenerate the widget if disposed
    // if (widget.isDisposed) {
    //   widget = newWidget();
    // }
    const toolbar = new QueryToolbar(jp_services)    
    const content = new Content(sql, jp_services)
    
    toolbar.runButtonClicked.connect(()=>content.run())
    
    const widget = new MainAreaWidget({ content, toolbar});
    widget.id = 'jp-sql-explorer:query';
    widget.title.icon = queryIcon;
    widget.title.label = 'SQL query';
    widget.title.closable = true;

    if (!widget.isAttached) {
      // Attach the widget to the main work area if it's not there
      jp_services.app.shell.add(widget, 'main');
    }
    // Activate the widget
    jp_services.app.shell.activateById(widget.id);
}