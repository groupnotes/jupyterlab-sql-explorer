import * as React from 'react';
import { 
    MainAreaWidget,
    Toolbar,
    ToolbarButton,
    ReactWidget
} from '@jupyterlab/apputils';
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
//import { LabIcon } from '@jupyterlab/ui-components';

import { IJpServices } from './JpServices';
import { sqlIcon as queryIcon, errorIcon } from './icons';

//import { SingletonPanel } from './components/SingletonPanel'
import { ResultsTable } from './components/ResultsTable'
import { Loading } from './components/loading'
import { IQueryModel, IQueryStatus} from './model'
import { ITableData } from './interfaces'

export interface IEditor extends IDisposable {
  readonly widget: EditorWidget;

  readonly value: string;
  readonly sql: string;
  readonly appendText : (txt:string)=>void;
  readonly execute: ISignal<this, string>;
  readonly valueChanged: ISignal<this, string>;
}

export class Editor implements IEditor, IDisposable {
  constructor(initialValue: string, editorFactory: IEditorFactoryService) {
    this._model = new CodeEditor.Model({ value: initialValue });
    this._widget = new EditorWidget(this._model, editorFactory);
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
      this._model.dispose()
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

    if (hours === 0 && minutes === 0) {
        if (seconds < 10) {
          timeString += seconds.toFixed(1) + ' '+trans.__("sec");
        } else {
          timeString += Math.round(seconds) + ' ' + trans.__("sec");
        }
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


export class QueryToolbar extends Toolbar {
    constructor(queryModel:IQueryModel, jp_services:IJpServices) {
        super();
        this._queryModel=queryModel
        const {trans}=jp_services
        
        this.addItem(
          'dbid',
          new ToolbarText(this._queryModel.dbid)
        )
        
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
            
        /*this.addItem(
          'schema',
          new ToolbarText(trans.__("default schema:") + this._queryModel.table)
        ),*/
        
        this.addItem(
          'status',
          new RunStatus(queryModel, trans)
        )
    }
    
    get runButtonClicked() {
        return this._runButtonClicked
    }
    
    get stopButtonClicked() {
        return this._stopButtonClicked
    }

    _onRunButtonClicked=()=>{
        this._runButtonClicked.emit(void 0)
    }
    
    _onStopButtonClicked=()=>{
        this._stopButtonClicked.emit(void 0)
    }
    
    private readonly _queryModel : IQueryModel;
    private readonly _runButtonClicked: Signal<this, void> = new Signal(this);
    private readonly _stopButtonClicked: Signal<this, void> = new Signal(this);
}

export class Content extends SplitPanel {
    constructor(
        queryModel: IQueryModel, 
        init_sql:string, 
        jp_services:IJpServices
    ) {
        super({orientation: 'vertical'})
        this.queryModel=queryModel
        this.toolbar = new QueryToolbar(queryModel, jp_services)    
        this.editor  = new Editor(init_sql, jp_services.editorService.factoryService );
        this.resultsTable = new ResultsTable([], [])

        this.addWidget(this.editor.widget);
        this.addWidget(this.resultsTable.widget);
        this.setRelativeSizes([2, 1]);
        
        this.editor.execute.connect(this.run, this)
        this.toolbar.runButtonClicked.connect(this.run, this)
        this.toolbar.stopButtonClicked.connect(this.stop, this)
    }
    
    dispose(): void {
        Signal.clearData(this)
        this.editor.dispose()
        this.toolbar.dispose()
        this.resultsTable.dispose()
        super.dispose()
    }
    
    stop=()=>{
        if (this._is_running) this.queryModel.stop()
    }
    
    run = async()=>{
       if (this._is_running) return
       const sql=this.editor.sql
       if (sql=='') return
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
    readonly toolbar: QueryToolbar;
    readonly queryModel: IQueryModel;
    private _is_running:boolean = false
}

export const newQuery = (queryModel: IQueryModel, sql:string, jp_services:IJpServices) => {
    // find Widget by id
    let id = 'jp-sql-explorer:query' + queryModel.dbid;
    let widget = toArray(jp_services.app.shell.widgets()).find(widget => widget.id === id);
    if (widget && !widget.isDisposed) {
       console.log("find and not disposed ", id);
       ((widget as MainAreaWidget).content as Content).editor.appendText('\n'+sql+'\n')
    } else {
       console.log("not find ", id);
       const content = new Content(queryModel, sql, jp_services)
       widget = new MainAreaWidget({ content, toolbar:content.toolbar});
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