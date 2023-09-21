import {
  MainAreaWidget,
  ToolbarButton,
  setToolbar,
  WidgetTracker,
  InputDialog,
  IThemeManager
} from '@jupyterlab/apputils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
  TextModelFactory,
  Context
} from '@jupyterlab/docregistry';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { SplitPanel } from '@lumino/widgets';
import { toArray } from '@lumino/algorithm';

import { Signal } from '@lumino/signaling';

import { IJpServices } from '../JpServices';
import { sqlIcon as queryIcon, sqlScIcon } from '../icons';
import { QueryModel, IQueryModel } from '../model';
import { ITableData } from '../interfaces';

import { ResultsTable } from './ResultsTable';
import { Editor, IEditor } from './editor';
import { RunStatus } from './toolbar';

let sqlConsoleFactory: SqlConsoleWidgetFactory;
let toolbarFactory: any;

export const SQL_CONSOLE_FACTORY = 'sql-console';

export class SqlConsoleWidget extends SplitPanel {
  constructor(
    queryModel: IQueryModel,
    context: DocumentRegistry.CodeContext | undefined,
    model: CodeEditor.IModel,
    jp_services: IJpServices
  ) {
    super({ orientation: 'vertical' });
    this._jp_services = jp_services;
    this.title.icon = sqlScIcon;
    this._context = context;
    this.queryModel = queryModel;

    this.editor = new Editor(model, jp_services.editorService.factoryService);
    this.resultsTable = new ResultsTable([], []);

    this.addWidget(this.editor.widget);
    this.addWidget(this.resultsTable.widget);
    this.setRelativeSizes([2, 1]);

    this.editor.execute.connect(this.run, this);
    if (this._context) {
      this._context?.ready.then(() => {
        const dbid = this.get_conn_from_content();
        if (dbid !== '') {
          queryModel.dbid = dbid;
        }
      });
    }
  }

  get_conn_from_content = (): string => {
    const line0 = this.editor.value.split('\n')[0];
    const match = line0?.match(/^--\s*conn:\s*(.*?)\s*$/);
    if (match) {
      return match[1];
    }
    return '';
  };

  dispose(): void {
    Signal.clearData(this);
    this.editor.dispose();
    this.resultsTable.dispose();
    super.dispose();
  }

  setDbid = (dbid: string): void => {
    this.queryModel.dbid = dbid;
    this.editor.updateConn(dbid);
  };

  set theme(theme: string) {
    this.resultsTable.theme = theme;
  }

  save = async (): Promise<void> => {
    const { trans } = this._jp_services;

    if (this._context) {
      await this._context.save();
      return;
    }

    if (this._context2) {
      this._context2.model.value.text = this.editor.value;
      await this._context2.save();
      return;
    }

    const result = await InputDialog.getText({
      title: trans.__('Please input sql file name'),
      text: 'work/untitled.sql'
    });

    if (result.button.accept) {
      if (!result.value) {
        return;
      }
      const fp = result.value as string;
      const { docManager } = this._jp_services;
      const textModelFactory = new TextModelFactory();
      //const m=await docManager.newUntitled({type:'file', ext:'.sql'})
      const context = new Context({
        manager: docManager.services,
        factory: textModelFactory,
        path: fp
      });
      await context.initialize(true);
      context.model.value.text = this.editor.value;
      await context.save();

      this._context2 = context;
    }
  };

  stop = (): void => {
    if (this._is_running) {
      this.queryModel.stop();
    }
  };

  run = async (): Promise<void> => {
    if (this._is_running) {
      return;
    }
    const sql = this.editor.sql;
    if (sql.trim() === '') {
      return;
    }
    this._is_running = true;
    this.resultsTable.setData([], []);
    const rc = await this.queryModel.query(sql);
    this._is_running = false;
    if (rc.status === 'OK' && rc.data !== undefined) {
      const data = rc.data as ITableData;
      this.resultsTable.setData(data.columns, data.data);
    }
  };

  readonly editor: IEditor;
  readonly queryModel: IQueryModel;
  private readonly resultsTable: ResultsTable;
  private _is_running = false;
  private readonly _jp_services: IJpServices;
  private _context?: DocumentRegistry.CodeContext;
  private _context2?: DocumentRegistry.CodeContext;
}

/**
 * A widget factory for SqlConsoleWidget.
 */
export class SqlConsoleWidgetFactory extends ABCWidgetFactory<
  IDocumentWidget<SqlConsoleWidget>
