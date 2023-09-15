import * as React from 'react';
import { 
    MainAreaWidget,
    ToolbarButton,
    ReactWidget,
    setToolbar
} from '@jupyterlab/apputils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
} from '@jupyterlab/docregistry';

import { TranslationBundle } from '@jupyterlab/translation';
import { IDisposable } from '@lumino/disposable';
import { SplitPanel } from '@lumino/widgets';
import { Widget} from '@lumino/widgets';
import { toArray } from '@lumino/algorithm';
//import { Message } from '@lumino/messaging';
import {
  IEditorFactoryService,
  CodeEditor,
  CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@lumino/signaling';

import { IJpServices } from '../JpServices';
import { sqlIcon as queryIcon, errorIcon, sqlScIcon } from '../icons';
import { Loading } from '../components/loading'
import { QueryModel, IQueryModel, IQueryStatus} from '../model'
import { ITableData } from '../interfaces'

import { ResultsTable } from './ResultsTable'

export interface IEditor extends IDisposable {
  readonly widget: EditorWidget;

  readonly value: string;
  readonly sql: string;
  readonly appendText : (txt:string)=>void;
  readonly execute: ISignal<this, string>;
  readonly valueChanged: ISignal<this, string>;
}

export class Editor implements IEditor, IDisposable {
  constructor(
    model: CodeEditor.IModel,
    editorFactory: IEditorFactoryService
  ) {
    this._model=model
    this._widget = new EditorWidget(model, editorFactory);
    this._model.value.changed.connect(() => {
      this._valueChanged.emit(this.value);
    }, this);
    this._model.mimeType = 'text/x-sql';
    this._widget.executeCurrent.connect(() => {
      this._execute.emit(this.value);
    }, this);
  }
  
  get isDisposed(): boolean {
      return this._widget.isDisposed
  }
    
  dispose() {
      Signal.clearData(this)
      this._widget.dispose()
  }
    
  appendText(txt:string) {
      const editor=this.widget.editor;
      if (editor.replaceSelection) editor.replaceSelection(txt)
  }
  
  get value(): string {
     return this._model.value.text;
  }
    
  get sql(): string {
     // Get the current SQL statement separated by semicolons 
     // or the selected text as sql 
     const editor=this.widget.editor;
     const selection = editor.getSelection();
     const start: number = editor.getOffsetAt(selection.start);
     const end: number = editor.getOffsetAt(selection.end);
     let text=this._model.value.text;
     if (start!=end) {
         if (start>end) text = text.slice(end, start);
         else text = text.slice(start, end);
     }
     return this.findSegment(text, start)
  }

  private findSegment(text:string, pos:number): string {
     // segment by ;, and return whitch around pos
     const segments = text.split(';');
     let segmentIndex = -1;

     for (let i = 0; i < segments.length; i++) {
        if (pos <= segments[i].length) {
          segmentIndex = i;
          break;
        }

        pos -= segments[i].length + 1; 
     }

     if (segmentIndex === -1) {
        segmentIndex = segments.length - 1;
     }
      
     if (segments[segmentIndex].trim() === "" && 
         segmentIndex==segments.length-1 && 
         segmentIndex>0) {
         segmentIndex--
     }
     return segments[segmentIndex];
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
    this.editor.addKeydownHandler(this._onKeydown);
    this.addClass('jp-sql-explorer-ed');
  }
    
  dispose=()=>{
     this.editor.addKeydownHandler(this._onKeydown);
     //this.editor.removeKeydownHandler(this._onKeydown)
     super.dispose() 
  }

  get executeCurrent(): ISignal<this, void> {
    return this._executeCurrent;
  }

  _onKeydown=(_:CodeEditor.IEditor, event: KeyboardEvent): boolean=>{
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

class ToolbarText extends Widget {
    constructor(txt: string, className?: string) {
        super();
        this.addClass('jp-Sql-Exp-toolbar-text');
        if (className) this.addClass(className)                      
        this.node.innerText = txt
    }
}

interface IRunStatusProps {
    model: IQueryModel,
    trans: TranslationBundle
}

interface IRunStatusState {
    running : 0|1|2,
    time    : number,
    errmsg  : string
}

class RunStatusComponent extends React.Component<IRunStatusProps, IRunStatusState> {
  
  constructor(props:IRunStatusProps) {
    super(props);
    this.state = {
        running : 0,
        time    : 0,
        errmsg  : ''
    };
  }
    
  componentDidMount=():void=> {
      const {model}=this.props;
      model.query_begin.connect(this._start_query, this)
      model.query_finish.connect(this._finish_query, this)
  }

  componentWillUnmount=():void => {
    //Clear all signal connections
    Signal.clearData(this);
    if (this._timer_id) clearInterval(this._timer_id)
  }
    
  /**
   * Renders the component.
   *
   * @returns React element
   */
  render(): React.ReactElement {
      const {running, time, errmsg}=this.state
      const {trans}=this.props;
      return <>
          { running==1 && <Loading/> }
          { running==2 && <>
              <errorIcon.react tag="span" width="14px" height="14px" className='jp-Sql-Exp-toolbar-icon'/>
              <span className='jp-Sql-Exp-toolbar-errmsg'>{errmsg}</span>
            </>}
          { time!=0 && <span className='jp-Sql-Exp-toolbar-timer'>  {trans.__('elapsed time')}：{this.convertMilliseconds(time)}</span>}
      </>
  }
    
  private convertMilliseconds(milliseconds:number):string {
    const {trans}=this.props;
    let seconds = milliseconds / 1000;
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds %= 60;

    let timeString = "";

    if (hours > 0) {
        timeString += hours + ' ' + trans.__("hour");
    }

    if (minutes > 0) {
        timeString += minutes + ' ' + trans.__("min");
    }

    if (seconds < 10) {
       timeString += seconds.toFixed(1) + ' '+trans.__("sec");
    } else {
       timeString += Math.round(seconds) + ' ' + trans.__("sec");
    }
    
    return timeString;
  }

  private _start_query=()=>{
     this._timer_id=setInterval(this._timer_fast, 107)
     this.setState({running:1, time:0}) 
  }
    
  private _finish_query=(_:IQueryModel, e:IQueryStatus)=>{
     if (this._timer_id) clearInterval(this._timer_id)
     this._timer_id=null 
     if (e.status=='OK') {
        this.setState({running:0})
     }else{
        this.setState({running:2, errmsg:e.errmsg||''})
     }
  }
    
  private _timer_fast=()=>{
     let {time}=this.state
     if (time>10000) {
        if (this._timer_id) clearInterval(this._timer_id)
        this._timer_id=setInterval(this._timer_slow, 1000)
     }
     time += 107;
     this.setState({time})
  }
    
  private _timer_slow=()=>{
     let {time}=this.state
     time += 1000;
     this.setState({time})
  }
    
  private _timer_id!: number | null
}

class RunStatus extends ReactWidget {

    constructor(queryModel:IQueryModel, trans:TranslationBundle) {
        super()
        this._queryModel=queryModel
        this._trans = trans
    }

    render(): JSX.Element {
        return <RunStatusComponent model={this._queryModel} trans={this._trans}/>
    }

    private readonly _queryModel : IQueryModel;
    private readonly _trans : TranslationBundle;
}

export class SqlConsoleWidget extends SplitPanel {
    constructor(
        queryModel: IQueryModel, 
        context: DocumentRegistry.CodeContext | undefined,
        model: CodeEditor.IModel,
        jp_services:IJpServices
    ) {
        super({orientation: 'vertical'})
        this.title.icon = sqlScIcon;
        this.queryModel=queryModel
            
        this.editor  = new Editor(model, jp_services.editorService.factoryService );
        this.resultsTable = new ResultsTable([], [])
        
        this.addWidget(this.editor.widget);
        this.addWidget(this.resultsTable.widget);
        this.setRelativeSizes([2, 1]);
        
        this.editor.execute.connect(this.run, this)
    }
    
    dispose(): void {
        Signal.clearData(this)
        this.editor.dispose()
        //this.toolbar.dispose()
        this.resultsTable.dispose()
        super.dispose()
    }
    
    stop=()=>{
        if (this._is_running) this.queryModel.stop()
    }
    
    run = async()=>{
       if (this._is_running) return
       const sql=this.editor.sql
       if (sql.trim() === "") return
       this._is_running=true
       this.resultsTable.setData([],[])
       const rc=await this.queryModel.query(sql)
       this._is_running=false 
       if (rc.status=='OK' && rc.data!=undefined) {
           const data=rc.data as ITableData
           this.resultsTable.setData(data.columns, data.data)
       }
    }
    
    readonly editor: IEditor;
    private resultsTable : ResultsTable;
    readonly queryModel: IQueryModel;
    private _is_running:boolean = false
}

/**
 * A widget factory for SqlConsoleWidget.
 */
export class SqlConsoleWidgetFactory extends ABCWidgetFactory<
  IDocumentWidget<SqlConsoleWidget>
>{
  /**
   * Construct a new editor widget factory.
   */
  constructor(
     options: DocumentRegistry.IWidgetFactoryOptions<IDocumentWidget<SqlConsoleWidget>>,
     jp_services:IJpServices 
  )
  {
    super(options);
    this._jp_services = jp_services
  }
    
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.CodeContext
  ): IDocumentWidget<SqlConsoleWidget> {
    const qmodel=new QueryModel('mysql', '')        
    const content = new SqlConsoleWidget(qmodel, context, context.model, this._jp_services);
    const widget = new DocumentWidget({ content, context });
    return widget;
  }
    
  private _jp_services:IJpServices;
}

var sqlConsoleFactory:SqlConsoleWidgetFactory
var toolbarFactory:any

export function setup_sql_console(jp_services:IJpServices) {
    
    const {trans, app} = jp_services

    const sqlFileType: DocumentRegistry.IFileType = {
        name: 'sql',
        displayName: trans.__('Sql File'),
        extensions: ['.sql'],
        mimeTypes: ['text/sql'],
        contentType: 'text/plain',
        fileFormat: 'text',
        icon: sqlScIcon
    };
        
    toolbarFactory =(wdg:IDocumentWidget<SqlConsoleWidget>)=>{
        const sqlConsole = wdg.content
        return [
          { 
              name : 'dbid',
              widget : new ToolbarText(sqlConsole.queryModel.dbid)
          },
          {
              name : 'run',
              widget: new ToolbarButton({
                iconClass: 'jp-RunIcon jp-Icon jp-Icon-16',
                onClick: ()=>sqlConsole.run(),   
                tooltip: trans.__('Run Query')})
          },
          { 
              name : 'stop',
              widget : new ToolbarButton({
                 iconClass: 'jp-StopIcon jp-Icon jp-Icon-16',
                 onClick: ()=>sqlConsole.stop(), 
                 tooltip: trans.__('Stop Query')})
          },
          {
              name : 'status',
              widget : new RunStatus(sqlConsole.queryModel, jp_services.trans)
          }  
        ]
    }
        
    sqlConsoleFactory = new SqlConsoleWidgetFactory(
        {
            name:  trans.__('SQL Console'),
            modelName: 'text',
            fileTypes: ['sql'],
            defaultFor: ['sql'],
            readOnly: true, 
            toolbarFactory
        },
        jp_services
    );  
        
    app.docRegistry.addFileType(sqlFileType);
    app.docRegistry.addWidgetFactory(sqlConsoleFactory);
}

export function newSqlConsole(qmodel:QueryModel, init_sql:string, jp_services:IJpServices) {
    // find Widget by id
    let id = 'jp-sql-explorer:query' + qmodel.dbid;
    let widget = toArray(jp_services.app.shell.widgets()).find(widget => widget.id === id);
    if (widget && !widget.isDisposed) {
       console.log("find and not disposed ", id);
       ((widget as MainAreaWidget).content as SqlConsoleWidget).editor.appendText('\n'+init_sql+'\n')
    } else {
       const model = new CodeEditor.Model({value:init_sql}); 
       const content = new SqlConsoleWidget(qmodel, undefined, model, jp_services) 
       widget = new MainAreaWidget({ content});
       setToolbar(widget, toolbarFactory)
       widget.id = id
       widget.title.icon = queryIcon;
       widget.title.label = jp_services.trans.__('SQL query');
       widget.title.closable = true;
    }

    if (!widget.isAttached) {
      // Attach the widget to the main work area if it's not there
      jp_services.app.shell.add(widget, 'main');
    }
    // Activate the widget
    jp_services.app.shell.activateById(widget.id);
}

// export const newQuery = (queryModel: IQueryModel, sql:string, jp_services:IJpServices) => {
//     // find Widget by id
//     let id = 'jp-sql-explorer:query' + queryModel.dbid;
//     let widget = toArray(jp_services.app.shell.widgets()).find(widget => widget.id === id);
//     if (widget && !widget.isDisposed) {
//        console.log("find and not disposed ", id);
//        ((widget as MainAreaWidget).content as Content).editor.appendText('\n'+sql+'\n')
//     } else {
//        console.log("not find ", id);
//        const content = new Content(queryModel, sql, jp_services)
//        widget = new MainAreaWidget({ content, toolbar:content.toolbar});
//        widget.id = id
//        widget.title.icon = queryIcon;
//        widget.title.label = jp_services.trans.__('SQL query');
//        widget.title.closable = true;
//     }

//     if (!widget.isAttached) {
//       // Attach the widget to the main work area if it's not there
//       jp_services.app.shell.add(widget, 'main');
//     }
//     // Activate the widget
//     jp_services.app.shell.activateById(widget.id);
// }