> {
  /**
   * Construct a new editor widget factory.
   */
  constructor(
    options: DocumentRegistry.IWidgetFactoryOptions<
      IDocumentWidget<SqlConsoleWidget>
    >,
    jp_services: IJpServices
  ) {
    super(options);
    this._jp_services = jp_services;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.CodeContext
  ): IDocumentWidget<SqlConsoleWidget> {
    const qmodel = new QueryModel({});
    const content = new SqlConsoleWidget(
      qmodel,
      context,
      context.model,
      this._jp_services
    );
    const widget = new DocumentWidget({ content, context });
    return widget;
  }

  private _jp_services: IJpServices;
}

export function get_theme(themeManager: IThemeManager | null): string {
  const isLight =
    themeManager && themeManager.theme
      ? themeManager.isLight(themeManager.theme)
      : true;
  return isLight ? 'light' : 'dark';
}

export function setup_sql_console(
  jp_services: IJpServices,
  tracker: WidgetTracker<IDocumentWidget<SqlConsoleWidget>>
): void {
  const { trans, app } = jp_services;

  const sqlFileType: DocumentRegistry.IFileType = {
    name: 'sql',
    displayName: trans.__('Sql File'),
    extensions: ['.sql'],
    mimeTypes: ['text/sql'],
    contentType: 'text/plain',
    fileFormat: 'text',
    icon: sqlScIcon
  };

  toolbarFactory = (wdg: IDocumentWidget<SqlConsoleWidget>) => {
    const sqlConsole = wdg.content;
    return [
      {
        name: 'save',
        widget: new ToolbarButton({
          iconClass: 'jp-SaveIcon jp-Icon jp-Icon-16',
          onClick: () => sqlConsole.save(),
          tooltip: trans.__('save')
        })
      },
      {
        name: 'run',
        widget: new ToolbarButton({
          iconClass: 'jp-RunIcon jp-Icon jp-Icon-16',
          onClick: () => sqlConsole.run(),
          tooltip: trans.__('Run Query')
        })
      },
      {
        name: 'stop',
        widget: new ToolbarButton({
          iconClass: 'jp-StopIcon jp-Icon jp-Icon-16',
          onClick: () => sqlConsole.stop(),
          tooltip: trans.__('Stop Query')
        })
      },
      {
        name: 'status',
        widget: new RunStatus({
          model: sqlConsole.queryModel,
          trans: jp_services.trans,
          onChange: (dbid: string) => sqlConsole.setDbid(dbid)
        })
      }
    ];
  };

  sqlConsoleFactory = new SqlConsoleWidgetFactory(
    {
      name: SQL_CONSOLE_FACTORY,
      modelName: 'text',
      fileTypes: ['sql'],
      defaultFor: ['sql'],
      readOnly: true,
      toolbarFactory
    },
    jp_services
  );

  sqlConsoleFactory.widgetCreated.connect((sender, widget) => {
    const { themeManager } = jp_services;
    // Notify the widget tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      void tracker.save(widget);
    });
    void tracker.add(widget);
    widget.content.theme = get_theme(themeManager);
  });

  app.docRegistry.addFileType(sqlFileType);
  app.docRegistry.addWidgetFactory(sqlConsoleFactory);
}

export function newSqlConsole(
  qmodel: QueryModel,
  init_sql: string,
  jp_services: IJpServices
): void {
  // find Widget by id
  const { themeManager } = jp_services;
  const id = 'jp-sql-explorer:query' + qmodel.dbid;
  let widget = toArray(jp_services.app.shell.widgets()).find(
    widget => widget.id === id
  );
  if (widget && !widget.isDisposed) {
    const sql = `;\n\n${init_sql}\n`;
    ((widget as MainAreaWidget).content as SqlConsoleWidget).editor.appendText(
      sql
    );
  } else {
    const sql = `-- conn: ${qmodel.dbid}\n\n${init_sql}\n`;
    const model = new CodeEditor.Model({ value: sql });
    const content = new SqlConsoleWidget(qmodel, undefined, model, jp_services);
    content.theme = get_theme(themeManager);
    widget = new MainAreaWidget({ content });
    setToolbar(widget, toolbarFactory);
    widget.id = id;
    widget.title.icon = queryIcon;
    widget.title.label = qmodel.isConnReadOnly
      ? qmodel.dbid
      : jp_services.trans.__('SQL query');
    widget.title.closable = true;
  }

  if (!widget.isAttached) {
    // Attach the widget to the main work area if it's not there
    jp_services.app.shell.add(widget, 'main');
  }
  // Activate the widget
  jp_services.app.shell.activateById(widget.id);
}
